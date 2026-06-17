# Proposal: Valorización de Inventario

## Intent

Los movimientos de inventario (MP y PT) no registran precio unitario, por lo que no es posible conocer el valor del stock ni el costo real de los insumos consumidos. Necesitamos agregar precio a los movimientos y mostrar valorización en las vistas de inventario.

## Scope

### In Scope
- Agregar `precio_unitario` a `movimientos_inventario_mp` y `movimientos_inventario_pt`
- Mostrar precio + valor total en MovimientosView (columnas en tabla)
- Al crear ingreso de MP, pre-cargar precio desde `ingrediente_proveedor.precio_actual` (editable)
- Al completar orden de producción, valorizar ingreso de PT desde `costo_total_estimado` de la orden
- Mostrar valor del stock actual en InventarioView
- Función SQL `stock_valorizado()` que calcule valor actual del stock

### Out of Scope
- Historial de cambios de precio en ingrediente_proveedor
- Método de valoración FIFO/LIFO (usamos PPP simple: precio al momento del ingreso)
- Ajustes contables / asientos de diario

## Capabilities

### New Capabilities
- `valorizacion-inventario`: Registro de precio unitario en movimientos de inventario y cálculo de valor de stock

### Modified Capabilities
- `calculo-costos`: La orden de producción debe valorizar el PT al completarse (nueva conexión entre módulos)

## Approach

1. **Migración SQL**: `ALTER TABLE` agregar `precio_unitario` a tablas de movimientos + función `stock_valorizado()`
2. **Trigger en orden de producción**: al completar orden, crear movimiento de PT ingreso con costo estimado
3. **Frontend MovimientosView**: columna precio y valor total + campo precio en modal de nuevo movimiento
4. **Frontend InventarioView**: mostrar valor del stock (proveniente de función SQL)
5. **Seed**: precios históricos de ejemplo en movimientos existentes (si los hay) o en nuevos

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Migración con columnas + función stock_valorizado |
| `src/modules/panaderia/composables/database.js` | Modified | Nuevas funciones para valorizar + trigger de completado |
| `src/modules/panaderia/composables/queries.js` | Modified | Query para stock valorizado |
| `src/modules/panaderia/views/MovimientosView.vue` | Modified | Columnas precio/valor + campo precio en modal |
| `src/modules/panaderia/views/InventarioView.vue` | Modified | Mostrar valor del stock |
| `src/modules/panaderia/views/ProduccionView.vue` | Modified | Al completar orden, valorizar PT |
| `src/modules/panaderia/views/OrdenFormView.vue` | Modified | Enviar costo al crear orden para usarlo al completar |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Precio `ingrediente_proveedor` puede no existir para algunos ingredientes | Medium | Precio por defecto 0 + indicador visual "Sin precio" |
| Valor del stock puede diferir del real si los precios cambiaron | Low | PPP simple es una aproximación aceptable para PYME |

## Rollback Plan

- Migración usa `ADD COLUMN IF NOT EXISTS` — reversible con `ALTER TABLE DROP COLUMN`
- Frontend es aditivo (nuevas columnas + campos), no rompe flujo existente

## Dependencies

- Migración `20260615000100_calculo_precio_automatico.sql` (ya existe) — necesitamos `ordenes_produccion.costo_total_estimado`

## Success Criteria

- [ ] MovimientosView muestra precio unitario y valor total por movimiento
- [ ] Modal de nuevo movimiento tiene campo precio (pre-cargado desde proveedor)
- [ ] Al completar orden de producción, se crea automáticamente movimiento de PT con costo
- [ ] InventarioView muestra valor total del stock
- [ ] `npm run build` sin errores
