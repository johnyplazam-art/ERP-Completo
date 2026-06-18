# Tasks: C3 — Unificar paginación

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Migrar hooks paginados

- [x] 1.1 Migrar `useMovimientosMpPaginated` a thin wrapper sobre usePaginatedList
- [x] 1.2 Migrar `useMovimientosPtPaginated` a thin wrapper sobre usePaginatedList
- [x] 1.3 Simplificar `useAuditLogsPaginated` (mantiene patrón propio: single query con count exact, computed unwraps, pageSize 50)
- [x] 1.4 Bugfix: `useAuditLogsPaginated` ahora pasa filters + paginación a `fetchAuditLogs` (antes solo pasaba undefined, los filtros nunca se aplicaban)
- [x] 1.5 Build exitoso — 355 módulos, sin errores
