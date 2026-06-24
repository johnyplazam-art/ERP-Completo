-- ============================================================
-- MIGRATION: Add empresa_id to all panadería tables
-- Fecha: 2026-06-22
-- Descripción: Agrega multi-tenancy real al módulo panadería.
-- Todas las tablas obtienen empresa_id con FK a empresas.
--
-- Revert:
--   ALTER TABLE public.ingredientes DROP COLUMN IF EXISTS empresa_id;
--   ALTER TABLE public.proveedores DROP COLUMN IF EXISTS empresa_id;
--   ... (same for all tables)
-- ============================================================

-- ============================================================
-- STEP 1: ADD COLUMN (nullable first)
-- ============================================================

ALTER TABLE public.ingredientes ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.ingrediente_proveedor ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.recetas ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.receta_ingredientes ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.ordenes_produccion ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.orden_produccion_detalle ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.movimientos_inventario_mp ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.movimientos_inventario_pt ADD COLUMN IF NOT EXISTS empresa_id INT;
ALTER TABLE public.mermas ADD COLUMN IF NOT EXISTS empresa_id INT;

-- ============================================================
-- STEP 2: BACKFILL — asignar empresa por defecto (ID = 1)
-- ============================================================

UPDATE public.ingredientes SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.proveedores SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.ingrediente_proveedor SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.recetas SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.receta_ingredientes SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.productos SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.ordenes_produccion SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.orden_produccion_detalle SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.movimientos_inventario_mp SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.movimientos_inventario_pt SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE public.mermas SET empresa_id = 1 WHERE empresa_id IS NULL;

-- ============================================================
-- STEP 3: SET NOT NULL
-- ============================================================

ALTER TABLE public.ingredientes ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.proveedores ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.ingrediente_proveedor ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.recetas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.receta_ingredientes ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.productos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.ordenes_produccion ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.orden_produccion_detalle ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.movimientos_inventario_mp ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.movimientos_inventario_pt ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.mermas ALTER COLUMN empresa_id SET NOT NULL;

-- ============================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================

ALTER TABLE public.ingredientes
  ADD CONSTRAINT fk_ingredientes_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.proveedores
  ADD CONSTRAINT fk_proveedores_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.ingrediente_proveedor
  ADD CONSTRAINT fk_ingrediente_proveedor_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.recetas
  ADD CONSTRAINT fk_recetas_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.receta_ingredientes
  ADD CONSTRAINT fk_receta_ingredientes_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.productos
  ADD CONSTRAINT fk_productos_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.ordenes_produccion
  ADD CONSTRAINT fk_ordenes_produccion_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.orden_produccion_detalle
  ADD CONSTRAINT fk_orden_produccion_detalle_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.movimientos_inventario_mp
  ADD CONSTRAINT fk_movimientos_mp_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.movimientos_inventario_pt
  ADD CONSTRAINT fk_movimientos_pt_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.mermas
  ADD CONSTRAINT fk_mermas_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;

-- ============================================================
-- STEP 5: ADD INDEXES on empresa_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ingredientes_empresa ON public.ingredientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa ON public.proveedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ingrediente_proveedor_empresa ON public.ingrediente_proveedor(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recetas_empresa ON public.recetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_empresa ON public.receta_ingredientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_productos_empresa ON public.productos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_produccion_empresa ON public.ordenes_produccion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orden_produccion_detalle_empresa ON public.orden_produccion_detalle(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_mp_empresa ON public.movimientos_inventario_mp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_pt_empresa ON public.movimientos_inventario_pt(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mermas_empresa ON public.mermas(empresa_id);

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'ingredientes', 'proveedores', 'ingrediente_proveedor',
    'recetas', 'receta_ingredientes', 'productos',
    'ordenes_produccion', 'orden_produccion_detalle',
    'movimientos_inventario_mp', 'movimientos_inventario_pt', 'mermas'
  )
  AND column_name = 'empresa_id'
ORDER BY table_name;

SELECT '✅ Migration 001: empresa_id added to all panadería tables' AS resultado;
