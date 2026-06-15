# Tasks: Valorización de Inventario

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Migración SQL

- [ ] 1.1 Crear `supabase/migrations/20260615000200_valorizacion_inventario.sql`:
  - `ALTER TABLE movimientos_inventario_mp ADD COLUMN precio_unitario NUMERIC(12,4) DEFAULT 0`
  - `ALTER TABLE movimientos_inventario_pt ADD COLUMN precio_unitario NUMERIC(12,4) DEFAULT 0`
  - Función `stock_valorizado(p_tipo TEXT, p_item_id INT)` que devuelve `{ cantidad_total, valor_total }`

## Phase 2: Backend (database.js + queries.js)

- [ ] 2.1 En `database.js`: agregar `fetchPrecioIngrediente(ingredienteId)` — consulta `ingrediente_proveedor` para precio preferido
- [ ] 2.2 En `database.js`: modificar `crearMovimientoPt()` para aceptar y persistir `precio_unitario`
- [ ] 2.3 En `queries.js`: agregar `useStockValorizadoQuery(tipo, itemId)` que llama RPC `stock_valorizado`

## Phase 3: MovimientosView — columna precio/valor + modal

- [ ] 3.1 En tabla de movimientos MP: agregar columna "Precio unit." y "Valor total" (cantidad × precio)
- [ ] 3.2 En tabla de movimientos PT: idem
- [ ] 3.3 En modal de nuevo movimiento MP: agregar campo "Precio unitario" con pre-carga desde `fetchPrecioIngrediente()`
- [ ] 3.4 Guardar `precio_unitario` al crear movimiento

## Phase 4: Auto-valorización PT al completar orden

- [ ] 4.1 En `ProduccionView.cambiarEstado()`: al pasar a `completada`, calcular precio_unitario desde `costo_total_estimado / cantidad_producida`
- [ ] 4.2 Crear movimiento de PT ingreso con ese precio_unitario
- [ ] 4.3 Invalidar queries de inventario PT

## Phase 5: InventarioView — valor del stock

- [ ] 5.1 Agregar columna "Valor stock" en tabla de inventario, usando `useStockValorizadoQuery()`

## Phase 6: Verificación

- [ ] 6.1 `npm run build` sin errores
