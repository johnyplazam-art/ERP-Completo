-- ============================================================
-- MIGRATION: RPC completar_orden() — transacción atómica
-- Fecha: 2026-06-22
-- Descripción: Reemplaza la lógica de cambiarEstado() del frontend
-- con un RPC que ejecuta todo en una sola transacción:
--   1. Descontar ingredientes del inventario MP
--   2. Actualizar estado a 'completada'
--   3. Crear movimientos de ingreso en PT
--
-- Depende: 20260622000100_add_empresa_id.sql (necesita empresa_id)
--
-- Revert:
--   DROP FUNCTION IF EXISTS public.completar_orden;
-- ============================================================

CREATE OR REPLACE FUNCTION public.completar_orden(p_orden_id INT)
RETURNS JSONB AS $$
DECLARE
  v_orden RECORD;
  v_detalle RECORD;
  v_ingrediente RECORD;
  v_empresa_id INT;
  v_usuario_id UUID;
  v_cantidad_total NUMERIC;
  v_unidad_base_id INT;
  v_costo_linea NUMERIC;
BEGIN
  -- 1. Validar usuario autenticado
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- 2. Lock the orden row FOR UPDATE (previene race conditions)
  SELECT * INTO v_orden
  FROM public.ordenes_produccion
  WHERE id = p_orden_id AND estado = 'en_proceso'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Orden no encontrada o no está en proceso'
    );
  END IF;

  v_empresa_id := v_orden.empresa_id;

  -- 3. Procesar cada detalle de la orden: descontar MP y crear ingreso PT
  FOR v_detalle IN
    SELECT * FROM public.orden_produccion_detalle
    WHERE orden_id = p_orden_id
  LOOP
    -- 3a. Obtener ingredientes necesarios para este detalle (desde receta)
    --     Usamos calcular_costo_receta como helper; los ingredientes se
    --     descuentan según receta_ingredientes escalado por cantidad
    FOR v_ingrediente IN
      SELECT
        ri.ingrediente_id,
        i.nombre AS ing_nombre,
        ri.cantidad AS cantidad_receta,
        ri.unidad_id,
        i.unidad_base_id,
        r.rendimiento_cantidad,
        COALESCE(cu.factor_multiplicacion, 1) AS factor_conv
      FROM public.receta_ingredientes ri
      JOIN public.ingredientes i ON i.id = ri.ingrediente_id
      JOIN public.recetas r ON r.id = v_detalle.receta_id
      LEFT JOIN public.conversiones_unidades cu
        ON cu.unidad_origen_id = ri.unidad_id
        AND cu.unidad_destino_id = i.unidad_base_id
      WHERE ri.receta_id = v_detalle.receta_id
    LOOP
      -- Escalar cantidad según producción vs rendimiento
      IF v_ingrediente.rendimiento_cantidad > 0 THEN
        v_cantidad_total := v_ingrediente.cantidad_receta
          * (v_detalle.cantidad_programada * COALESCE(
              (SELECT peso_unitario_gr FROM public.productos WHERE id = v_detalle.producto_id),
              0
            ) / v_ingrediente.rendimiento_cantidad)
          * v_ingrediente.factor_conv;

        -- Obtener unidad_base_id del ingrediente
        SELECT unidad_base_id INTO v_unidad_base_id
        FROM public.ingredientes
        WHERE id = v_ingrediente.ingrediente_id;

        -- Crear movimiento de egreso en MP
        INSERT INTO public.movimientos_inventario_mp (
          ingrediente_id, tipo, cantidad, unidad_id, fecha,
          motivo, orden_detalle_id, nota, creado_por, empresa_id
        ) VALUES (
          v_ingrediente.ingrediente_id,
          'egreso',
          -v_cantidad_total,
          v_unidad_base_id,
          now(),
          'Consumo orden #' || p_orden_id,
          v_detalle.id,
          'Consumo automático al completar orden',
          v_usuario_id,
          v_empresa_id
        );
      END IF;
    END LOOP;

    -- 3b. Crear movimiento de ingreso en PT
    IF v_detalle.cantidad_producida > 0 THEN
      v_costo_linea := COALESCE(v_detalle.costo_unitario_estimado, 0);

      INSERT INTO public.movimientos_inventario_pt (
        producto_id, tipo, cantidad, fecha, precio_unitario,
        orden_detalle_id, nota, creado_por, empresa_id
      ) VALUES (
        v_detalle.producto_id,
        'ingreso',
        v_detalle.cantidad_producida,
        now(),
        v_costo_linea,
        v_detalle.id,
        'Auto: orden #' || p_orden_id,
        v_usuario_id,
        v_empresa_id
      );
    END IF;
  END LOOP;

  -- 4. Actualizar estado de la orden
  UPDATE public.ordenes_produccion
  SET estado = 'completada',
      fecha_fin = now()
  WHERE id = p_orden_id;

  RETURN jsonb_build_object(
    'success', true,
    'orden_id', p_orden_id,
    'mensaje', 'Orden completada exitosamente'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', CASE WHEN SQLSTATE IS NOT NULL THEN SQLSTATE ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'completar_orden';

SELECT '✅ Migration 003: RPC completar_orden() created' AS resultado;
