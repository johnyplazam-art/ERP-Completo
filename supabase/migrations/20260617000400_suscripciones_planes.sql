-- ============================================================
-- MIGRACIÓN: Sistema de Suscripciones y Planes
-- Fecha: 2026-06-17
-- Descripción:
--   Agrega planes de suscripción con periodos (diario/mensual/anual)
--   y suscripciones por empresa con auto-expiracion.
--
--   Dependencias: empresas, applications
-- ============================================================

-- ============================================================
-- 1. PLANES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.planes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  periodo TEXT NOT NULL CHECK (periodo IN ('diario', 'mensual', 'anual')),
  -- features: {"apps": ["panaderia", "contabilidad"], "max_usuarios": 5, "max_empresas": 1}
  features JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. SUSCRIPCIONES (empresa → plan)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suscripciones (
  id SERIAL PRIMARY KEY,
  empresa_id INT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id INT NOT NULL REFERENCES public.planes(id),
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin TIMESTAMPTZ,              -- NULL = indefinido / prueba sin vencimiento
  estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'expirada', 'cancelada', 'pendiente')),
  pago_referencia TEXT,               -- ID externo (Mercado Pago, etc.)
  renovacion_automatica BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa ON public.suscripciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON public.suscripciones(estado);
CREATE INDEX IF NOT EXISTS idx_suscripciones_fecha_fin ON public.suscripciones(fecha_fin);

-- ============================================================
-- 3. HISTORIAL DE SUSCRIPCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.historial_suscripciones (
  id SERIAL PRIMARY KEY,
  suscripcion_id INT NOT NULL REFERENCES public.suscripciones(id) ON DELETE CASCADE,
  evento TEXT NOT NULL CHECK (evento IN (
    'creacion', 'renovacion', 'cancelacion', 'expiracion',
    'cambio_plan', 'pago', 'pago_fallido'
  )),
  detalle JSONB,                      -- Informativo: motivo, valores anteriores, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_suscripcion ON public.historial_suscripciones(suscripcion_id);

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_suscripciones ENABLE ROW LEVEL SECURITY;

-- Planes: lectura universal, escritura solo admin
CREATE POLICY "planes_select" ON public.planes FOR SELECT TO authenticated USING (true);

CREATE POLICY "planes_insert" ON public.planes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.slug = 'admin'
  ));

CREATE POLICY "planes_update" ON public.planes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.slug = 'admin'
  ));

CREATE POLICY "planes_delete" ON public.planes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.slug = 'admin'
  ));

-- Suscripciones: lectura si pertenece a la empresa, escritura solo admin
CREATE POLICY "suscripciones_select" ON public.suscripciones FOR SELECT TO authenticated
  USING (public.usuario_en_empresa(empresa_id, NULL));

CREATE POLICY "suscripciones_insert" ON public.suscripciones FOR INSERT TO authenticated
  WITH CHECK (
    public.usuario_en_empresa(empresa_id, NULL)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.empresa_id = suscripciones.empresa_id
        AND r.slug = 'admin'
    )
  );

CREATE POLICY "suscripciones_update" ON public.suscripciones FOR UPDATE TO authenticated
  USING (public.usuario_en_empresa(empresa_id, NULL))
  WITH CHECK (
    public.usuario_en_empresa(empresa_id, NULL)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.empresa_id = suscripciones.empresa_id
        AND r.slug = 'admin'
    )
  );

-- Historial: lectura si pertenece a la empresa, INSERT desde trigger
CREATE POLICY "historial_select" ON public.historial_suscripciones FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suscripciones s
    WHERE s.id = historial_suscripciones.suscripcion_id
      AND public.usuario_en_empresa(s.empresa_id, NULL)
  ));

-- INSERT via trigger/function SECURITY DEFINER (no RLS directa)
CREATE POLICY "historial_insert" ON public.historial_suscripciones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.suscripciones s
    WHERE s.id = historial_suscripciones.suscripcion_id
      AND public.usuario_en_empresa(s.empresa_id, NULL)
  ));

-- ============================================================
-- 5. FUNCIÓN: expirar suscripciones vencidas
-- ============================================================
-- Corre tantas veces como se necesite (pg_cron, Supabase Edge Functions,
-- o llamada manual desde admin).
CREATE OR REPLACE FUNCTION public.expiar_suscripciones()
RETURNS TABLE(
  suscripcion_id INT,
  empresa_nombre TEXT,
  evento TEXT
) AS $$
DECLARE
  v_sus RECORD;
BEGIN
  FOR v_sus IN
    SELECT s.id, e.nombre AS emp_nombre, s.empresa_id
    FROM public.suscripciones s
    JOIN public.empresas e ON e.id = s.empresa_id
    WHERE s.estado = 'activa'
      AND s.fecha_fin IS NOT NULL
      AND s.fecha_fin < now()
  LOOP
    -- 1. Marcar suscripción como expirada
    UPDATE public.suscripciones
    SET estado = 'expirada', updated_at = now()
    WHERE id = v_sus.id;

    -- 2. Registrar en historial
    INSERT INTO public.historial_suscripciones (suscripcion_id, evento, detalle)
    VALUES (v_sus.id, 'expiracion', jsonb_build_object(
      'fecha', now(),
      'motivo', 'Fecha de fin alcanzada'
    ));

    -- 3. Desactivar miembros de la empresa (opcional: mantener al dueño activo)
    UPDATE public.empresa_usuarios
    SET activo = false
    WHERE empresa_id = v_sus.empresa_id
      AND activo = true;

    -- 4. Desactivar la empresa
    UPDATE public.empresas
    SET activa = false
    WHERE id = v_sus.empresa_id
      AND activa = true;

    suscripcion_id := v_sus.id;
    empresa_nombre := v_sus.emp_nombre;
    evento := 'expirada';
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FUNCIÓN: verificar si una empresa tiene suscripción activa
-- ============================================================
CREATE OR REPLACE FUNCTION public.empresa_tiene_suscripcion_activa(p_empresa_id INT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.suscripciones
    WHERE empresa_id = p_empresa_id
      AND estado = 'activa'
      AND (fecha_fin IS NULL OR fecha_fin > now())
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 7. FUNCIÓN: obtener apps disponibles según suscripción
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_apps_por_suscripcion(p_empresa_id INT)
RETURNS TABLE(
  id INT,
  slug TEXT,
  name TEXT,
  description TEXT,
  is_active BOOLEAN,
  icon VARCHAR(50),
  orden INT
) AS $$
DECLARE
  v_features JSONB;
BEGIN
  -- Obtener features del plan activo
  SELECT p.features INTO v_features
  FROM public.suscripciones s
  JOIN public.planes p ON p.id = s.plan_id
  WHERE s.empresa_id = p_empresa_id
    AND s.estado = 'activa'
    AND (s.fecha_fin IS NULL OR s.fecha_fin > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Si no hay suscripción activa, retornar vacío
  IF v_features IS NULL THEN
    RETURN;
  END IF;

  -- Retornar apps incluidas en el plan
  RETURN QUERY
  SELECT a.id, a.slug, a.name, a.description, a.is_active, a.icon, a.orden
  FROM public.applications a
  WHERE a.is_active = true
    AND a.slug = ANY (ARRAY(SELECT jsonb_array_elements_text(v_features->'apps')));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 8. TRIGGER: registrar historial al crear/actualizar suscripción
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_suscripcion_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historial_suscripciones (suscripcion_id, evento, detalle)
    VALUES (
      NEW.id,
      'creacion',
      jsonb_build_object(
        'plan_id', NEW.plan_id,
        'fecha_inicio', NEW.fecha_inicio,
        'fecha_fin', NEW.fecha_fin,
        'renovacion_automatica', NEW.renovacion_automatica
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
      INSERT INTO public.historial_suscripciones (suscripcion_id, evento, detalle)
      VALUES (NEW.id, 'cancelacion', jsonb_build_object(
        'motivo', 'Cancelación manual',
        'estado_anterior', OLD.estado
      ));
    ELSIF NEW.plan_id != OLD.plan_id THEN
      INSERT INTO public.historial_suscripciones (suscripcion_id, evento, detalle)
      VALUES (NEW.id, 'cambio_plan', jsonb_build_object(
        'plan_anterior', OLD.plan_id,
        'plan_nuevo', NEW.plan_id
      ));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_suscripcion_change
  AFTER INSERT OR UPDATE ON public.suscripciones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_suscripcion_change();

-- ============================================================
-- 9. PERMISOS (para administración de suscripciones)
-- ============================================================
INSERT INTO public.permissions (action_name, description, category) VALUES
  ('suscripciones.view', 'Ver suscripciones y planes', 'admin'),
  ('suscripciones.manage', 'Gestionar suscripciones y planes', 'admin')
ON CONFLICT (action_name) DO NOTHING;

-- Asignar a admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'admin'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND p.action_name IN ('suscripciones.view', 'suscripciones.manage')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ============================================================
-- 10. SEED DATA: planes base
-- ============================================================
INSERT INTO public.planes (nombre, slug, descripcion, precio, periodo, features) VALUES
  (
    'Gratuito',
    'gratuito',
    'Plan básico gratuito para probar el sistema. Incluye 1 usuario y acceso solo a panadería.',
    0,
    'mensual',
    '{"apps": ["panaderia"], "max_usuarios": 1, "max_empresas": 1}'
  ),
  (
    'Básico',
    'basico',
    'Para pequeñas panaderías. Hasta 3 usuarios con acceso completo a producción.',
    15000,
    'mensual',
    '{"apps": ["panaderia"], "max_usuarios": 3, "max_empresas": 1}'
  ),
  (
    'Profesional',
    'profesional',
    'Para panaderías en crecimiento. Hasta 10 usuarios y todos los módulos disponibles.',
    35000,
    'mensual',
    '{"apps": ["panaderia", "contabilidad"], "max_usuarios": 10, "max_empresas": 3}'
  ),
  (
    'Enterprise',
    'enterprise',
    'Para cadenas y grandes volúmenes. Usuarios ilimitados y soporte prioritario.',
    75000,
    'mensual',
    '{"apps": ["panaderia", "contabilidad"], "max_usuarios": null, "max_empresas": null}'
  ),
  (
    'Prueba Diaria',
    'prueba-diaria',
    'Plan de prueba por 1 día para evaluar el sistema completo.',
    0,
    'diario',
    '{"apps": ["panaderia", "contabilidad"], "max_usuarios": 3, "max_empresas": 1}'
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 11. SUSCRIPCIÓN POR DEFECTO PARA EMPRESAS EXISTENTES
-- ============================================================
-- Asigna plan gratuito a todas las empresas sin suscripción
INSERT INTO public.suscripciones (empresa_id, plan_id, estado, renovacion_automatica)
SELECT e.id, p.id, 'activa', false
FROM public.empresas e
CROSS JOIN (SELECT id FROM public.planes WHERE slug = 'gratuito') p
WHERE NOT EXISTS (
  SELECT 1 FROM public.suscripciones s WHERE s.empresa_id = e.id
);

-- ============================================================
-- 12. VERIFICACIÓN
-- ============================================================
SELECT '✅ Suscripciones y planes migration complete' AS resultado;
