-- ============================================================
-- MIGRATION: Validar precios en calcular_costo_receta()
-- Fecha: 2026-06-22
-- Descripción: Modifica calcular_costo_receta() para validar que
-- TODOS los ingredientes tengan precio registrado > 0.
-- Si algún ingrediente no tiene precio, lanza EXCEPTION en vez
-- de devolver 0 silenciosamente.
--
-- Revert:
--   Re-ejecutar CREATE OR REPLACE FUNCTION de 20260615000300
-- ============================================================

CREATE OR REPLACE FUNCTION public.calcular_costo_receta(p_receta_id INT)
RETURNS NUMERIC(12,4) AS $$
DECLARE
  v_costo NUMERIC(12,4);
  v_ing_sin_precio TEXT;
BEGIN
  -- Validar que todos los ingredientes tengan precio registrado
  SELECT STRING_AGG(i.nombre, ', ')
  INTO v_ing_sin_precio
  FROM public.receta_ingredientes ri
  JOIN public.ingredientes i ON i.id = ri.ingrediente_id
  WHERE ri.receta_id = p_receta_id
    AND NOT EXISTS (
      SELECT 1 FROM public.ingrediente_proveedor ip
      WHERE ip.ingrediente_id = ri.ingrediente_id
        AND ip.precio_actual > 0
    );

  IF v_ing_sin_precio IS NOT NULL THEN
    RAISE EXCEPTION 'Ingredientes sin precio registrado: %', v_ing_sin_precio
      USING HINT = 'Registrá un precio mayor a 0 en ingrediente_proveedor para cada ingrediente antes de calcular el costo';
  END IF;

  -- Calcular costo normalmente (con conversión de unidades)
  SELECT COALESCE(SUM(
    ri.cantidad * COALESCE(
      (SELECT cu.factor_multiplicacion
       FROM public.conversiones_unidades cu
       WHERE cu.unidad_origen_id = ri.unidad_id
         AND cu.unidad_destino_id = ing.unidad_base_id),
      1
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

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'calcular_costo_receta';

SELECT '✅ Migration 004: calcular_costo_receta() now validates prices > 0' AS resultado;
