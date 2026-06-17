# Proposal: Cálculo Automático de Precios

## Intent

Los costos de recetas están hardcodeados en seed data sin relación con precios reales de ingredientes. Productos no tienen precio de costo. Órdenes de producción no registran costos. Necesitamos un sistema automático de 3 capas que calcule costos desde el precio de ingredientes hasta la orden de producción.

## Scope

### In Scope
- Capa 1: Cálculo automático de costo de receta desde `ingrediente_proveedor.precio_actual`
- Capa 2: Costo de producto derivado del costo de receta + peso/rendimiento
- Capa 3: Costo estimado de orden de producción desde costo de producto × cantidad
- UI para visualizar costos en formularios de receta, producto y orden
- Seed data de `ingrediente_proveedor` para que los cálculos tengan base real

### Out of Scope
- Costo real de orden de producción (consumo real de insumos vs. estimado)
- Integración con contabilidad / asientos de diario
- Histórico de cambios de precio

## Capabilities

### New Capabilities
- `calculo-costos`: Cálculo automático de costos en 3 capas (recetas → productos → órdenes de producción)

### Modified Capabilities
- None

## Approach

1. **Migración SQL**: Nueva migración con `precio_costo` en productos, columnas de costo en órdenes, y trigger `recalcular_costo_receta` que se dispare al cambiar `ingrediente_proveedor.precio_actual`
2. **Backend**: Exponer `calcular_costo_receta()` via Supabase RPC; crear `calcular_costo_producto()` y `calcular_costo_orden()`
3. **Frontend**: Queries con TanStack Vue Query 5 para obtener costos calculados; mostrar en RecetaFormView (read-only), ProductoFormView (read-only + auto-suggest precio_venta), OrdenFormView (costo total)
4. **Seed**: Poblar `ingrediente_proveedor` con datos realistas para demostración

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Migración 20260615_calculo_precio_automatico.sql |
| `src/modules/panaderia/composables/database.js` | Modified | RPC calls para calcular costos |
| `src/modules/panaderia/composables/queries.js` | Modified | Queries de costo para cada capa |
| `src/modules/panaderia/views/RecetaFormView.vue` | Modified | Read-only costo_estimado + recalcular |
| `src/modules/panaderia/views/ProductoFormView.vue` | Modified | precio_costo + auto-suggest precio_venta |
| `src/modules/panaderia/views/OrdenFormView.vue` | Modified | Costo total estimado |
| `src/modules/panaderia/views/ProduccionView.vue` | Modified | Columna costo en tabla |
| `supabase/seed.sql` | Modified | Datos de ingrediente_proveedor |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unit conversion mismatch (receta usa "unidad", precio es por "gramo") | High | Capa 1 usa SQL directo sin conversión; documentar limitación y migrar a función cliente-side similar a `calcularIngredientesNecesarios()` |
| Costos en 0 si no hay ingrediente_proveedor | Medium | Seed data resuelve para demo; UI debe mostrar "Sin datos de precio" |

## Rollback Plan

- Migración SQL: `DROP FUNCTION IF EXISTS` + `ALTER TABLE ... DROP COLUMN` reversibles
- Frontend: Los cambios son aditivos (nuevos campos read-only + queries), no rompen flujo existente
- Seed: Simplemente no ejecutar o revertir con DELETE

## Dependencies

- Ninguna externa. Depende de `ingrediente_proveedor` ya existente en esquema.

## Success Criteria

- [ ] `calcular_costo_receta()` devuelve valor > 0 para recetas con ingredientes que tienen precio
- [ ] ProductoFormView muestra `precio_costo` calculado desde la receta
- [ ] OrdenFormView muestra costo total estimado basado en productos × cantidad
- [ ] Seed data poblada con precios realistas de proveedores
- [ ] `npm run build` exitoso
