-- ============================================================
-- MIGRATION: Fix calcular_costo_receta — unit conversion bug
-- Fecha: 2026-06-15
-- 
-- El bug: la función multiplicaba ri.cantidad * ip.precio_actual
-- sin convertir la unidad de la receta (ej: gramo) a la unidad
-- base del ingrediente (ej: kilogramo).
--
-- Ej: 1000g de harina × $1.20/kg daba $1200 en vez de $1.20
-- ============================================================

CREATE OR REPLACE FUNCTION public.calcular_costo_receta(p_receta_id INT)
RETURNS NUMERIC(12,4) AS $$
DECLARE
  v_costo NUMERIC(12,4);
BEGIN
  SELECT COALESCE(SUM(
    -- Convertir cantidad de la receta a la unidad base del ingrediente
    ri.cantidad * COALESCE(
      (SELECT cu.factor_multiplicacion
       FROM public.conversiones_unidades cu
       WHERE cu.unidad_origen_id = ri.unidad_id
         AND cu.unidad_destino_id = ing.unidad_base_id),
      1  -- si no hay conversión (misma unidad o no encontrada), asume 1:1
    ) * COALESCE(
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
  JOIN public.ingredientes ing ON ing.id = ri.ingrediente_id
  WHERE ri.receta_id = p_receta_id;

  UPDATE public.recetas SET costo_estimado = v_costo WHERE id = p_receta_id;

  RETURN v_costo;
END;
$$ LANGUAGE plpgsql VOLATILE;
