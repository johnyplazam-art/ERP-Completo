-- ============================================================
-- MIGRACIÓN: Multi-Industria — Schema, Roles y Permisos
-- Fecha: 2026-06-18
-- Descripción:
--   - Crea tabla industrias y industria_apps
--   - Agrega industria_principal y config a empresas
--   - Crea apps: core, restaurant, pos, medico, academico
--   - Crea roles de plataforma (core) y roles por industria
--   - Asigna permisos básicos
--   - Migra empresas existentes a panadería
--
-- Dependencias: empresas, applications (existentes)
-- ============================================================

-- ============================================================
-- PARTE A: TABLAS industrias + industria_apps
-- ============================================================

CREATE TABLE IF NOT EXISTS public.industrias (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icon VARCHAR(50) DEFAULT 'pi pi-building',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.industria_apps (
  industria_id INT NOT NULL REFERENCES public.industrias(id) ON DELETE CASCADE,
  application_id INT NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  es_por_defecto BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (industria_id, application_id)
);

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS industria_principal INT REFERENCES public.industrias(id),
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- ============================================================
-- RLS: industrias + industria_apps
-- ============================================================

ALTER TABLE public.industrias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industria_apps ENABLE ROW LEVEL SECURITY;

-- industrias: SELECT universal, escritura solo super_admin
CREATE POLICY "industrias_select" ON public.industrias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "industrias_insert" ON public.industrias
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.applications a ON a.id = ur.application_id
      WHERE ur.user_id = auth.uid()
        AND a.slug = 'core'
        AND r.slug = 'super_admin'
    )
  );

CREATE POLICY "industrias_update" ON public.industrias
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.applications a ON a.id = ur.application_id
      WHERE ur.user_id = auth.uid()
        AND a.slug = 'core'
        AND r.slug = 'super_admin'
    )
  );

CREATE POLICY "industrias_delete" ON public.industrias
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.applications a ON a.id = ur.application_id
      WHERE ur.user_id = auth.uid()
        AND a.slug = 'core'
        AND r.slug = 'super_admin'
    )
  );

-- industria_apps: SELECT universal, escritura solo super_admin
CREATE POLICY "industria_apps_select" ON public.industria_apps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "industria_apps_insert" ON public.industria_apps
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.applications a ON a.id = ur.application_id
      WHERE ur.user_id = auth.uid()
        AND a.slug = 'core'
        AND r.slug = 'super_admin'
    )
  );

CREATE POLICY "industria_apps_update" ON public.industria_apps
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.applications a ON a.id = ur.application_id
      WHERE ur.user_id = auth.uid()
        AND a.slug = 'core'
        AND r.slug = 'super_admin'
    )
  );

CREATE POLICY "industria_apps_delete" ON public.industria_apps
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.applications a ON a.id = ur.application_id
      WHERE ur.user_id = auth.uid()
        AND a.slug = 'core'
        AND r.slug = 'super_admin'
    )
  );

-- ============================================================
-- PARTE B: SEED industrias
-- ============================================================

INSERT INTO public.industrias (slug, nombre, descripcion, icon) VALUES
  ('panaderia', 'Panadería', 'Panadería y pastelería artesanal e industrial', 'pi pi-shop'),
  ('restaurant', 'Restaurante', 'Restaurantes, bares y afines', 'pi pi-building'),
  ('pos', 'Punto de Venta', 'Tiendas y comercios minoristas', 'pi pi-shopping-cart'),
  ('medico', 'Centro Médico', 'Consultorios, clínicas y centros de salud', 'pi pi-heart'),
  ('academico', 'Institución Académica', 'Colegios, institutos y centros de formación', 'pi pi-book'),
  ('administracion', 'Administración', 'Gestión administrativa y contable', 'pi pi-calculator')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PARTE C: CREAR APLICACIONES NUEVAS
-- ============================================================

-- App core (roles plataforma)
INSERT INTO public.applications (name, slug, description, is_active)
SELECT 'Core', 'core', 'Roles y funciones de plataforma', true
WHERE NOT EXISTS (SELECT 1 FROM public.applications WHERE slug = 'core');

-- Apps por industria
INSERT INTO public.applications (name, slug, description, is_active)
SELECT name, slug, description, is_active FROM (VALUES
  ('Administración', 'admin', 'Módulo de gestión administrativa y contable', true),
  ('Restaurante', 'restaurant', 'Módulo de gestión de restaurantes', true),
  ('Punto de Venta', 'pos', 'Módulo de punto de venta', true),
  ('Médico', 'medico', 'Módulo de gestión médica', true),
  ('Académico', 'academico', 'Módulo de gestión académica', true)
) AS v(name, slug, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.slug = v.slug);

-- ============================================================
-- PARTE D: SEED industria_apps
-- ============================================================

INSERT INTO public.industria_apps (industria_id, application_id, es_por_defecto)
SELECT i.id, a.id, true
FROM public.industrias i
JOIN public.applications a ON (
  (i.slug = 'panaderia' AND a.slug IN ('panaderia', 'admin'))
  OR (i.slug = 'restaurant' AND a.slug IN ('restaurant', 'admin'))
  OR (i.slug = 'pos' AND a.slug IN ('pos', 'admin'))
  OR (i.slug = 'medico' AND a.slug IN ('medico', 'admin'))
  OR (i.slug = 'academico' AND a.slug IN ('academico', 'admin'))
  OR (i.slug = 'administracion' AND a.slug IN ('admin'))
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PARTE E: MIGRAR EMPRESAS EXISTENTES
-- ============================================================

UPDATE public.empresas
SET industria_principal = (SELECT id FROM public.industrias WHERE slug = 'panaderia')
WHERE industria_principal IS NULL;

-- ============================================================
-- PARTE F: ROLES PLATAFORMA (app core)
-- ============================================================

DO $$
DECLARE
  v_core_id INT;
  v_super_admin_id INT;
  v_admin_id INT;
BEGIN
  SELECT id INTO v_core_id FROM public.applications WHERE slug = 'core';

  -- Crear roles
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Super Admin', 'super_admin', 'Acceso total a toda la plataforma', v_core_id, true),
    ('Admin', 'admin', 'Administración de la empresa', v_core_id, true),
    ('Auditor', 'auditor', 'Solo lectura de logs y reportes', v_core_id, true),
    ('Supervisor', 'supervisor', 'Métricas y reportes cross-app', v_core_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;

  -- Crear permisos core
  INSERT INTO public.permissions (action_name, description, category) VALUES
    ('core.empresas.view', 'Ver datos de la empresa', 'core'),
    ('core.empresas.manage', 'Gestionar empresa', 'core'),
    ('core.usuarios.view', 'Ver usuarios', 'core'),
    ('core.usuarios.manage', 'Gestionar usuarios y roles', 'core'),
    ('core.usuarios.invite', 'Invitar usuarios', 'core'),
    ('core.suscripciones.view', 'Ver suscripciones', 'core'),
    ('core.suscripciones.manage', 'Gestionar suscripciones', 'core'),
    ('core.audit.view', 'Ver auditoría', 'core'),
    ('core.industrias.view', 'Ver industrias', 'core'),
    ('core.industrias.manage', 'Gestionar industrias', 'core'),
    ('core.apps.manage', 'Gestionar aplicaciones', 'core')
  ON CONFLICT (action_name) DO NOTHING;

  -- Obtener IDs de roles
  SELECT id INTO v_super_admin_id FROM public.roles WHERE slug = 'super_admin' AND application_id = v_core_id;
  SELECT id INTO v_admin_id FROM public.roles WHERE slug = 'admin' AND application_id = v_core_id;

  -- Asignar todos los permisos core a super_admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_super_admin_id, p.id
  FROM public.permissions p
  WHERE p.action_name LIKE 'core.%'
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_super_admin_id AND rp.permission_id = p.id
    );

  -- Asignar permisos seleccionados a admin (no incluye industrias.manage ni apps.manage)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_id, p.id
  FROM public.permissions p
  WHERE p.action_name IN (
    'core.empresas.view', 'core.empresas.manage',
    'core.usuarios.view', 'core.usuarios.manage', 'core.usuarios.invite',
    'core.suscripciones.view',
    'core.audit.view',
    'core.industrias.view'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_admin_id AND rp.permission_id = p.id
  );
END $$;

-- ============================================================
-- PARTE G: ROLES POR INDUSTRIA
-- ============================================================

DO $$
DECLARE
  v_rest_id INT;
  v_pos_id INT;
  v_med_id INT;
  v_acad_id INT;
  v_admin_app_id INT;
BEGIN
  SELECT id INTO v_rest_id FROM public.applications WHERE slug = 'restaurant';
  SELECT id INTO v_pos_id FROM public.applications WHERE slug = 'pos';
  SELECT id INTO v_med_id FROM public.applications WHERE slug = 'medico';
  SELECT id INTO v_acad_id FROM public.applications WHERE slug = 'academico';
  SELECT id INTO v_admin_app_id FROM public.applications WHERE slug = 'admin';

  -- Restaurant
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Admin Local', 'admin_local', 'Gestión del restaurante', v_rest_id, true),
    ('Chef', 'chef', 'Gestión de menú y cocina', v_rest_id, true),
    ('Cocinero', 'cocinero', 'Ejecución de órdenes en cocina', v_rest_id, true),
    ('Ayudante Cocina', 'ayudante_cocina', 'Asistencia en cocina', v_rest_id, true),
    ('Cajero', 'cajero_rest', 'Cobros y cierre de caja en restaurante', v_rest_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;

  -- POS
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Admin Tienda', 'admin_tienda', 'Gestión de tienda', v_pos_id, true),
    ('Vendedor', 'vendedor', 'Ventas y atención al cliente', v_pos_id, true),
    ('Cajero POS', 'cajero_pos', 'Cobros en punto de venta', v_pos_id, true),
    ('Gerente Turno', 'gerente_turno', 'Cierres de caja y reportes', v_pos_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;

  -- Médico
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Médico', 'medico_prof', 'Atención de pacientes', v_med_id, true),
    ('Enfermero', 'enfermero', 'Asistencia médica y cuidados', v_med_id, true),
    ('Recepcionista', 'recepcionista_med', 'Turnos y admisión de pacientes', v_med_id, true),
    ('Administrativo Médico', 'administrativo_med', 'Facturación y gestión de seguros', v_med_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;

  -- Académico
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Profesor', 'profesor', 'Dictado de cursos y evaluación', v_acad_id, true),
    ('Alumno', 'alumno', 'Inscripción, cursada y notas', v_acad_id, true),
    ('Preceptor', 'preceptor', 'Control de asistencia y comunicaciones', v_acad_id, true),
    ('Coordinador', 'coordinador', 'Gestión de planes de estudio', v_acad_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;

  -- Admin (adicionales)
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Contador', 'contador', 'Libros contables y balances', v_admin_app_id, true),
    ('Administrativo', 'administrativo', 'Gestión documental y RRHH', v_admin_app_id, true),
    ('Gestor', 'gestor', 'Cobranzas y gestión de pagos', v_admin_app_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;
END $$;

-- ============================================================
-- PARTE H: PERMISOS BÁSICOS PARA ROLES NUEVOS
-- ============================================================

DO $$
DECLARE
  v_rest_id INT;
  v_pos_id INT;
  v_med_id INT;
  v_acad_id INT;
  v_admin_app_id INT;
  v_admin_local_id INT;
  v_chef_id INT;
  v_admin_tienda_id INT;
  v_medico_prof_id INT;
  v_profesor_id INT;
  v_contador_id INT;
BEGIN
  SELECT id INTO v_rest_id FROM public.applications WHERE slug = 'restaurant';
  SELECT id INTO v_pos_id FROM public.applications WHERE slug = 'pos';
  SELECT id INTO v_med_id FROM public.applications WHERE slug = 'medico';
  SELECT id INTO v_acad_id FROM public.applications WHERE slug = 'academico';
  SELECT id INTO v_admin_app_id FROM public.applications WHERE slug = 'admin';

  SELECT id INTO v_admin_local_id FROM public.roles WHERE slug = 'admin_local' AND application_id = v_rest_id;
  SELECT id INTO v_chef_id FROM public.roles WHERE slug = 'chef' AND application_id = v_rest_id;
  SELECT id INTO v_admin_tienda_id FROM public.roles WHERE slug = 'admin_tienda' AND application_id = v_pos_id;
  SELECT id INTO v_medico_prof_id FROM public.roles WHERE slug = 'medico_prof' AND application_id = v_med_id;
  SELECT id INTO v_profesor_id FROM public.roles WHERE slug = 'profesor' AND application_id = v_acad_id;
  SELECT id INTO v_contador_id FROM public.roles WHERE slug = 'contador' AND application_id = v_admin_app_id;

  -- Crear permisos base para cada app
  -- Restaurant
  INSERT INTO public.permissions (action_name, description, category) VALUES
    ('restaurant.dashboard.view', 'Ver dashboard del restaurante', 'restaurant'),
    ('restaurant.menu.read', 'Ver menú', 'restaurant'),
    ('restaurant.menu.create', 'Crear items de menú', 'restaurant'),
    ('restaurant.menu.update', 'Editar items de menú', 'restaurant'),
    ('restaurant.menu.delete', 'Eliminar items de menú', 'restaurant'),
    ('restaurant.ordenes.read', 'Ver órdenes', 'restaurant'),
    ('restaurant.ordenes.create', 'Tomar órdenes', 'restaurant'),
    ('restaurant.ordenes.update', 'Actualizar órdenes', 'restaurant'),
    ('restaurant.ordenes.cancel', 'Cancelar órdenes', 'restaurant'),
    ('restaurant.inventario.read', 'Ver inventario', 'restaurant'),
    ('restaurant.inventario.create', 'Registrar movimientos', 'restaurant'),
    ('restaurant.proveedores.read', 'Ver proveedores', 'restaurant')
  ON CONFLICT (action_name) DO NOTHING;

  -- POS
  INSERT INTO public.permissions (action_name, description, category) VALUES
    ('pos.dashboard.view', 'Ver dashboard POS', 'pos'),
    ('pos.ventas.read', 'Ver ventas', 'pos'),
    ('pos.ventas.create', 'Realizar ventas', 'pos'),
    ('pos.ventas.cancel', 'Cancelar ventas', 'pos'),
    ('pos.productos.read', 'Ver productos', 'pos'),
    ('pos.productos.create', 'Crear productos', 'pos'),
    ('pos.productos.update', 'Editar productos', 'pos'),
    ('pos.caja.read', 'Ver caja', 'pos'),
    ('pos.caja.cierre', 'Realizar cierre de caja', 'pos'),
    ('pos.clientes.read', 'Ver clientes', 'pos'),
    ('pos.clientes.create', 'Crear clientes', 'pos'),
    ('pos.reportes.view', 'Ver reportes', 'pos')
  ON CONFLICT (action_name) DO NOTHING;

  -- Médico
  INSERT INTO public.permissions (action_name, description, category) VALUES
    ('medico.dashboard.view', 'Ver dashboard médico', 'medico'),
    ('medico.pacientes.read', 'Ver pacientes', 'medico'),
    ('medico.pacientes.create', 'Registrar pacientes', 'medico'),
    ('medico.pacientes.update', 'Actualizar datos de pacientes', 'medico'),
    ('medico.turnos.read', 'Ver turnos', 'medico'),
    ('medico.turnos.create', 'Asignar turnos', 'medico'),
    ('medico.turnos.update', 'Reprogramar turnos', 'medico'),
    ('medico.turnos.cancel', 'Cancelar turnos', 'medico'),
    ('medico.historial.read', 'Ver historias clínicas', 'medico'),
    ('medico.historial.write', 'Escribir en historias clínicas', 'medico'),
    ('medico.recetas.read', 'Ver recetas médicas', 'medico'),
    ('medico.recetas.create', 'Prescribir recetas', 'medico'),
    ('medico.facturacion.read', 'Ver facturación', 'medico'),
    ('medico.facturacion.manage', 'Gestionar facturación', 'medico')
  ON CONFLICT (action_name) DO NOTHING;

  -- Académico
  INSERT INTO public.permissions (action_name, description, category) VALUES
    ('academico.dashboard.view', 'Ver dashboard académico', 'academico'),
    ('academico.cursos.read', 'Ver cursos', 'academico'),
    ('academico.cursos.create', 'Crear cursos', 'academico'),
    ('academico.cursos.update', 'Editar cursos', 'academico'),
    ('academico.alumnos.read', 'Ver alumnos', 'academico'),
    ('academico.alumnos.inscribir', 'Inscribir alumnos', 'academico'),
    ('academico.alumnos.notas', 'Gestionar notas', 'academico'),
    ('academico.horarios.read', 'Ver horarios', 'academico'),
    ('academico.horarios.manage', 'Gestionar horarios', 'academico'),
    ('academico.asistencia.read', 'Ver asistencia', 'academico'),
    ('academico.asistencia.registrar', 'Registrar asistencia', 'academico'),
    ('academico.comunicaciones', 'Enviar comunicaciones', 'academico')
  ON CONFLICT (action_name) DO NOTHING;

  -- ============================================================
  -- ASIGNAR PERMISOS A ROLES
  -- ============================================================

  -- Admin Local (restaurant) → todos los permisos de restaurant
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_local_id, p.id
  FROM public.permissions p
  WHERE p.action_name LIKE 'restaurant.%'
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_admin_local_id AND rp.permission_id = p.id
    );

  -- Chef → menu CRUD, inventario read, proveedores read, órdenes read
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_chef_id, p.id
  FROM public.permissions p
  WHERE p.action_name IN (
    'restaurant.dashboard.view',
    'restaurant.menu.read', 'restaurant.menu.create', 'restaurant.menu.update',
    'restaurant.ordenes.read', 'restaurant.ordenes.create', 'restaurant.ordenes.update',
    'restaurant.inventario.read',
    'restaurant.proveedores.read'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_chef_id AND rp.permission_id = p.id
  );

  -- Admin Tienda (POS) → todos los permisos de POS
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_tienda_id, p.id
  FROM public.permissions p
  WHERE p.action_name LIKE 'pos.%'
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_admin_tienda_id AND rp.permission_id = p.id
    );

  -- Médico → pacientes, turnos, historial, recetas
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_medico_prof_id, p.id
  FROM public.permissions p
  WHERE p.action_name IN (
    'medico.dashboard.view',
    'medico.pacientes.read', 'medico.pacientes.create', 'medico.pacientes.update',
    'medico.turnos.read', 'medico.turnos.create', 'medico.turnos.update',
    'medico.historial.read', 'medico.historial.write',
    'medico.recetas.read', 'medico.recetas.create',
    'medico.facturacion.read'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_medico_prof_id AND rp.permission_id = p.id
  );

  -- Profesor → cursos, alumnos (notas), horarios, asistencia
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_profesor_id, p.id
  FROM public.permissions p
  WHERE p.action_name IN (
    'academico.dashboard.view',
    'academico.cursos.read',
    'academico.alumnos.read', 'academico.alumnos.notas',
    'academico.horarios.read',
    'academico.asistencia.read', 'academico.asistencia.registrar',
    'academico.comunicaciones'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_profesor_id AND rp.permission_id = p.id
  );

  -- Contador → permisos contables
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_contador_id, p.id
  FROM public.permissions p
  WHERE p.action_name IN (
    'core.empresas.view',
    'core.suscripciones.view',
    'core.audit.view'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_contador_id AND rp.permission_id = p.id
  );
END $$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT
  (SELECT COUNT(*) FROM public.industrias) AS industrias_count,
  (SELECT COUNT(*) FROM public.industria_apps) AS industria_apps_count,
  (SELECT COUNT(*) FROM public.applications WHERE slug IN ('core', 'restaurant', 'pos', 'medico', 'academico')) AS new_apps_count,
  (SELECT COUNT(*) FROM public.roles WHERE application_id = (SELECT id FROM public.applications WHERE slug = 'core')) AS core_roles_count,
  (SELECT COUNT(*) FROM public.empresas WHERE industria_principal IS NOT NULL) AS empresas_migrated;

SELECT '✅ Multi-industria infra migration complete' AS resultado;
