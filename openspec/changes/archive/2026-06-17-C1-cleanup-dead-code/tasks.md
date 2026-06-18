# Tasks: C1 — Limpieza de código muerto

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~20 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Eliminar código muerto

- [ ] 1.1 Eliminar archivo `src/core/composables/usePermissions.js`
- [ ] 1.2 En `src/core/store/auth.js`: borrar función `guardarIdioma()` (líneas 352-364) y su entrada en el return (línea 442)
- [ ] 1.3 En `src/core/components/LanguageSelector.vue`: cambiar `authStore.guardarIdioma(code)` por `authStore.guardarPerfil({ idioma: code })`
