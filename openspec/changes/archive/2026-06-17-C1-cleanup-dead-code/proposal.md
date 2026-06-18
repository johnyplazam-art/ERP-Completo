# Proposal: C1 — Limpieza de código muerto

## Intent

Eliminar código muerto que infla la base sin aportar valor: `usePermissions.js` (nunca importado) y `guardarIdioma()` (redundante con `guardarPerfil()`).

## Scope

### In Scope
- Eliminar `src/core/composables/usePermissions.js` completo
- Eliminar función `guardarIdioma()` de `src/core/store/auth.js`
- Eliminar `guardarIdioma` del return del store
- Actualizar `LanguageSelector.vue` para usar `guardarPerfil({ idioma })`

### Out of Scope
- Tests unitarios que referencian `guardarIdioma` (se actualizan aparte)
- Cualquier cambio funcional

## Capabilities

### New Capabilities
None

### Modified Capabilities
None — pure refactor/cleanup, sin cambios de comportamiento.

## Approach

1. Borrar el archivo `usePermissions.js`
2. En `auth.js`: borrar función `guardarIdioma()`, borrar del return
3. En `LanguageSelector.vue`: cambiar `authStore.guardarIdioma(code)` por `authStore.guardarPerfil({ idioma: code })`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/core/composables/usePermissions.js` | Removed | Archivo completo eliminado |
| `src/core/store/auth.js` | Modified | Borrar función + return de guardarIdioma |
| `src/core/components/LanguageSelector.vue` | Modified | Usar guardarPerfil en vez de guardarIdioma |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Olvidar sacar del return del store | Baja | Revisar diff antes de commit |
| Algo más importe guardarIdioma | Baja | grep confirmó que solo LanguageSelector lo usa |

## Rollback Plan

Revertir el commit.

## Dependencies

Ninguna.

## Success Criteria

- [ ] No existe `usePermissions.js` en el repo
- [ ] `guardarIdioma` no existe en auth store ni es llamado por ningún componente
- [ ] LanguageSelector funciona correctamente al cambiar idioma
