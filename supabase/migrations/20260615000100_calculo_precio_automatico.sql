-- ============================================================
-- MIGRATION: Cálculo Automático de Precios
-- Fecha: 2026-06-15
-- ============================================================

-- 1. Agregar columnas de costo a tablas existentes
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS precio_costo NUMERIC(12,4) DEFAULT 0 CHECK (precio_costo >= 0);

ALTER TABLE public.ordenes_produccion ADD COLUMN IF NOT EXISTS costo_total_estimado NUMERIC(12,4) DEFAULT 0 CHECK (costo_total_estimado >= 0);

ALTER TABLE public.orden_produccion_detalle ADD COLUMN IF NOT EXISTS costo_unitario_estimado NUMERIC(12,4) DEFAULT 0 CHECK (costo_unitario_estimado >= 0);
ALTER TABLE public.orden_produccion_detalle ADD COLUMN IF NOT EXISTS costo_total_estimado NUMERIC(12,4) DEFAULT 0 CHECK (costo_total_estimado >= 0);

-- 2. Actualizar calcular_costo_receta para que persista el resultado
CREATE OR REPLACE FUNCTION public.calcular_costo_receta(p_receta_id INT)
RETURNS NUMERIC(12,4) AS $$
DECLARE
  v_costo NUMERIC(12,4);
BEGIN
  SELECT COALESCE(SUM(
    ri.cantidad * COALESCE(
      (SELECT ip.precio_actual FROM public.ingrediente_proveedor ip
       WHERE ip.ingrediente_id = ri.ingrediente_id AND ip.es_preferido = true
       ORDER BY ip.precio_actual ASC LIMIT 1),
      (SELECT ip.precio_actual FROM public.ingrediente_proveedor ip
       WHERE ip.ingrediente_id = ri.ingrediente_id
       ORDER BY ip.precio_actual ASC LIMIT 1),
      0
    )
  ), 0) INTO v_costo
  FROM public.receta_ingredientes ri
  WHERE ri.receta_id = p_receta_id;

  UPDATE public.recetas SET costo_estimado = v_costo WHERE id = p_receta_id;

  RETURN v_costo;
END;
$$ LANGUAGE plpgsql VOLATILE;
