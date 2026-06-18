# Tasks: C5 — TanStack Query en AdminPlanes/Suscripciones

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: AdminPlanes

- [x] 1.1 Migrar a `useQuery` para planes y apps (inline en el componente)
- [x] 1.2 Migrar mutations: guardar, toggleActivo, eliminar usando `useMutation`
- [x] 1.3 Eliminar `onMounted` — queries se disparan automáticamente
- [x] 1.4 Eliminar `cargarPlanes()` y `cargarApps()` — reemplazados por TanStack Query

## Phase 2: AdminSuscripciones

- [x] 2.1 Migrar a `useQuery` para suscripciones, planes, empresas (inline en el componente)
- [x] 2.2 Migrar mutations: crear, actualizar, cambiarEstado usando `useMutation`
- [x] 2.3 Eliminar `onMounted` — queries se disparan automáticamente
- [x] 2.4 Eliminar `cargarDatos()` — reemplazado por TanStack Query
