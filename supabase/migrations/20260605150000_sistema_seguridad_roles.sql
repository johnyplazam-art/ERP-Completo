-- ============================================================
-- MIGRACIÓN: Sistema de Roles, Permisos y Auditoría
-- Fecha: 2026-06-05
-- Descripción: Implementa roles granular, permisos por acción,
--   asignación de roles por usuario+aplicación, y auditoría ISO
--   sobre Supabase Auth (NO reemplaza auth.users)
-- ============================================================

-- ============================================================
-- 1. APLICACIONES (multi-módulo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description TEXT DEFAULT '',
  application_id INT REFERENCES public.applications(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT FALSE, -- roles del sistema no se pueden eliminar
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slug, application_id)
);

-- ============================================================
-- 3. PERMISOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id SERIAL PRIMARY KEY,
  action_name VARCHAR(100) UNIQUE NOT NULL, -- Ej: 'ingredientes.create', 'ordenes.approve'
  description TEXT DEFAULT '',
  category VARCHAR(50) DEFAULT '',           -- Para agrupar en UI
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. RELACIÓN ROL ↔ PERMISO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- 5. USUARIO ↔ ROL (por aplicación)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  application_id INT REFERENCES public.applications(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, role_id, application_id)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role_id);
CREATE INDEX idx_user_roles_app ON public.user_roles(application_id);

-- ============================================================
-- 6. AUDITORÍA ISO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,

  -- Quién
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),

  -- Contexto de aplicación
  application_id INT REFERENCES public.applications(id) ON DELETE CASCADE,

  -- Qué
  action VARCHAR(50) NOT NULL,         -- INSERT, UPDATE, DELETE, LOGIN, EXPORT, etc.
  affected_table VARCHAR(100),        -- pacientes, ordenes_produccion
  entity_id VARCHAR(100),             -- ID del registro afectado

  -- Valores anteriores/nuevos
  old_value JSONB,
  new_value JSONB,

  -- Trazabilidad técnica
  source_ip VARCHAR(45),
  user_agent TEXT,
  trace TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_table ON public.audit_logs(affected_table);
CREATE INDEX idx_audit_action ON public.audit_logs(action);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at);

-- ============================================================
-- 7. MODIFICAR perfiles: sacar rol, agregar datos de perfil
-- ============================================================
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- El `rol` ahora vive en user_roles, pero lo mantenemos por
-- compatibilidad temporal mientras migramos. En una próxima
-- migración lo eliminamos.
-- ALTER TABLE public.perfiles DROP COLUMN rol;

-- ============================================================
-- 8. FUNCIÓN: Auditoría automática via TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email VARCHAR(255);
BEGIN
  -- Intentar obtener el usuario desde la sesión de Supabase
  v_user_id := auth.uid();
  v_user_email := (SELECT email FROM auth.users WHERE id = v_user_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, user_email, action, affected_table, entity_id, new_value
    ) VALUES (
      v_user_id, v_user_email, 'INSERT', TG_TABLE_NAME, NEW.id::TEXT,
      row_to_json(NEW)::JSONB
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id, user_email, action, affected_table, entity_id, old_value, new_value
    ) VALUES (
      v_user_id, v_user_email, 'UPDATE', TG_TABLE_NAME, NEW.id::TEXT,
      row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, user_email, action, affected_table, entity_id, old_value
    ) VALUES (
      v_user_id, v_user_email, 'DELETE', TG_TABLE_NAME, OLD.id::TEXT,
      row_to_json(OLD)::JSONB
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. SEED: Datos iniciales
-- ============================================================

-- 9a. Aplicación por defecto: Panadería
INSERT INTO public.applications (name, slug, description)
VALUES ('Panadería', 'panaderia', 'Módulo de gestión de panadería')
ON CONFLICT (slug) DO NOTHING;

-- 9b. Roles del sistema
INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Administrador', 'admin', 'Acceso total al sistema', id, TRUE
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'admin' AND application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia'));

INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Producción', 'produccion', 'Gestión de recetas, producción e inventario', id, TRUE
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'produccion' AND application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia'));

INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Ventas', 'ventas', 'Consultar productos, registrar ventas', id, TRUE
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'ventas' AND application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia'));

INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Usuario', 'usuario', 'Acceso básico de lectura', id, TRUE
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'usuario' AND application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia'));

-- 9c. Permisos del módulo panadería
INSERT INTO public.permissions (action_name, description, category) VALUES
  -- Dashboard
  ('dashboard.view', 'Ver dashboard principal', 'dashboard'),

  -- Ingredientes
  ('ingredientes.read', 'Ver ingredientes', 'ingredientes'),
  ('ingredientes.create', 'Crear ingredientes', 'ingredientes'),
  ('ingredientes.update', 'Editar ingredientes', 'ingredientes'),
  ('ingredientes.delete', 'Eliminar ingredientes', 'ingredientes'),
  ('ingredientes.stock', 'Ver stock de ingredientes', 'ingredientes'),

  -- Recetas
  ('recetas.read', 'Ver recetas', 'recetas'),
  ('recetas.create', 'Crear recetas', 'recetas'),
  ('recetas.update', 'Editar recetas', 'recetas'),
  ('recetas.delete', 'Eliminar recetas', 'recetas'),

  -- Productos
  ('productos.read', 'Ver productos', 'productos'),
  ('productos.create', 'Crear productos', 'productos'),
  ('productos.update', 'Editar productos', 'productos'),
  ('productos.delete', 'Eliminar productos', 'productos'),

  -- Órdenes de producción
  ('ordenes.read', 'Ver órdenes de producción', 'ordenes'),
  ('ordenes.create', 'Crear órdenes de producción', 'ordenes'),
  ('ordenes.update', 'Editar órdenes', 'ordenes'),
  ('ordenes.cancel', 'Cancelar órdenes', 'ordenes'),

  -- Inventario
  ('inventario.read', 'Ver movimientos de inventario', 'inventario'),
  ('inventario.create', 'Registrar movimientos', 'inventario'),

  -- Mermas
  ('mermas.read', 'Ver mermas', 'mermas'),
  ('mermas.create', 'Registrar mermas', 'mermas'),

  -- Proveedores
  ('proveedores.read', 'Ver proveedores', 'proveedores'),
  ('proveedores.create', 'Crear proveedores', 'proveedores'),
  ('proveedores.update', 'Editar proveedores', 'proveedores'),
  ('proveedores.delete', 'Eliminar proveedores', 'proveedores'),

  -- Administración
  ('usuarios.manage', 'Gestionar usuarios y roles', 'admin'),
  ('roles.manage', 'Gestionar roles y permisos', 'admin'),
  ('audit.view', 'Ver registros de auditoría', 'admin')
ON CONFLICT (action_name) DO NOTHING;

-- 9d. Asignar permisos a roles
-- Admin: todos los permisos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'admin'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Producción: ingredientes, recetas, productos, órdenes, inventario, mermas, proveedores
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'produccion'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND p.action_name IN (
    'dashboard.view',
    'ingredientes.read', 'ingredientes.create', 'ingredientes.update', 'ingredientes.stock',
    'recetas.read', 'recetas.create', 'recetas.update',
    'productos.read', 'productos.create', 'productos.update',
    'ordenes.read', 'ordenes.create', 'ordenes.update', 'ordenes.cancel',
    'inventario.read', 'inventario.create',
    'mermas.read', 'mermas.create',
    'proveedores.read', 'proveedores.create', 'proveedores.update'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Ventas: ver productos, ver inventario, registrar movimientos (egresos)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'ventas'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND p.action_name IN (
    'dashboard.view',
    'productos.read',
    'inventario.read', 'inventario.create',
    'ingredientes.read'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Usuario: solo lectura básica
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'usuario'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND p.action_name IN (
    'dashboard.view',
    'ingredientes.read', 'ingredientes.stock',
    'recetas.read',
    'productos.read',
    'ordenes.read',
    'inventario.read',
    'mermas.read',
    'proveedores.read'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ============================================================
-- 10. ACTUALIZAR TRIGGER de nuevo usuario
-- ============================================================
-- El trigger handle_new_user ya existe en la migración anterior.
-- Lo recreamos para que además asigne el rol 'usuario' por defecto.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_app_id INT;
  v_usuario_role_id INT;
BEGIN
  -- Crear perfil
  INSERT INTO public.perfiles (id, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Asignar rol 'usuario' por defecto en panadería
  SELECT id INTO v_app_id FROM public.applications WHERE slug = 'panaderia';
  SELECT id INTO v_usuario_role_id FROM public.roles WHERE slug = 'usuario' AND application_id = v_app_id;

  IF v_app_id IS NOT NULL AND v_usuario_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id, application_id)
    VALUES (NEW.id, v_usuario_role_id, v_app_id)
    ON CONFLICT (user_id, role_id, application_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reemplazar el trigger existente (se aplica DROP + CREATE automáticamente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS en tablas nuevas
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: todos los autenticados pueden LEER roles y permisos
CREATE POLICY "Lectura universal roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal permissions"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal user_roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal applications"
  ON public.applications FOR SELECT TO authenticated USING (true);

-- Auditoría: solo lectura, y solo admin puede leer
CREATE POLICY "Lectura audit para admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

-- Escritura en audit_logs: cualquiera autenticado puede INSERTAR
CREATE POLICY "Insercion audit para autenticados"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Escritura en user_roles: solo admin
CREATE POLICY "Insercion user_roles admin"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

CREATE POLICY "Actualizacion user_roles admin"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

CREATE POLICY "Eliminacion user_roles admin"
  ON public.user_roles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

-- Escritura en roles/permisos: solo admin
CREATE POLICY "Escritura roles admin"
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

CREATE POLICY "Actualizacion roles admin"
  ON public.roles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

CREATE POLICY "Escritura permissions admin"
  ON public.permissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

CREATE POLICY "Escritura role_permissions admin"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

-- ============================================================
-- 12. FUNCIÓN: Verificar si un usuario tiene un permiso
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id UUID, p_action_name TEXT, p_app_slug TEXT DEFAULT 'panaderia')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.applications a ON a.id = ur.application_id
    WHERE ur.user_id = p_user_id
      AND p.action_name = p_action_name
      AND a.slug = p_app_slug
      AND rp.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 13. FUNCIÓN: Obtener permisos de un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID, p_app_slug TEXT DEFAULT 'panaderia')
RETURNS TABLE(action_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.action_name::TEXT
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  JOIN public.applications a ON a.id = ur.application_id
  WHERE ur.user_id = p_user_id
    AND a.slug = p_app_slug
    AND rp.is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
