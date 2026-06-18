# Proposal: C2 — Refactor queries.js al factory

## Intent

Eliminar ~400 líneas de hooks manuales duplicados migrando ingredientes, proveedores, recetas, productos, órdenes y mermas a usar `createCrudHooks()` del factory, exactamente como ya hacen los catálogos.

## Scope

### In Scope
- Migrar hooks de Ingredientes (useIngredientesQuery, useCreate/Update/Delete)
- Migrar hooks de Proveedores (useProveedoresQuery, useCreate/Update/Delete)
- Migrar hooks de Recetas (useRecetasQuery, useCreate/Update/Delete)
- Migrar hooks de Productos (useProductosQuery, useCreate/Update/Delete)
- Migrar hooks de Órdenes (useOrdenesProduccionQuery, useCreate/Update/Delete/Estado)
- Migrar hooks de Mermas (useMermasQuery, useCreate/Update/Delete)
- Re-exportar con nombres originales para compatibilidad total

### Out of Scope
- Hooks especiales que no entran en el factory (useCalculoIngredientesQuery, useRecalcularCostoMutation, useDescontarInventarioMutation, etc.)
- Refactor de vistas que consumen estos hooks (la API pública no cambia)

## Capabilities

### New Capabilities
None

### Modified Capabilities
None — pure refactor, sin cambios de comportamiento.

## Approach

1. En `queries.js`, para cada entidad: crear instancia de `createCrudHooks()` con su queryKey + funciones de database.js
2. Re-exportar cada hook con su nombre original
3. Eliminar el código manual de los hooks migrados
4. Mantener los hooks especiales inalterados

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/panaderia/composables/queries.js` | Modified | Migrar ~6 grupos de hooks al factory, mantener especiales |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Romper import de alguna vista | Baja | Los re-export mantienen nombres exactos |
| Factory no cubre un caso edge | Media | Revisar si useUpdateOrdenMutation necesita lógica extra |

## Rollback Plan

Revertir el commit.

## Dependencies

Ninguna.

## Success Criteria

- [ ] Todos los hooks migrados mantienen nombres de exportación exactos
- [ ] Las vistas existentes funcionan sin cambios
- [ ] ~400 líneas eliminadas de queries.js
