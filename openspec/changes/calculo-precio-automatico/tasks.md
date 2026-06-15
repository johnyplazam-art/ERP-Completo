# Tasks: Cálculo Automático de Precios

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~275 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Migración SQL

- [x] 1.1 Crear `supabase/migrations/20260615_calculo_precio_automatico.sql`:
  - `ALTER TABLE productos ADD COLUMN precio_costo NUMERIC(12,4) DEFAULT 0`
  - `ALTER TABLE ordenes_produccion ADD COLUMN costo_total_estimado NUMERIC(12,4) DEFAULT 0`
  - `ALTER TABLE orden_produccion_detalle ADD COLUMN costo_unitario_estimado NUMERIC(12,4) DEFAULT 0`
  - `ALTER TABLE orden_produccion_detalle ADD COLUMN costo_total_estimado NUMERIC(12,4) DEFAULT 0`
  - Actualizar `calcular_costo_receta()` para que persista el resultado en `recetas.costo_estimado`

## Phase 2: Backend (database.js + queries.js)

- [x] 2.1 En `database.js`: agregar `calcularCostoRecetaRPC(recetaId)` → `supabase.rpc('calcular_costo_receta', { p_receta_id })`
- [x] 2.2 En `database.js`: agregar `calcularCostoProducto(recetaId, productoId)` — cliente-side, multiplica costo_estimado × peso/rendimiento
- [x] 2.3 En `queries.js`: agregar `useRecalcularCostoMutation()` que llama RPC + invalida queries de recetas

## Phase 3: Frontend — RecetaFormView

- [x] 3.1 Agregar campo `costo_estimado` read-only abajo de la lista de ingredientes
- [x] 3.2 Agregar botón "Recalcular costo" que ejecuta `useRecalcularCostoMutation`
- [x] 3.3 Mostrar el costo con formato moneda y tooltip "Calculado desde precios de proveedores"

## Phase 4: Frontend — ProductoFormView

- [x] 4.1 Agregar campo `precio_costo` read-only, visible solo si hay `receta_id` seleccionada
- [x] 4.2 Calcular `precio_costo` al seleccionar/cambiar receta, usando `calcularCostoProducto()`
- [x] 4.3 Auto-sugerir `precio_venta = precio_costo × 1.3` solo si el campo está vacío o es 0

## Phase 5: Frontend — Órdenes de Producción

- [x] 5.1 En `OrdenFormView`: mostrar costo por línea en tabla de detalles (read-only)
- [x] 5.2 En `OrdenFormView`: mostrar "Costo total estimado" al pie de la tabla
- [x] 5.3 Calcular costos reactivamente al cambiar cantidad_programada o producto
- [x] 5.4 En `createOrdenProduccion()` de `database.js`: persistir `costo_unitario_estimado` y `costo_total_estimado`
- [x] 5.5 En `ProduccionView`: mostrar `costo_total_estimado` en detalle de orden

## Phase 6: Seed Data

- [x] 6.1 En `seed.sql`: agregar 5 proveedores + 20 registros en `ingrediente_proveedor` con precios realistas

## Phase 7: Verificación

- [x] 7.1 `npm run build` sin errores (350 módulos, 4.91s)
