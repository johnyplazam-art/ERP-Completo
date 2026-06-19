-- Migration: multi_industria_rls
-- Description: Implement Row Level Security (RLS) policies for multi-tenant and multi-industry support
-- Date: 2026-06-18

-- 1. ENABLE RLS ON ALL RELEVANT TABLES
ALTER TABLE industrias ENABLE ROW LEVEL SECURITY;
ALTER TABLE industria_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS empresa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suscripciones ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR 'industrias'
-- Public can read all industries (to show in selector)
CREATE POLICY "Industrias: Select universal" ON industrias
  FOR SELECT USING (true);

-- Only super_admin can modify industries
CREATE POLICY "Industrias: Admin full access" ON industrias
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.slug = 'super_admin'
        AND r.application_id = (SELECT id FROM applications WHERE slug = 'core')
    )
  );

-- 3. POLICIES FOR 'industria_apps'
-- Public can read all industry_apps
CREATE POLICY "Industria_Apps: Select universal" ON industria_apps
  FOR SELECT USING (true);

-- Only super_admin can modify
CREATE POLICY "Industria_Apps: Admin full access" ON industria_apps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.slug = 'super_admin'
        AND r.application_id = (SELECT id FROM applications WHERE slug = 'core')
    )
  );

-- 4. POLICIES FOR 'empresas'
-- Users can select companies they belong to
CREATE POLICY "Empresas: Select miembros" ON empresas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empresa_usuarios eu
      WHERE eu.empresa_id = empresas.id
        AND eu.usuario_id = auth.uid()
        AND eu.activo = true
    )
  );

-- Only super_admin can modify
CREATE POLICY "Empresas: Admin full access" ON empresas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.slug = 'super_admin'
        AND r.application_id = (SELECT id FROM applications WHERE slug = 'core')
    )
  );

-- 5. POLICIES FOR 'empresa_usuarios'
-- Users can see members of their own companies
CREATE POLICY "Empresa_Usuarios: Select miembros de la misma empresa" ON empresa_usuarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empresa_usuarios eu_self
      WHERE eu_self.usuario_id = auth.uid()
        AND eu_self.empresa_id = empresa_usuarios.empresa_id
        AND eu_self.activo = true
    )
  );

-- Owners and Admins can manage members
CREATE POLICY "Empresa_Usuarios: Gestion por dueño/admin" ON empresa_usuarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM empresa_usuarios eu_manager
      WHERE eu_manager.usuario_id = auth.uid()
        AND eu_manager.empresa_id = empresa_usuarios.empresa_id
        AND eu_manager.es_dueno = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur_manager
      JOIN roles r ON ur_manager.role_id = r.id
      JOIN applications a ON ur_manager.application_id = a.id
      WHERE ur_manager.user_id = auth.uid()
        AND ur_manager.empresa_id = empresa_usuarios.empresa_id
        AND r.slug IN ('admin_local', 'admin_tienda', 'admin_med', 'admin_academico', 'admin')
        AND a.slug IN ('restaurant', 'pos', 'medico', 'academico', 'panaderia')
    )
  );

-- 6. POLICIES FOR 'user_roles'
-- Users can see their own roles in their companies
CREATE POLICY "User_Roles: Select roles del usuario" ON user_roles
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Managers can manage roles
CREATE POLICY "User_Roles: Gestion por administrador" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM empresa_usuarios eu_manager
      WHERE eu_manager.usuario_id = auth.uid()
        AND eu_manager.empresa_id = user_roles.empresa_id
        AND eu_manager.es_dueno = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur_manager
      JOIN roles r ON ur_manager.role_id = r.id
      JOIN applications a ON ur_manager.application_id = a.id
      WHERE ur_manager.user_id = auth.uid()
        AND ur_manager.empresa_id = user_roles.empresa_id
        AND r.slug IN ('admin_local', 'admin_tienda', 'admin_med', 'admin_academico', 'admin')
        AND a.slug IN ('restaurant', 'pos', 'medico', 'academico', 'panaderia')
    )
  );

-- 7. POLICIES FOR 'suscripciones'
-- Users can see their own subscription
CREATE POLICY "Suscripciones: Select propia" ON suscripciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM empresa_usuarios eu
      WHERE eu.empresa_id = suscripciones.empresa_id
        AND eu.usuario_id = auth.uid()
    )
  );
