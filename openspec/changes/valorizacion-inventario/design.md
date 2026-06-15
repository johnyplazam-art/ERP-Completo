# Design: Valorización de Inventario

## Technical Approach

Agregar `precio_unitario` a las tablas de movimientos (migración SQL). Modificar `MovimientosView` para mostrar precio/valor y permitir ingresarlo. Al completar orden de producción, crear automáticamente movimiento de PT con costo.

## Architecture Decisions

### Decision: PPP simple vs FIFO/LIFO para valor de stock

**Choice**: PPP simple (precio al momento del ingreso, egresos sin ajuste).
**Alternatives considered**: FIFO, LIFO, costo promedio ponderado.
**Rationale**: PPP simple es suficiente para una PYME. No requiere trackear lotes ni orden de compras. El valor del stock es una referencia, no un dato contable auditado.

### Decision: Auto-creación de movimiento PT al completar orden

**Choice**: Hook en `updateOrdenEstado()` que al pasar a `completada` crea el movimiento.
**Alternatives considered**: Trigger SQL en `ordenes_produccion`, evento separado.
**Rationale**: El frontend ya ejecuta `updateOrdenEstado()`, es el punto natural. Un trigger SQL sería más frágil y difícil de depurar.

## Data Flow

```
Nuevo ingreso MP:
  Usuario → Modal MovimientosView → selecciona ingrediente
    → Frontend busca precio en ingrediente_proveedor (preferido)
    → Pre-carga campo precio (editable)
    → Usuario completa y guarda → INSERT con precio_unitario

Completar orden:
  Usuario → ProduccionView → "Completar"
    → updateOrdenEstado(id, 'completada')
    → Frontend calcula: precio_unitario = costo_total_estimado / cantidad_producida_sum
    → INSERT movimiento_pt con precio_unitario
    → toast + invalidate queries

Stock valorizado:
  InventarioView → llama stock_valorizado(tipo, item_id)
    → SQL: SUM(ingreso cantidad * precio) - SUM(egreso cantidad * precio_promedio)
    → Muestra: cantidad, valor_unitario_promedio, valor_total
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20260615000200_valorizacion_inventario.sql` | Create | ADD COLUMN precio_unitario + función stock_valorizado |
| `src/modules/panaderia/composables/database.js` | Modify | fetchPrecioIngrediente(), crearMovimientoPt con precio, auto-valorizar al completar orden |
| `src/modules/panaderia/composables/queries.js` | Modify | useStockValorizadoQuery() |
| `src/modules/panaderia/views/MovimientosView.vue` | Modify | Columnas precio/valor + campo precio en modal |
| `src/modules/panaderia/views/InventarioView.vue` | Modify | Columna valor del stock |
| `src/modules/panaderia/views/ProduccionView.vue` | Modify | Auto-valorizar al completar |

## Interfaces / Contracts

```js
// database.js
fetchPrecioIngrediente(ingredienteId) → Promise<number>  // desde ingrediente_proveedor.precio_actual (preferido)
crearMovimientoPt({ ...mov, precio_unitario }) → movimiento

// stock_valorizado SQL function
supabase.rpc('stock_valorizado', { p_tipo: 'MP'|'PT', p_item_id: number })
  → { cantidad_total: number, valor_total: number }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| SQL | `stock_valorizado()` con datos conocidos | Migración aplicada + consulta |
| Unit | `fetchPrecioIngrediente()` | Mock de supabase |
| Integration | Completar orden → crear movimiento PT | Flujo completo en frontend |
| Build | `npm run build` | Sin errores |

## Migration / Rollout

No migration de datos existentes. Columnas nuevas con DEFAULT 0 para movimientos existentes.

## Open Questions

- [ ] Para egresos de stock (consumo en órdenes), ¿qué precio usamos? ¿El precio del ingreso más antiguo (FIFO), el promedio, o el precio actual del proveedor? (Propongo: precio promedio ponderado simple de los ingresos disponibles)
