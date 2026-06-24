-- ============================================================
-- MIGRATION: Unified RLS Policies — basadas en user_roles
-- Fecha: 2026-06-22
-- Descripción: Reemplaza todas las RLS policies viejas (basadas
-- en perfiles.rol) por policies que usan el nuevo sistema de
-- roles/permisos (user_roles + role_permissions).
--
-- Depende: 20260622000100_add_empresa_id.sql (necesita empresa_id)
--
-- Revert:
--   Re-ejecutar las policies de 20260605145000_modulo_panaderia.sql
-- ============================================================

-- ============================================================
-- HELPER: usuario_empresas_ids()
-- Retorna array de IDs de empresas a las que pertenece el usuario
-- ============================================================

CREATE OR REPLACE FUNCTION public.usuario_empresas_ids()
RETURNS INT[] AS $$
  SELECT ARRAY_AGG(empresa_id)
  FROM public.empresa_usuarios
  WHERE usuario_id = auth.uid() AND activo = true;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- HELPER: tiene_permiso(p_action TEXT)
-- Verifica si el usuario autenticado tiene un permiso específico
-- en la aplicación actual vía user_roles + role_permissions
-- ============================================================

CREATE OR REPLACE FUNCTION public.tiene_permiso(p_action TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.action_name = p_action
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- DROP OLD POLICIES (basadas en perfiles.rol)
-- ============================================================

-- Catálogos
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.categorias_receta;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.categorias_ingrediente;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.categorias_producto;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.unidades_medida;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.conversiones_unidades;

-- Ingredientes y Proveedores
DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.ingredientes;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.ingredientes;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.proveedores;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.ingrediente_proveedor;

-- Recetas
DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.recetas;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.recetas;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.receta_ingredientes;

-- Productos
DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.productos;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.productos;

-- Órdenes
DROP POLICY IF EXISTS "Escritura admins y produccion insert" ON public.ordenes_produccion;
DROP POLICY IF EXISTS "Escritura admins y produccion update" ON public.ordenes_produccion;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.orden_produccion_detalle;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.movimientos_inventario_mp;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.movimientos_inventario_pt;
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.mermas;

-- Perfiles
DROP POLICY IF EXISTS "Lectura universal autenticados" ON public.perfiles;
DROP POLICY IF EXISTS "Propio perfil insert" ON public.perfiles;
DROP POLICY IF EXISTS "Propio perfil update" ON public.perfiles;

-- ============================================================
-- DROP OLD UNIVERSAL READ POLICIES (reemplazadas por empresa-scoped)
-- ============================================================

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

-- ============================================================
-- NEW POLICIES
-- Patrón: SELECT → cualquier usuario de la empresa
--         INSERT/UPDATE/DELETE → usuario de la empresa + permiso
-- ============================================================

-- ─── CATÁLOGOS (globales - cualquier autenticado puede leer) ─────

CREATE POLICY "catalogos_select_universal"
  ON public.categorias_receta FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "catalogos_select_universal"
  ON public.categorias_ingrediente FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "catalogos_select_universal"
  ON public.categorias_producto FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "catalogos_select_universal"
  ON public.unidades_medida FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "catalogos_select_universal"
  ON public.conversiones_unidades FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE en catálogos requiere permiso catalogos.manage
CREATE POLICY "catalogos_insert"
  ON public.categorias_receta FOR INSERT TO authenticated
  WITH CHECK (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_update"
  ON public.categorias_receta FOR UPDATE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_delete"
  ON public.categorias_receta FOR DELETE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_insert"
  ON public.categorias_ingrediente FOR INSERT TO authenticated
  WITH CHECK (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_update"
  ON public.categorias_ingrediente FOR UPDATE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_delete"
  ON public.categorias_ingrediente FOR DELETE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_insert"
  ON public.categorias_producto FOR INSERT TO authenticated
  WITH CHECK (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_update"
  ON public.categorias_producto FOR UPDATE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_delete"
  ON public.categorias_producto FOR DELETE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_insert"
  ON public.unidades_medida FOR INSERT TO authenticated
  WITH CHECK (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_update"
  ON public.unidades_medida FOR UPDATE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_delete"
  ON public.unidades_medida FOR DELETE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_insert"
  ON public.conversiones_unidades FOR INSERT TO authenticated
  WITH CHECK (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_update"
  ON public.conversiones_unidades FOR UPDATE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

CREATE POLICY "catalogos_delete"
  ON public.conversiones_unidades FOR DELETE TO authenticated
  USING (public.tiene_permiso('catalogos.manage'));

-- ─── INGREDIENTES ───────────────────────────────────────────────

CREATE POLICY "ingredientes_select"
  ON public.ingredientes FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "ingredientes_insert"
  ON public.ingredientes FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ingredientes.create')
  );

CREATE POLICY "ingredientes_update"
  ON public.ingredientes FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ingredientes.update')
  );

CREATE POLICY "ingredientes_delete"
  ON public.ingredientes FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ingredientes.delete')
  );

-- ─── PROVEEDORES ────────────────────────────────────────────────

CREATE POLICY "proveedores_select"
  ON public.proveedores FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "proveedores_insert"
  ON public.proveedores FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('proveedores.create')
  );

CREATE POLICY "proveedores_update"
  ON public.proveedores FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('proveedores.update')
  );

CREATE POLICY "proveedores_delete"
  ON public.proveedores FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('proveedores.delete')
  );

-- ─── INGREDIENTE_PROVEEDOR ──────────────────────────────────────

CREATE POLICY "ingrediente_proveedor_select"
  ON public.ingrediente_proveedor FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "ingrediente_proveedor_insert"
  ON public.ingrediente_proveedor FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('proveedores.create')
  );

CREATE POLICY "ingrediente_proveedor_update"
  ON public.ingrediente_proveedor FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('proveedores.update')
  );

CREATE POLICY "ingrediente_proveedor_delete"
  ON public.ingrediente_proveedor FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('proveedores.delete')
  );

-- ─── RECETAS ────────────────────────────────────────────────────

CREATE POLICY "recetas_select"
  ON public.recetas FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "recetas_insert"
  ON public.recetas FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('recetas.create')
  );

CREATE POLICY "recetas_update"
  ON public.recetas FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('recetas.update')
  );

CREATE POLICY "recetas_delete"
  ON public.recetas FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('recetas.delete')
  );

-- ─── RECETA_INGREDIENTES ────────────────────────────────────────

CREATE POLICY "receta_ingredientes_select"
  ON public.receta_ingredientes FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "receta_ingredientes_insert"
  ON public.receta_ingredientes FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('recetas.create')
  );

CREATE POLICY "receta_ingredientes_update"
  ON public.receta_ingredientes FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('recetas.update')
  );

CREATE POLICY "receta_ingredientes_delete"
  ON public.receta_ingredientes FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('recetas.delete')
  );

-- ─── PRODUCTOS ──────────────────────────────────────────────────

CREATE POLICY "productos_select"
  ON public.productos FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "productos_insert"
  ON public.productos FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('productos.create')
  );

CREATE POLICY "productos_update"
  ON public.productos FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('productos.update')
  );

CREATE POLICY "productos_delete"
  ON public.productos FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('productos.delete')
  );

-- ─── ÓRDENES DE PRODUCCIÓN ──────────────────────────────────────

CREATE POLICY "ordenes_produccion_select"
  ON public.ordenes_produccion FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "ordenes_produccion_insert"
  ON public.ordenes_produccion FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ordenes.create')
  );

CREATE POLICY "ordenes_produccion_update"
  ON public.ordenes_produccion FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ordenes.update')
  );

CREATE POLICY "ordenes_produccion_delete"
  ON public.ordenes_produccion FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ordenes.delete')
  );

-- ─── ORDEN_PRODDUCCION_DETALLE ──────────────────────────────────

CREATE POLICY "orden_produccion_detalle_select"
  ON public.orden_produccion_detalle FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "orden_produccion_detalle_insert"
  ON public.orden_produccion_detalle FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ordenes.create')
  );

CREATE POLICY "orden_produccion_detalle_update"
  ON public.orden_produccion_detalle FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ordenes.update')
  );

CREATE POLICY "orden_produccion_detalle_delete"
  ON public.orden_produccion_detalle FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ordenes.delete')
  );

-- ─── MOVIMIENTOS INVENTARIO MP ─────────────────────────────────

CREATE POLICY "movimientos_mp_select"
  ON public.movimientos_inventario_mp FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "movimientos_mp_insert"
  ON public.movimientos_inventario_mp FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('movimientos.create')
  );

CREATE POLICY "movimientos_mp_update"
  ON public.movimientos_inventario_mp FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('movimientos.update')
  );

CREATE POLICY "movimientos_mp_delete"
  ON public.movimientos_inventario_mp FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('movimientos.delete')
  );

-- ─── MOVIMIENTOS INVENTARIO PT ─────────────────────────────────

CREATE POLICY "movimientos_pt_select"
  ON public.movimientos_inventario_pt FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "movimientos_pt_insert"
  ON public.movimientos_inventario_pt FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('movimientos.create')
  );

CREATE POLICY "movimientos_pt_update"
  ON public.movimientos_inventario_pt FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('movimientos.update')
  );

CREATE POLICY "movimientos_pt_delete"
  ON public.movimientos_inventario_pt FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('movimientos.delete')
  );

-- ─── MERMAS ─────────────────────────────────────────────────────

CREATE POLICY "mermas_select"
  ON public.mermas FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));

CREATE POLICY "mermas_insert"
  ON public.mermas FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('mermas.create')
  );

CREATE POLICY "mermas_update"
  ON public.mermas FOR UPDATE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('mermas.update')
  );

CREATE POLICY "mermas_delete"
  ON public.mermas FOR DELETE TO authenticated
  USING (
    empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('mermas.delete')
  );

-- ─── PERFILES (propio usuario + platform_admin) ─────────────────

CREATE POLICY "perfiles_select"
  ON public.perfiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "perfiles_insert_propio"
  ON public.perfiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_update_propio"
  ON public.perfiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_delete_admin"
  ON public.perfiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND is_platform_admin = true
    )
  );

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN (
  'categorias_receta', 'categorias_ingrediente', 'categorias_producto',
  'unidades_medida', 'conversiones_unidades',
  'ingredientes', 'proveedores', 'ingrediente_proveedor',
  'recetas', 'receta_ingredientes', 'productos',
  'ordenes_produccion', 'orden_produccion_detalle',
  'movimientos_inventario_mp', 'movimientos_inventario_pt',
  'mermas', 'perfiles'
)
ORDER BY tablename, cmd;

SELECT '✅ Migration 002: Unified RLS policies applied' AS resultado;
