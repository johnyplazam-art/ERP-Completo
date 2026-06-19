-- Migration: multi_industria_rls
-- Description: Implement Row Level Security (RLS) policies for multi-tenant and multi-industry support
-- Date: 2026-06-18

-- 0. DROP OLD POLICIES (from multi_tenant migration) that cause infinite recursion
DROP POLICY IF EXISTS "empresas_select" ON empresas;
DROP POLICY IF EXISTS "empresa_usuarios_select" ON empresa_usuarios;
DROP POLICY IF EXISTS "empresa_usuarios_insert" ON empresa_usuarios;
DROP POLICY IF EXISTS "empresa_usuarios_update" ON empresa_usuarios;
DROP POLICY IF EXISTS "empresa_usuarios_delete" ON empresa_usuarios;
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;
DROP POLICY IF EXISTS "suscripciones_select" ON suscripciones;
DROP POLICY IF EXISTS "suscripciones_insert" ON suscripciones;
DROP POLICY IF EXISTS "suscripciones_update" ON suscripciones;

-- 1. ENABLE RLS ON ALL RELEVANT TABLES
ALTER TABLE industrias ENABLE ROW LEVEL SECURITY;
ALTER TABLE industria_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS empresa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suscripciones ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions to avoid infinite recursion (must be created before policies that use them)
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(p_empresa_id INT, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresa_usuarios
    WHERE empresa_id = p_empresa_id
      AND usuario_id = p_user_id
      AND activo = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_is_owner_of_empresa(p_empresa_id INT, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresa_usuarios
    WHERE empresa_id = p_empresa_id
      AND usuario_id = p_user_id
      AND es_dueno = true
      AND activo = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_role_in_empresa(
  p_user_id UUID,
  p_empresa_id INT,
  p_role_slugs TEXT[],
  p_app_slugs TEXT[]
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.applications a ON a.id = ur.application_id
    WHERE ur.user_id = p_user_id
      AND (p_empresa_id IS NULL OR ur.empresa_id = p_empresa_id)
      AND r.slug = ANY(p_role_slugs)
      AND a.slug = ANY(p_app_slugs)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLICIES FOR 'industrias'
-- Public can read all industries (to show in selector)
CREATE POLICY "Industrias: Select universal" ON industrias
  FOR SELECT USING (true);

-- Only super_admin can modify industries
CREATE POLICY "Industrias: Admin full access" ON industrias
  FOR ALL USING (
    public.user_has_role_in_empresa(
      auth.uid(), NULL::INT, '{super_admin}'::TEXT[],
      '{core}'::TEXT[]
    )
  );

-- 3. POLICIES FOR 'industria_apps'
-- Public can read all industry_apps
CREATE POLICY "Industria_Apps: Select universal" ON industria_apps
  FOR SELECT USING (true);

-- Only super_admin can modify
CREATE POLICY "Industria_Apps: Admin full access" ON industria_apps
  FOR ALL USING (
    public.user_has_role_in_empresa(
      auth.uid(), NULL::INT, '{super_admin}'::TEXT[],
      '{core}'::TEXT[]
    )
  );

-- 4. POLICIES FOR 'empresas'
-- Users can select companies they belong to
CREATE POLICY "Empresas: Select miembros" ON empresas
  FOR SELECT USING (
    public.user_belongs_to_empresa(empresas.id, auth.uid())
  );

-- Only super_admin can modify
CREATE POLICY "Empresas: Admin full access" ON empresas
  FOR ALL USING (
    public.user_has_role_in_empresa(
      auth.uid(), NULL::INT, '{super_admin}'::TEXT[],
      '{core}'::TEXT[]
    )
  );

-- 6. POLICIES FOR 'empresa_usuarios'
-- Users can see members of their own companies
CREATE POLICY "Empresa_Usuarios: Select miembros de la misma empresa" ON empresa_usuarios
  FOR SELECT USING (
    public.user_belongs_to_empresa(empresa_id, auth.uid())
  );

-- Owners and Admins can manage members
CREATE POLICY "Empresa_Usuarios: Gestion por dueño/admin" ON empresa_usuarios
  FOR ALL USING (
    public.user_is_owner_of_empresa(empresa_id, auth.uid())
    OR
    public.user_has_role_in_empresa(
      auth.uid(), empresa_id,
      '{admin_local,admin_tienda,admin_med,admin_academico,admin}'::TEXT[],
      '{restaurant,pos,medico,academico,panaderia}'::TEXT[]
    )
  );

-- 7. POLICIES FOR 'user_roles'
-- Users can see their own roles in their companies
CREATE POLICY "User_Roles: Select roles del usuario" ON user_roles
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Managers can manage roles
CREATE POLICY "User_Roles: Gestion por administrador" ON user_roles
  FOR ALL USING (
    public.user_is_owner_of_empresa(user_roles.empresa_id, auth.uid())
    OR
    public.user_has_role_in_empresa(
      auth.uid(), user_roles.empresa_id,
      '{admin_local,admin_tienda,admin_med,admin_academico,admin}'::TEXT[],
      '{restaurant,pos,medico,academico,panaderia}'::TEXT[]
    )
  );

-- 8. POLICIES FOR 'suscripciones'
-- Users can see their own subscription
CREATE POLICY "Suscripciones: Select propia" ON suscripciones
  FOR SELECT USING (
    public.user_belongs_to_empresa(suscripciones.empresa_id, auth.uid())
  );
