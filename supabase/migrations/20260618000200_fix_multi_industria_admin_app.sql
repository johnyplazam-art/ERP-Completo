-- ============================================================
-- FIX: Multi-Industria — Crear app admin + roles faltantes
-- Fecha: 2026-06-18
-- Descripción:
--   La migración 20260618000100 asumió que la app 'admin'
--   existe, pero ninguna migración la crea (fue creada
--   manualmente desde AdminApps UI).
--
--   Este fix:
--   1. Crea la app 'admin' si no existe
--   2. Re-crea los roles: contador, administrativo, gestor
--   3. Asigna permisos correctamente
-- ============================================================

-- ============================================================
-- 1. ASEGURAR QUE APP 'admin' EXISTA
-- ============================================================
INSERT INTO public.applications (name, slug, description, is_active)
SELECT 'Administración', 'admin', 'Módulo de gestión administrativa y contable', true
WHERE NOT EXISTS (SELECT 1 FROM public.applications WHERE slug = 'admin');

-- ============================================================
-- 2. CREAR ROLES FALTANTES (si no existen)
-- ============================================================
DO $$
DECLARE
  v_admin_app_id INT;
BEGIN
  SELECT id INTO v_admin_app_id FROM public.applications WHERE slug = 'admin';

  IF v_admin_app_id IS NOT NULL THEN
    INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
      ('Contador', 'contador', 'Libros contables y balances', v_admin_app_id, true),
      ('Administrativo', 'administrativo', 'Gestión documental y RRHH', v_admin_app_id, true),
      ('Gestor', 'gestor', 'Cobranzas y gestión de pagos', v_admin_app_id, true)
    ON CONFLICT (slug, application_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 3. ASIGNAR PERMISOS A ROLES DE ADMIN APP
-- ============================================================
DO $$
DECLARE
  v_admin_app_id INT;
  v_contador_id INT;
  v_administrativo_id INT;
  v_gestor_id INT;
BEGIN
  SELECT id INTO v_admin_app_id FROM public.applications WHERE slug = 'admin';

  IF v_admin_app_id IS NULL THEN
    RAISE WARNING 'App admin no encontrada';
    RETURN;
  END IF;

  SELECT id INTO v_contador_id FROM public.roles WHERE slug = 'contador' AND application_id = v_admin_app_id;
  SELECT id INTO v_administrativo_id FROM public.roles WHERE slug = 'administrativo' AND application_id = v_admin_app_id;
  SELECT id INTO v_gestor_id FROM public.roles WHERE slug = 'gestor' AND application_id = v_admin_app_id;

  -- Contador: permisos de lectura contable
  IF v_contador_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_contador_id, p.id
    FROM public.permissions p
    WHERE p.action_name IN (
      'core.empresas.view',
      'core.suscripciones.view',
      'core.audit.view'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_contador_id AND rp.permission_id = p.id
    );
  END IF;

  -- Administrativo: gestión documental
  IF v_administrativo_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_administrativo_id, p.id
    FROM public.permissions p
    WHERE p.action_name IN (
      'core.empresas.view',
      'core.usuarios.view'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_administrativo_id AND rp.permission_id = p.id
    );
  END IF;

  -- Gestor: cobranzas y pagos
  IF v_gestor_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_gestor_id, p.id
    FROM public.permissions p
    WHERE p.action_name IN (
      'core.empresas.view',
      'core.suscripciones.view'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = v_gestor_id AND rp.permission_id = p.id
    );
  END IF;
END $$;

-- ============================================================
-- 4. VERIFICACIÓN
-- ============================================================
SELECT
  (SELECT id FROM public.applications WHERE slug = 'admin') IS NOT NULL AS admin_app_exists,
  (SELECT COUNT(*) FROM public.roles WHERE slug IN ('contador', 'administrativo', 'gestor')
    AND application_id = (SELECT id FROM public.applications WHERE slug = 'admin')) AS admin_roles_count;

SELECT '✅ Fix multi-industria admin app complete' AS resultado;
