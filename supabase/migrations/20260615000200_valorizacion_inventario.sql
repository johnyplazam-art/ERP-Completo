-- ============================================================
-- MIGRATION: Valorización de Inventario
-- Fecha: 2026-06-15
-- ============================================================

ALTER TABLE public.movimientos_inventario_mp ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(12,4) DEFAULT 0 CHECK (precio_unitario >= 0);
ALTER TABLE public.movimientos_inventario_pt ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(12,4) DEFAULT 0 CHECK (precio_unitario >= 0);

CREATE OR REPLACE FUNCTION public.stock_valorizado(p_tipo TEXT, p_item_id INT)
RETURNS TABLE(cantidad_total NUMERIC, valor_total NUMERIC, precio_promedio NUMERIC) AS $$
DECLARE
  v_ing_cant NUMERIC;
  v_ing_valor NUMERIC;
  v_neto NUMERIC;
BEGIN
  IF p_tipo = 'MP' THEN
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad * COALESCE(precio_unitario, 0) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad WHEN tipo = 'egreso' THEN -cantidad ELSE 0 END), 0)
    INTO v_ing_cant, v_ing_valor, v_neto
    FROM public.movimientos_inventario_mp
    WHERE ingrediente_id = p_item_id;
  ELSE
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad * COALESCE(precio_unitario, 0) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad WHEN tipo = 'egreso' THEN -cantidad ELSE 0 END), 0)
    INTO v_ing_cant, v_ing_valor, v_neto
    FROM public.movimientos_inventario_pt
    WHERE producto_id = p_item_id;
  END IF;

  RETURN QUERY SELECT
    v_neto,
    CASE WHEN v_ing_cant > 0 THEN ROUND((v_ing_valor / v_ing_cant) * v_neto, 4) ELSE 0 END,
    CASE WHEN v_ing_cant > 0 THEN ROUND(v_ing_valor / v_ing_cant, 4) ELSE 0 END;
END;
$$ LANGUAGE plpgsql STABLE;
