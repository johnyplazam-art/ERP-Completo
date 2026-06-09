-- ============================================================
-- MIGRACIÓN: Multi-Tenant (empresas) + RLS reescrito
-- Fecha: 2026-06-05
-- Descripción:
--   - Crea tabla empresas y empresa_usuarios
--   - Mueve rol de perfiles a empresa_usuarios
--   - Agrega empresa_id a tablas de negocio
--   - Reescribe RLS policies con filtro por empresa
--   - Actualiza trigger de registro
-- ============================================================

-- ============================================================
-- 0. HELPER: Función para verificar membresía en empresa
-- ============================================================
CREATE OR REPLACE FUNCTION public.usuario_en_empresa(p_empresa_id INT, p_roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.empresa_usuarios
    WHERE usuario_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND activo = true
      AND (p_roles IS NULL OR rol = ANY(p_roles))
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 1. DROP todas las RLS policies existentes
-- ============================================================

-- Policies de la migración original
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.perfiles;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.categorias_receta;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.categorias_producto;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.unidades_medida;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.conversiones_unidades;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.ingredientes;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.proveedores;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.ingrediente_proveedor;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.recetas;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.receta_ingredientes;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.productos;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.ordenes_produccion;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.orden_produccion_detalle;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.movimientos_inventario_mp;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.movimientos_inventario_pt;
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.mermas;

DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.categorias_receta;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.categorias_producto;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.unidades_medida;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.conversiones_unidades;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.proveedores;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.ingrediente_proveedor;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.receta_ingredientes;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.orden_produccion_detalle;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.movimientos_inventario_mp;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.movimientos_inventario_pt;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.mermas;

DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.ingredientes;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.ingredientes;
DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.recetas;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.recetas;
DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.productos;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.productos;
DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.ordenes_produccion;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.ordenes_produccion;

DROP POLICY IF EXISTS "Propio perfil insert" ON public.perfiles;
DROP POLICY IF EXISTS "Propio perfil update" ON public.perfiles;

-- Policies de la segunda migración (UPDATE/DELETE para catálogos e ingredientes)
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.categorias_receta;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.categorias_receta;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.categorias_producto;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.categorias_producto;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.unidades_medida;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.unidades_medida;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.conversiones_unidades;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.ingredientes;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.proveedores;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.proveedores;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.recetas;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios productos" ON public.productos;
DROP POLICY IF EXISTS "Escritura admins y produccion delete" ON public.productos;

-- ============================================================
-- 2. CREAR TABLAS MULTI-TENANT
-- ============================================================

CREATE TABLE public.empresas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.empresa_usuarios (
  id SERIAL PRIMARY KEY,
  empresa_id INT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'usuario'
    CHECK (rol IN ('admin', 'produccion', 'ventas', 'usuario')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, usuario_id)
);

CREATE INDEX idx_empresa_usuarios_usuario ON public.empresa_usuarios(usuario_id);
CREATE INDEX idx_empresa_usuarios_empresa ON public.empresa_usuarios(empresa_id);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. MIGRAR DATOS EXISTENTES
-- ============================================================

-- Guardar roles viejos antes de borrar la columna
CREATE TEMP TABLE old_roles AS SELECT id, rol FROM public.perfiles;

-- Quitar rol de perfiles
ALTER TABLE public.perfiles DROP COLUMN rol;

-- Crear empresa por defecto
INSERT INTO public.empresas (nombre, slug)
SELECT 'Mi Empresa', 'mi-empresa'
WHERE NOT EXISTS (SELECT 1 FROM public.empresas WHERE slug = 'mi-empresa');

-- Migrar usuarios existentes a empresa_usuarios
INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, rol)
SELECT 1, id, COALESCE(rol, 'usuario')
FROM old_roles
ON CONFLICT (empresa_id, usuario_id) DO NOTHING;

DROP TABLE old_roles;

-- ============================================================
-- 4. AGREGAR empresa_id A TABLAS DE NEGOCIO
-- ============================================================

ALTER TABLE public.ingredientes ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.proveedores ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ingrediente_proveedor ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.recetas ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.receta_ingredientes ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.productos ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ordenes_produccion ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.orden_produccion_detalle ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.movimientos_inventario_mp ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.movimientos_inventario_pt ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.mermas ADD COLUMN empresa_id INT NOT NULL DEFAULT 1
  REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Índices para rendimiento con empresa_id
CREATE INDEX idx_ingredientes_empresa ON public.ingredientes(empresa_id);
CREATE INDEX idx_proveedores_empresa ON public.proveedores(empresa_id);
CREATE INDEX idx_recetas_empresa ON public.recetas(empresa_id);
CREATE INDEX idx_productos_empresa ON public.productos(empresa_id);
CREATE INDEX idx_ordenes_produccion_empresa ON public.ordenes_produccion(empresa_id);

-- ============================================================
-- 5. REESCRIBIR RLS POLICIES
-- ============================================================

-- 5a. Perfiles — cada usuario ve/edita su propio perfil
CREATE POLICY "perfiles_select" ON public.perfiles FOR SELECT TO authenticated
  USING (true);  -- cualquiera puede ver perfiles (necesario para FK display)

CREATE POLICY "perfiles_insert" ON public.perfiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_update" ON public.perfiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- 5b. Empresas — select si el usuario pertenece
CREATE POLICY "empresas_select" ON public.empresas FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_usuarios
    WHERE usuario_id = auth.uid() AND empresa_id = empresas.id AND activo = true
  ));

-- 5c. Empresa usuarios — bridge SECURITY DEFINER para evitar recursion en RLS
CREATE OR REPLACE FUNCTION public.es_admin_en_empresa(p_empresa_id INT)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresa_usuarios
    WHERE usuario_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND rol = 'admin'
      AND activo = true
  );
$$ LANGUAGE sql STABLE;

CREATE POLICY "empresa_usuarios_select" ON public.empresa_usuarios FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR
    public.es_admin_en_empresa(empresa_id)
  );

CREATE POLICY "empresa_usuarios_insert" ON public.empresa_usuarios FOR INSERT TO authenticated
  WITH CHECK (public.es_admin_en_empresa(empresa_id));

CREATE POLICY "empresa_usuarios_update" ON public.empresa_usuarios FOR UPDATE TO authenticated
  USING (public.es_admin_en_empresa(empresa_id));

-- 5d. Catálogos compartidos (sin empresa_id)
-- Lectura universal para todos los autenticados
CREATE POLICY "catalogo_select" ON public.categorias_receta FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo_select" ON public.categorias_ingrediente FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo_select" ON public.categorias_producto FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo_select" ON public.unidades_medida FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo_select" ON public.conversiones_unidades FOR SELECT TO authenticated USING (true);

-- Escritura en catálogos: admin de cualquier empresa (puede mejorar después)
CREATE POLICY "catalogo_insert" ON public.categorias_receta FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_update" ON public.categorias_receta FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_delete" ON public.categorias_receta FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));

CREATE POLICY "catalogo_insert" ON public.categorias_ingrediente FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_update" ON public.categorias_ingrediente FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_delete" ON public.categorias_ingrediente FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));

CREATE POLICY "catalogo_insert" ON public.categorias_producto FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_update" ON public.categorias_producto FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_delete" ON public.categorias_producto FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));

CREATE POLICY "catalogo_insert" ON public.unidades_medida FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_update" ON public.unidades_medida FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_delete" ON public.unidades_medida FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));

CREATE POLICY "catalogo_insert" ON public.conversiones_unidades FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_update" ON public.conversiones_unidades FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));
CREATE POLICY "catalogo_delete" ON public.conversiones_unidades FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true AND rol = 'admin'));

-- 5e. Tablas con empresa_id — RLS por empresa
-- Patrón: SELECT si pertenece a la empresa, escritura si admin/produccion en esa empresa

DO $$ DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'ingredientes', 'proveedores', 'ingrediente_proveedor',
    'recetas', 'receta_ingredientes', 'productos',
    'ordenes_produccion', 'orden_produccion_detalle',
    'movimientos_inventario_mp', 'movimientos_inventario_pt', 'mermas'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format(
      'CREATE POLICY "empresa_select" ON public.%I FOR SELECT TO authenticated
        USING (public.usuario_en_empresa(empresa_id, NULL))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "empresa_insert" ON public.%I FOR INSERT TO authenticated
        WITH CHECK (public.usuario_en_empresa(empresa_id, ARRAY[''admin'', ''produccion'']))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "empresa_update" ON public.%I FOR UPDATE TO authenticated
        USING (public.usuario_en_empresa(empresa_id, NULL))
        WITH CHECK (public.usuario_en_empresa(empresa_id, ARRAY[''admin'', ''produccion'']))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "empresa_delete" ON public.%I FOR DELETE TO authenticated
        USING (public.usuario_en_empresa(empresa_id, ARRAY[''admin'', ''produccion'']))',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- 6. ACTUALIZAR TRIGGER DE REGISTRO
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id INT;
  v_invitation_code TEXT;
  v_empresa_slug TEXT;
BEGIN
  -- Insertar perfil básico
  INSERT INTO public.perfiles (id, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1))
  );

  -- Verificar si tiene código de invitación
  v_invitation_code := NEW.raw_user_meta_data->>'invitacion';

  IF v_invitation_code IS NOT NULL THEN
    -- Buscar empresa por código de invitación (slug como invitación simple)
    SELECT id INTO v_empresa_id FROM public.empresas WHERE slug = v_invitation_code AND activa = true;

    IF v_empresa_id IS NOT NULL THEN
      INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, rol)
      VALUES (v_empresa_id, NEW.id, 'usuario');
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

  INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, rol)
  VALUES (v_empresa_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger (DROP + CREATE por si ya existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. VERIFICACIÓN
-- ============================================================
SELECT '✅ Multi-tenant migration complete' AS resultado;
