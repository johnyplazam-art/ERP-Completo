# Tasks: C4 — Unificar gestión de usuarios

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Reemplazar SQL directo por authStore

- [ ] 1.1 Reemplazar `cargarPanaderiaAppId()` manual por `authStore.getAppId('panaderia')`
- [ ] 1.2 Reemplazar fetch de membresías + roles + emails por `authStore.cargarUsuariosMultiEmpresa(empresaId)`
- [ ] 1.3 Reemplazar mutations directas (cambiarRol, toggleActivo, removerUsuario) por las del store
- [ ] 1.4 Eliminar import de `supabase` si ya no se usa
