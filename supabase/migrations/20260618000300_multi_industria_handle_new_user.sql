-- ============================================================
-- MIGRACIÓN: Multi-Industria — handle_new_user()
-- Fecha: 2026-06-18
-- Descripción:
--   Reemplaza handle_new_user() para soportar registro
--   multi-industria. La industria se recibe desde
--   raw_user_meta_data->>'industria' (default: 'panaderia').
--
--   FLUJO:
--   1. Crear perfil
--   2. Obtener industria de metadata (default panadería)
--   3. Si tiene invitación:
--      - Unirse a empresa existente
--      - Asignar rol usuario en app core + rol por defecto en industria
--   4. Si no tiene invitación:
--      - Crear empresa con industria_principal
--      - Asignar admin en core + admin-equivalent en industria
--      - Crear suscripción gratuita
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id INT;
  v_invitation_code TEXT;
  v_empresa_slug TEXT;
  v_industria_slug TEXT;
  v_industria_id INT;
  v_core_app_id INT;
  v_admin_role_id INT;
  v_usuario_role_id INT;
  v_ind_app_id INT;
  v_ind_admin_role_id INT;
  v_ind_user_role_id INT;
  v_plan_gratuito_id INT;
  v_app_record RECORD;
BEGIN
  -- ==========================================================
  -- 1. CREAR PERFIL
  -- ==========================================================
  INSERT INTO public.perfiles (id, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1))
  );

  -- ==========================================================
  -- 2. OBTENER INDUSTRIA
  -- ==========================================================
  v_industria_slug := COALESCE(NEW.raw_user_meta_data->>'industria', 'panaderia');

  SELECT id INTO v_industria_id
  FROM public.industrias
  WHERE slug = v_industria_slug AND activa = true;

  -- Fallback a panadería si la industria no existe
  IF v_industria_id IS NULL THEN
    SELECT id INTO v_industria_id
    FROM public.industrias
    WHERE slug = 'panaderia' AND activa = true;
    v_industria_slug := 'panaderia';
  END IF;

  -- ==========================================================
  -- 3. OBTENER IDs DE APPS Y ROLES
  -- ==========================================================
  SELECT id INTO v_core_app_id FROM public.applications WHERE slug = 'core';
  SELECT id INTO v_admin_role_id FROM public.roles WHERE slug = 'admin' AND application_id = v_core_app_id;
  SELECT id INTO v_usuario_role_id FROM public.roles WHERE slug = 'usuario' AND application_id = v_core_app_id;

  -- Mapear industria → app + rol admin por defecto
  v_ind_app_id := NULL;
  v_ind_admin_role_id := NULL;
  v_ind_user_role_id := NULL;

  IF v_industria_slug = 'panaderia' THEN
    SELECT id INTO v_ind_app_id FROM public.applications WHERE slug = 'panaderia';
    SELECT id INTO v_ind_admin_role_id FROM public.roles WHERE slug = 'admin' AND application_id = v_ind_app_id;
    SELECT id INTO v_ind_user_role_id FROM public.roles WHERE slug = 'usuario' AND application_id = v_ind_app_id;
  ELSIF v_industria_slug = 'restaurant' THEN
    SELECT id INTO v_ind_app_id FROM public.applications WHERE slug = 'restaurant';
    SELECT id INTO v_ind_admin_role_id FROM public.roles WHERE slug = 'admin_local' AND application_id = v_ind_app_id;
    SELECT id INTO v_ind_user_role_id FROM public.roles WHERE slug = 'cocinero' AND application_id = v_ind_app_id;
  ELSIF v_industria_slug = 'pos' THEN
    SELECT id INTO v_ind_app_id FROM public.applications WHERE slug = 'pos';
    SELECT id INTO v_ind_admin_role_id FROM public.roles WHERE slug = 'admin_tienda' AND application_id = v_ind_app_id;
    SELECT id INTO v_ind_user_role_id FROM public.roles WHERE slug = 'vendedor' AND application_id = v_ind_app_id;
  ELSIF v_industria_slug = 'medico' THEN
    SELECT id INTO v_ind_app_id FROM public.applications WHERE slug = 'medico';
    SELECT id INTO v_ind_admin_role_id FROM public.roles WHERE slug = 'medico_prof' AND application_id = v_ind_app_id;
    SELECT id INTO v_ind_user_role_id FROM public.roles WHERE slug = 'recepcionista_med' AND application_id = v_ind_app_id;
  ELSIF v_industria_slug = 'academico' THEN
    SELECT id INTO v_ind_app_id FROM public.applications WHERE slug = 'academico';
    SELECT id INTO v_ind_admin_role_id FROM public.roles WHERE slug = 'profesor' AND application_id = v_ind_app_id;
    SELECT id INTO v_ind_user_role_id FROM public.roles WHERE slug = 'alumno' AND application_id = v_ind_app_id;
  END IF;

  -- ==========================================================
  -- 4. VERIFICAR INVITACIÓN
  -- ==========================================================
  v_invitation_code := NEW.raw_user_meta_data->>'invitacion';

  IF v_invitation_code IS NOT NULL THEN
    -- Unirse a empresa existente
    SELECT id INTO v_empresa_id FROM public.empresas WHERE slug = v_invitation_code AND activa = true;

    IF v_empresa_id IS NOT NULL THEN
      -- Membresía como usuario secundario
      INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo, es_dueno)
      VALUES (v_empresa_id, NEW.id, true, false);

      -- Rol usuario en core
      IF v_core_app_id IS NOT NULL AND v_usuario_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
        VALUES (NEW.id, v_empresa_id, v_usuario_role_id, v_core_app_id)
        ON CONFLICT (user_id, empresa_id, application_id) DO NOTHING;
      END IF;

      -- Rol por defecto en la industria de la empresa
      IF v_ind_app_id IS NOT NULL AND v_ind_user_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
        VALUES (NEW.id, v_empresa_id, v_ind_user_role_id, v_ind_app_id)
        ON CONFLICT (user_id, empresa_id, application_id) DO NOTHING;
      END IF;

      RETURN NEW;
    END IF;
  END IF;

  -- ==========================================================
  -- 5. SIN INVITACIÓN: CREAR EMPRESA NUEVA
  -- ==========================================================
  v_empresa_slug := 'emp-' || substr(md5(NEW.id::text || extract(epoch from now())::text), 1, 8);

  INSERT INTO public.empresas (nombre, slug, industria_principal)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'empresa', 'Mi Empresa'),
    v_empresa_slug,
    v_industria_id
  )
  RETURNING id INTO v_empresa_id;

  -- Dueño de la empresa
  INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo, es_dueno)
  VALUES (v_empresa_id, NEW.id, true, true);

  -- Rol admin en core (plataforma)
  IF v_core_app_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
    VALUES (NEW.id, v_empresa_id, v_admin_role_id, v_core_app_id)
    ON CONFLICT (user_id, empresa_id, application_id) DO NOTHING;
  END IF;

  -- Rol admin-equivalent en la industria
  IF v_ind_app_id IS NOT NULL AND v_ind_admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
    VALUES (NEW.id, v_empresa_id, v_ind_admin_role_id, v_ind_app_id)
    ON CONFLICT (user_id, empresa_id, application_id) DO NOTHING;
  END IF;

  -- ==========================================================
  -- 6. CREAR SUSCRIPCIÓN GRATUITA
  -- ==========================================================
  SELECT id INTO v_plan_gratuito_id FROM public.planes WHERE slug = 'gratuito';

  IF v_plan_gratuito_id IS NOT NULL THEN
    INSERT INTO public.suscripciones (empresa_id, plan_id, estado, renovacion_automatica)
    VALUES (v_empresa_id, v_plan_gratuito_id, 'activa', false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RECREAR TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT '✅ handle_new_user multi-industria updated' AS resultado;
