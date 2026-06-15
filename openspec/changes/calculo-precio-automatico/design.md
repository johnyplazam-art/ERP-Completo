# Design: Cálculo Automático de Precios

## Technical Approach

3 capas de costo con datos servidos vía Supabase RPC + queries Vue Query 5. La migración SQL agrega columnas y funciones. El frontend muestra costos como read-only con botón de recálculo manual.

## Architecture Decisions

### Decision: RPC vs función cliente-side para costo de receta

**Choice**: SQL function `calcular_costo_receta()` ya existe — exponer via `supabase.rpc()`.
**Alternatives considered**: Reescribir cliente-side como `calcularIngredientesNecesarios()`.
**Rationale**: La función ya está en DB, es simple, y al ejecutarse en PostgreSQL tiene acceso directo a los datos sin múltiples viajes HTTP. La limitación de unit conversion se documenta como known issue — para recetas donde ingredientes y precios usan la misma unidad funciona correctamente.

### Decision: Trigger vs recálculo manual para costo de receta

**Choice**: Sólo recálculo manual (botón "Recalcular costo").
**Alternatives considered**: Trigger AFTER UPDATE en `ingrediente_proveedor`.
**Rationale**: Trigger propagaría cambios de precio a todas las recetas automáticamente, pero (1) `calcular_costo_receta()` no maneja unit conversion y (2) precio de ingrediente puede cambiar sin que quieras actualizar costos de recetas históricas. El botón manual da control al usuario. Se puede agregar trigger después si es necesario.

### Decision: `precio_costo` como columna persistida vs calculada en vuelo

**Choice**: Columna persistida `productos.precio_costo`, actualizada vía RPC.
**Alternatives considered**: `GENERATED ALWAYS AS`, calculada en frontend cada vez.
**Rationale**: Columna persistida permite ordenar/filtrar en listas (ProduccionView), evita recalcular cada vez que se carga un producto, y el recálculo manual controla cuándo se actualiza.

### Decision: Costo de orden visible como computed en frontend vs persistido

**Choice**: `costo_total_estimado` persistido en `ordenes_produccion`, calculado al crear/actualizar la orden.
**Alternatives considered**: Computado en frontend desde detalles + query a productos.
**Rationale**: Persistido permite mostrar en listas (ProduccionView) sin joins complejos. Se calcula al guardar la orden.

## Data Flow

```
Usuario → [Botón Recalcular] → supabase.rpc('calcular_costo_receta', { p_receta_id })
  → PostgreSQL calcula SUM(cantidad × precio_actual)
  → UPDATE recetas SET costo_estimado = resultado
  → Respuesta al frontend → invalidate queryKey → UI actualizada

Usuario → [Crear/Editar Producto]
  → Si receta_id presente: costo_estimado × (peso_unitario_gr / rendimiento_en_gramos)
  → UPDATE productos SET precio_costo = resultado, precio_venta = sugerencia (si vacío)

Usuario → [Crear Orden]
  → Por cada detalle: cantidad_programada × producto.precio_costo = costo_unitario_estimado
  → INSERT ordenes_produccion + detalles con costos calculados
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20260615_calculo_precio_automatico.sql` | Create | Nuevas columnas + funciones RPC |
| `src/modules/panaderia/composables/database.js` | Modify | RPC calls: `calcularCostoReceta`, `calcularCostoProducto` |
| `src/modules/panaderia/composables/queries.js` | Modify | Query keys + hooks: `useCostoRecetaQuery`, `useRecalcularCostoMutation` |
| `src/modules/panaderia/views/RecetaFormView.vue` | Modify | Read-only `costo_estimado` + botón recalcular |
| `src/modules/panaderia/views/ProductoFormView.vue` | Modify | Read-only `precio_costo` + auto-suggest `precio_venta` |
| `src/modules/panaderia/views/OrdenFormView.vue` | Modify | Mostrar costo por línea + total |
| `src/modules/panaderia/views/ProduccionView.vue` | Modify | Columna `costo_total_estimado` en tabla |
| `supabase/seed.sql` | Modify | Registros en `ingrediente_proveedor` con precios |

## Interfaces / Contracts

```js
// database.js — nuevos RPCs
supabase.rpc('calcular_costo_receta', { p_receta_id: number }) → { data: number, error }

// Calcular costo de producto (cliente-side, en database.js)
function calcularCostoProducto(recetaId, productId) → Promise<number>
  // 1. fetch receta (costo_estimado, rendimiento_en_gramos)
  // 2. fetch producto (peso_unitario_gr)
  // 3. return receta.costo_estimado * (producto.peso_unitario_gr / receta.rendimiento_en_gramos)

// queries.js — nuevos hooks
useCostoRecetaQuery(recetaId) → { data, isLoading }
useRecalcularCostoMutation() → { mutateAsync }

// OrdenFormView — estructura de detalle extendida
{
  ...detalle,
  costo_unitario_estimado: number // calculado al guardar
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| SQL | `calcular_costo_receta()` con datos conocidos | Migración aplicada + consulta manual |
| Unit | `calcularCostoProducto()` en database.js | Test con mock de supabase |
| Integration | Recalcular costo → UI actualizada | Vue Query + componente |
| Build | `npm run build` | Sin errores de compilación |

## Migration / Rollout

No migration de datos existentes requerida. Seed data se agrega a `seed.sql` existente. Migración SQL usa `ALTER TABLE ADD COLUMN IF NOT EXISTS` para ser idempotente.

## Open Questions

- [ ] Unit conversion en `calcular_costo_receta()`: si un ingrediente se compra por kg pero la receta usa gramos, el cálculo en SQL directo falla. ¿Aceptamos la limitación o extendemos la función SQL con joins a conversiones_unidades?
