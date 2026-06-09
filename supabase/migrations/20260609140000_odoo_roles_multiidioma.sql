-- ============================================================
-- MIGRACIÓN: Odoo-like roles + Multi-idioma
-- Fecha: 2026-06-09
-- Descripción:
--   - Unifica user_roles con empresa_id (roles por app por empresa)
--   - Migra datos de empresa_usuarios.rol a user_roles
--   - Elimina empresa_usuarios.rol (queda como membresía pura)
--   - Agrega roles: panificador, ayudante_panificador, inventario
--   - Agrega permiso: usuarios.invite
--   - Agrega columna idioma a perfiles
--   - Actualiza funciones has_permission, get_user_permissions, handle_new_user
--   - Actualiza RLS policies para usar has_permission con scope de empresa
-- ============================================================

-- ============================================================
-- 1. AGREGAR empresa_id A user_roles
-- ============================================================
ALTER TABLE public.user_roles ADD COLUMN empresa_id INT REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Eliminar unique constraint vieja (no scoped a empresa)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_id_application_id_key;

-- Nueva unique: un rol por app por empresa por usuario
ALTER TABLE public.user_roles ADD CONSTRAINT uq_user_empresa_app UNIQUE (user_id, empresa_id, application_id);

-- Backfill: asignar empresa_id = 1 a los registros existentes
UPDATE public.user_roles SET empresa_id = 1 WHERE empresa_id IS NULL;

-- Ahora hacer NOT NULL
ALTER TABLE public.user_roles ALTER COLUMN empresa_id SET NOT NULL;

-- ============================================================
-- 2. MIGRAR DATOS DE empresa_usuarios.rol A user_roles
-- ============================================================
-- Por cada empresa_usuarios activo, crear un user_roles si no existe
INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
SELECT
  eu.usuario_id,
  eu.empresa_id,
  r.id,
  a.id
FROM public.empresa_usuarios eu
JOIN public.roles r ON r.slug = eu.rol
CROSS JOIN public.applications a
WHERE a.slug = 'panaderia'
  AND eu.activo = true
ON CONFLICT (user_id, empresa_id, application_id) DO NOTHING;

-- ============================================================
-- 3. AGREGAR ROLES NUEVOS
-- ============================================================
INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Panificador', 'panificador', 'Gestiona recetas y producción', id, true
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'panificador' AND application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia'));

INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Ayudante de Panificador', 'ayudante_panificador', 'Asiste en la producción de panadería', id, true
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'ayudante_panificador' AND application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia'));

INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Inventario', 'inventario', 'Gestiona ingredientes, stock y proveedores', id, true
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'inventario' AND application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia'));

-- ============================================================
-- 4. AGREGAR PERMISO usuarios.invite
-- ============================================================
INSERT INTO public.permissions (action_name, description, category)
VALUES ('usuarios.invite', 'Invitar nuevos usuarios a la aplicación', 'admin')
ON CONFLICT (action_name) DO NOTHING;

-- ============================================================
-- 5. ASIGNAR PERMISOS A ROLES NUEVOS
-- ============================================================

-- Helper: obtener app_id para panadería
DO $$
DECLARE
  v_app_id INT;
  v_admin_id INT;
  v_panificador_id INT;
  v_ayudante_id INT;
  v_inventario_id INT;
  v_produccion_id INT;
  v_ventas_id INT;
  v_usuario_id INT;
BEGIN
  SELECT id INTO v_app_id FROM public.applications WHERE slug = 'panaderia';

  -- Obtener IDs de roles
  SELECT id INTO v_admin_id FROM public.roles WHERE slug = 'admin' AND application_id = v_app_id;
  SELECT id INTO v_panificador_id FROM public.roles WHERE slug = 'panificador' AND application_id = v_app_id;
  SELECT id INTO v_ayudante_id FROM public.roles WHERE slug = 'ayudante_panificador' AND application_id = v_app_id;
  SELECT id INTO v_inventario_id FROM public.roles WHERE slug = 'inventario' AND application_id = v_app_id;
  SELECT id INTO v_produccion_id FROM public.roles WHERE slug = 'produccion' AND application_id = v_app_id;
  SELECT id INTO v_ventas_id FROM public.roles WHERE slug = 'ventas' AND application_id = v_app_id;
  SELECT id INTO v_usuario_id FROM public.roles WHERE slug = 'usuario' AND application_id = v_app_id;

  -- PANIFICADOR: ingredientes read, recetas CRUD (sin delete), productos CRUD (sin delete),
  --              ordenes CRUD (sin cancel), inventario read, mermas create, proveedores read,
  --              dashboard view, usuarios.invite
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_panificador_id, p.id FROM public.permissions p WHERE p.action_name IN (
    'dashboard.view',
    'ingredientes.read', 'ingredientes.stock',
    'recetas.read', 'recetas.create', 'recetas.update',
    'productos.read', 'productos.create', 'productos.update',
    'ordenes.read', 'ordenes.create', 'ordenes.update',
    'inventario.read',
    'mermas.read', 'mermas.create',
    'proveedores.read',
    'usuarios.invite'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- AYUDANTE PANIFICADOR: solo lectura + update estado de órdenes
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_ayudante_id, p.id FROM public.permissions p WHERE p.action_name IN (
    'dashboard.view',
    'ingredientes.read', 'ingredientes.stock',
    'recetas.read',
    'productos.read',
    'ordenes.read', 'ordenes.update',
    'inventario.read',
    'mermas.read',
    'proveedores.read'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- INVENTARIO: ingredientes CRUD, recetas read, productos read, ordenes read,
  --             inventario CRUD, mermas CRUD, proveedores CRUD, dashboard view
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_inventario_id, p.id FROM public.permissions p WHERE p.action_name IN (
    'dashboard.view',
    'ingredientes.read', 'ingredientes.create', 'ingredientes.update', 'ingredientes.delete', 'ingredientes.stock',
    'recetas.read',
    'productos.read',
    'ordenes.read',
    'inventario.read', 'inventario.create',
    'mermas.read', 'mermas.create',
    'proveedores.read', 'proveedores.create', 'proveedores.update', 'proveedores.delete'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- usuarios.invite también para PRODUCCIÓN (ya existe, pero aseguramos)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_produccion_id, p.id FROM public.permissions p WHERE p.action_name = 'usuarios.invite'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- usuarios.invite también para ADMIN (nuevo permiso, admin lo necesita)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_id, p.id FROM public.permissions p WHERE p.action_name = 'usuarios.invite'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

END $$;

-- ============================================================
-- 6. AGREGAR idioma A perfiles
-- ============================================================
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS idioma TEXT NOT NULL DEFAULT 'es'
  CHECK (idioma IN ('es', 'en'));

-- ============================================================
-- 7. ELIMINAR POLICIES VIEJAS QUE REFERENCIAN empresa_usuarios.rol
-- ============================================================

-- Las policies de catálogos de la migración multi_tenant usan
-- subqueries con empresa_usuarios.rol. Hay que dropearlas primero.

DROP POLICY IF EXISTS "catalogo_insert" ON public.categorias_receta;
DROP POLICY IF EXISTS "catalogo_update" ON public.categorias_receta;
DROP POLICY IF EXISTS "catalogo_delete" ON public.categorias_receta;

DROP POLICY IF EXISTS "catalogo_insert" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "catalogo_update" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "catalogo_delete" ON public.categorias_ingrediente;

DROP POLICY IF EXISTS "catalogo_insert" ON public.categorias_producto;
DROP POLICY IF EXISTS "catalogo_update" ON public.categorias_producto;
DROP POLICY IF EXISTS "catalogo_delete" ON public.categorias_producto;

DROP POLICY IF EXISTS "catalogo_insert" ON public.unidades_medida;
DROP POLICY IF EXISTS "catalogo_update" ON public.unidades_medida;
DROP POLICY IF EXISTS "catalogo_delete" ON public.unidades_medida;

DROP POLICY IF EXISTS "catalogo_insert" ON public.conversiones_unidades;
DROP POLICY IF EXISTS "catalogo_insert" ON public.conversiones_unidades;
DROP POLICY IF EXISTS "catalogo_update" ON public.conversiones_unidades;
DROP POLICY IF EXISTS "catalogo_delete" ON public.conversiones_unidades;
DROP POLICY IF EXISTS "catalogo_select" ON public.conversiones_unidades;

-- Also drop select policies (they don't depend on rol but we recreate them for consistency)
DROP POLICY IF EXISTS "catalogo_select" ON public.categorias_receta;
DROP POLICY IF EXISTS "catalogo_select" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "catalogo_select" ON public.categorias_producto;
DROP POLICY IF EXISTS "catalogo_select" ON public.unidades_medida;

-- ============================================================
-- 8. ELIMINAR rol DE empresa_usuarios
-- ============================================================
ALTER TABLE public.empresa_usuarios DROP COLUMN IF EXISTS rol;

-- ============================================================
-- 8b. RECREAR POLICIES DE CATÁLOGOS (sin referencia a empresa_usuarios.rol)
-- ============================================================
-- Ahora usan user_roles + has_permission() en vez de empresa_usuarios.rol

DO $$ DECLARE
  tbl TEXT;
  cat_tables TEXT[] := ARRAY[
    'categorias_receta', 'categorias_ingrediente', 'categorias_producto',
    'unidades_medida', 'conversiones_unidades'
  ];
BEGIN
  FOREACH tbl IN ARRAY cat_tables
  LOOP
    EXECUTE format(
      'CREATE POLICY "catalogo_select" ON public.%I FOR SELECT TO authenticated USING (true)', tbl
    );
    EXECUTE format(
      'CREATE POLICY "catalogo_insert" ON public.%I FOR INSERT TO authenticated
        WITH CHECK (EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.slug = ''admin''
        ))', tbl
    );
    EXECUTE format(
      'CREATE POLICY "catalogo_update" ON public.%I FOR UPDATE TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.slug = ''admin''
        ))', tbl
    );
    EXECUTE format(
      'CREATE POLICY "catalogo_delete" ON public.%I FOR DELETE TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.slug = ''admin''
        ))', tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- 9. ACTUALIZAR FUNCIÓN has_permission() — con scope de empresa
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_action_name TEXT,
  p_app_slug TEXT DEFAULT 'panaderia',
  p_empresa_id INT DEFAULT NULL
)
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
      AND (p_empresa_id IS NULL OR ur.empresa_id = p_empresa_id)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 10. ACTUALIZAR FUNCIÓN get_user_permissions() — con scope de empresa
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_user_id UUID,
  p_app_slug TEXT DEFAULT 'panaderia',
  p_empresa_id INT DEFAULT NULL
)
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
    AND rp.is_active = TRUE
    AND (p_empresa_id IS NULL OR ur.empresa_id = p_empresa_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 11. ACTUALIZAR handle_new_user() — escribe en user_roles
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
      -- Membresía en la empresa
      INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo)
      VALUES (v_empresa_id, NEW.id, true);

      -- Rol por defecto (usuario) en panadería
      INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
      VALUES (NEW.id, v_empresa_id, v_usuario_role_id, v_app_id);

      RETURN NEW;
    END IF;
  END IF;

  -- Sin invitación: crear nueva empresa
  v_empresa_slug := 'emp-' || substr(md5(NEW.id::text || extract(epoch from now())::text), 1, 8);

  INSERT INTO public.empresas (nombre, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'empresa', 'Mi Empresa'),
    v_empresa_slug
  )
  RETURNING id INTO v_empresa_id;

  -- Membresía como admin
  INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo)
  VALUES (v_empresa_id, NEW.id, true);

  -- Rol admin en panadería
  INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
  VALUES (NEW.id, v_empresa_id, v_admin_role_id, v_app_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger por si acaso
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 12. ACTUALIZAR RLS POLICIES
-- ============================================================

-- 11a. user_roles policies
DROP POLICY IF EXISTS "Lectura universal user_roles" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresa_usuarios
      WHERE usuario_id = auth.uid()
        AND empresa_id = user_roles.empresa_id
        AND activo = true
    )
  );

DROP POLICY IF EXISTS "Insercion user_roles admin" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empresa_usuarios eu
      JOIN public.user_roles ur ON ur.user_id = auth.uid() AND ur.empresa_id = eu.empresa_id
      JOIN public.roles r ON r.id = ur.role_id
      WHERE eu.empresa_id = user_roles.empresa_id
        AND eu.activo = true
        AND r.slug = 'admin'
    )
  );

DROP POLICY IF EXISTS "Actualizacion user_roles admin" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.empresa_usuarios eu
      JOIN public.user_roles ur ON ur.user_id = auth.uid() AND ur.empresa_id = eu.empresa_id
      JOIN public.roles r ON r.id = ur.role_id
      WHERE eu.empresa_id = user_roles.empresa_id
        AND eu.activo = true
        AND r.slug = 'admin'
    )
  );

DROP POLICY IF EXISTS "Eliminacion user_roles admin" ON public.user_roles;
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.empresa_usuarios eu
      JOIN public.user_roles ur ON ur.user_id = auth.uid() AND ur.empresa_id = eu.empresa_id
      JOIN public.roles r ON r.id = ur.role_id
      WHERE eu.empresa_id = user_roles.empresa_id
        AND eu.activo = true
        AND r.slug = 'admin'
    )
  );

-- 11b. roles/permisos policies — lectura universal, escritura admin
DROP POLICY IF EXISTS "Escritura roles admin" ON public.roles;
CREATE POLICY "roles_insert" ON public.roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.slug = 'admin'
    )
  );

DROP POLICY IF EXISTS "Actualizacion roles admin" ON public.roles;
CREATE POLICY "roles_update" ON public.roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.slug = 'admin'
    )
  );

-- 11c. auditoría policies
DROP POLICY IF EXISTS "Lectura audit para admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

-- 11d. Actualizar policies de tablas de negocio para usar has_permission()
--     Patrón: INSERT/UPDATE/DELETE ahora requieren el permiso específico
--     Además de pertenecer a la empresa

DO $$ DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'ingredientes', 'proveedores', 'ingrediente_proveedor',
    'recetas', 'receta_ingredientes', 'productos',
    'ordenes_produccion', 'orden_produccion_detalle',
    'movimientos_inventario_mp', 'movimientos_inventario_pt', 'mermas'
  ];
  perm_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- INSERT: requiere permiso {tabla}.create
    perm_name := tbl || '.create';
    EXECUTE format(
      'DROP POLICY IF EXISTS "empresa_insert" ON public.%I', tbl
    );
    EXECUTE format(
      'CREATE POLICY "empresa_insert" ON public.%I FOR INSERT TO authenticated
        WITH CHECK (
          public.usuario_en_empresa(empresa_id, NULL)
          AND public.has_permission(auth.uid(), %L, ''panaderia'', empresa_id)
        )',
      tbl, perm_name
    );

    -- UPDATE: requiere permiso {tabla}.update
    perm_name := tbl || '.update';
    EXECUTE format(
      'DROP POLICY IF EXISTS "empresa_update" ON public.%I', tbl
    );
    EXECUTE format(
      'CREATE POLICY "empresa_update" ON public.%I FOR UPDATE TO authenticated
        USING (public.usuario_en_empresa(empresa_id, NULL))
        WITH CHECK (
          public.usuario_en_empresa(empresa_id, NULL)
          AND public.has_permission(auth.uid(), %L, ''panaderia'', empresa_id)
        )',
      tbl, perm_name
    );

    -- DELETE: requiere permiso {tabla}.delete
    perm_name := tbl || '.delete';
    EXECUTE format(
      'DROP POLICY IF EXISTS "empresa_delete" ON public.%I', tbl
    );
    EXECUTE format(
      'CREATE POLICY "empresa_delete" ON public.%I FOR DELETE TO authenticated
        USING (
          public.usuario_en_empresa(empresa_id, NULL)
          AND public.has_permission(auth.uid(), %L, ''panaderia'', empresa_id)
        )',
      tbl, perm_name
    );
  END LOOP;
END $$;

-- Excepción: mermas.create y movimientos_inventario_mp.create usan .create
-- Excepción: ordenes_produccion puede tener .cancel en vez de .delete

-- ============================================================
-- 12. VERIFICACIÓN
-- ============================================================
SELECT '✅ Odoo roles + multi-idioma migration complete' AS resultado;
