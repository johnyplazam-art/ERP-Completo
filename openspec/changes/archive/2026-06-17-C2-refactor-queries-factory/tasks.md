# Tasks: C2 — Refactor queries.js al factory

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Migrar entidades al factory

- [x] 1.1 Migrar Ingredientes (mutations via factory, list manual por filtros dinámicos), Proveedores, Recetas, Productos, Órdenes, Mermas al factory
- [x] 1.2 Hooks especiales mantenidos fuera del factory (useCreateRecetaMutation, useCreateOrdenMutation, useUpdateOrdenEstadoMutation, useUpdateOrdenMutation, useCreateMermaMutation, useGenerarProductosFaltantesMutation, useCalculoIngredientesQuery, useRecalcularCostoMutation, useDescontarInventarioMutation, etc.)
- [x] 1.3 128 líneas eliminadas de queries.js (710 → 582)
- [x] 1.4 Build exitoso — 355 módulos, sin errores
