-- ============================================================
-- Agregar es_dueno a empresa_usuarios
-- Fecha: 2026-06-09
-- Descripción:
--   Distingue entre usuario primario (creó la empresa) y
--   secundario (invitado). Permite filtros multi-empresa
--   en la gestión de usuarios estilo Odoo.
-- ============================================================

-- ============================================================
-- 1. AGREGAR COLUMNA
-- ============================================================
ALTER TABLE public.empresa_usuarios
  ADD COLUMN es_dueno BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. BACKFILL: marcar como dueños a los admins existentes
-- ============================================================
UPDATE public.empresa_usuarios eu
SET es_dueno = true
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = eu.usuario_id
    AND ur.empresa_id = eu.empresa_id
    AND r.slug = 'admin'
);

-- ============================================================
-- 3. ACTUALIZAR handle_new_user()
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id INT;
  v_invitation_code TEXT;
  v_empresa_slug TEXT;
  v_app_id INT;
  v_admin_role_id INT;
  v_usuario_role_id INT;
BEGIN
  -- Insertar perfil básico
  INSERT INTO public.perfiles (id, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1))
  );

  -- Obtener app_id de panadería
  SELECT id INTO v_app_id FROM public.applications WHERE slug = 'panaderia';
  SELECT id INTO v_admin_role_id FROM public.roles WHERE slug = 'admin' AND application_id = v_app_id;
  SELECT id INTO v_usuario_role_id FROM public.roles WHERE slug = 'usuario' AND application_id = v_app_id;

  -- Verificar si tiene código de invitación
  v_invitation_code := NEW.raw_user_meta_data->>'invitacion';

  IF v_invitation_code IS NOT NULL THEN
    SELECT id INTO v_empresa_id FROM public.empresas WHERE slug = v_invitation_code AND activa = true;

    IF v_empresa_id IS NOT NULL THEN
      -- Usuario secundario (invitado)
      INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo, es_dueno)
      VALUES (v_empresa_id, NEW.id, true, false);

      -- Rol por defecto (usuario) en panadería
      INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
      VALUES (NEW.id, v_empresa_id, v_usuario_role_id, v_app_id);

      RETURN NEW;
    END IF;
  END IF;

  -- Sin invitación: crear nueva empresa → usuario primario
  v_empresa_slug := 'emp-' || substr(md5(NEW.id::text || extract(epoch from now())::text), 1, 8);

  INSERT INTO public.empresas (nombre, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'empresa', 'Mi Empresa'),
    v_empresa_slug
  )
  RETURNING id INTO v_empresa_id;

  -- Dueño + admin
  INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo, es_dueno)
  VALUES (v_empresa_id, NEW.id, true, true);

  -- Rol admin en panadería
  INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
  VALUES (NEW.id, v_empresa_id, v_admin_role_id, v_app_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ es_dueno added to empresa_usuarios' AS resultado;
