-- Migration: platform_admin
-- Description: Add is_platform_admin column to perfiles, helper function,
--              and update RLS policies for platform admin bypass.
-- Date: 2026-06-20

-- 1. ADD COLUMN
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.perfiles.is_platform_admin IS
  'Global platform admin — bypasses all RLS, sees all empresas/users/apps.';

-- 2. HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.user_is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = p_user_id AND is_platform_admin = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. UPDATE RLS POLICIES

-- 3a. Empresas — platform admin can see and manage all
DROP POLICY IF EXISTS "Empresas: Select miembros" ON empresas;
CREATE POLICY "Empresas: Select miembros" ON empresas
  FOR SELECT USING (
    public.user_belongs_to_empresa(empresas.id, auth.uid())
    OR
    public.user_is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Empresas: Admin full access" ON empresas;
CREATE POLICY "Empresas: Admin full access" ON empresas
  FOR ALL USING (
    public.user_has_role_in_empresa(
      auth.uid(), NULL::INT, '{super_admin}'::TEXT[],
      '{core}'::TEXT[]
    )
    OR
    public.user_is_platform_admin(auth.uid())
  );

-- 3b. Empresa_Usuarios — platform admin can see and manage all
DROP POLICY IF EXISTS "Empresa_Usuarios: Select miembros de la misma empresa" ON empresa_usuarios;
CREATE POLICY "Empresa_Usuarios: Select miembros de la misma empresa" ON empresa_usuarios
  FOR SELECT USING (
    public.user_belongs_to_empresa(empresa_id, auth.uid())
    OR
    public.user_is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Empresa_Usuarios: Gestion por dueño/admin" ON empresa_usuarios;
CREATE POLICY "Empresa_Usuarios: Gestion por dueño/admin" ON empresa_usuarios
  FOR ALL USING (
    public.user_is_owner_of_empresa(empresa_id, auth.uid())
    OR
    public.user_has_role_in_empresa(
      auth.uid(), empresa_id,
      '{admin_local,admin_tienda,admin_med,admin_academico,admin}'::TEXT[],
      '{restaurant,pos,medico,academico,panaderia}'::TEXT[]
    )
    OR
    public.user_is_platform_admin(auth.uid())
  );

-- 3c. User_Roles — platform admin can see and manage all
DROP POLICY IF EXISTS "User_Roles: Select roles del usuario" ON user_roles;
CREATE POLICY "User_Roles: Select roles del usuario" ON user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    public.user_is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "User_Roles: Gestion por administrador" ON user_roles;
CREATE POLICY "User_Roles: Gestion por administrador" ON user_roles
  FOR ALL USING (
    public.user_is_owner_of_empresa(user_roles.empresa_id, auth.uid())
    OR
    public.user_has_role_in_empresa(
      auth.uid(), user_roles.empresa_id,
      '{admin_local,admin_tienda,admin_med,admin_academico,admin}'::TEXT[],
      '{restaurant,pos,medico,academico,panaderia}'::TEXT[]
    )
    OR
    public.user_is_platform_admin(auth.uid())
  );

-- 3d. Suscripciones — platform admin can see all
DROP POLICY IF EXISTS "Suscripciones: Select propia" ON suscripciones;
CREATE POLICY "Suscripciones: Select propia" ON suscripciones
  FOR SELECT USING (
    public.user_belongs_to_empresa(suscripciones.empresa_id, auth.uid())
    OR
    public.user_is_platform_admin(auth.uid())
  );

-- 3e. Audit_logs — platform admin can see all
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.slug = 'admin'
    )
    OR
    public.user_is_platform_admin(auth.uid())
  );

-- 3f. Industrias — platform admin can manage
DROP POLICY IF EXISTS "Industrias: Admin full access" ON industrias;
CREATE POLICY "Industrias: Admin full access" ON industrias
  FOR ALL USING (
    public.user_has_role_in_empresa(
      auth.uid(), NULL::INT, '{super_admin}'::TEXT[],
      '{core}'::TEXT[]
    )
    OR
    public.user_is_platform_admin(auth.uid())
  );

-- 3g. Industria_Apps — platform admin can manage
DROP POLICY IF EXISTS "Industria_Apps: Admin full access" ON industria_apps;
CREATE POLICY "Industria_Apps: Admin full access" ON industria_apps
  FOR ALL USING (
    public.user_has_role_in_empresa(
      auth.uid(), NULL::INT, '{super_admin}'::TEXT[],
      '{core}'::TEXT[]
    )
    OR
    public.user_is_platform_admin(auth.uid())
  );

SELECT '✅ Platform admin migration applied' AS resultado;
