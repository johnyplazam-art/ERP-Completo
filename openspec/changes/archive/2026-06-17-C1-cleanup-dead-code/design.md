# Design: C1 — Limpieza de código muerto

## Technical Approach

Tres operaciones mecánicas: delete file, delete function + return entry, update import.

## Architecture Decisions

### Decision: No crear tests para esto

**Choice**: No escribir tests para el cleanup  
**Alternatives considered**: Escribir tests verificando que el código no existe  
**Rationale**: Es código muerto — verificar que no existe es overhead sin valor

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/core/composables/usePermissions.js` | Delete | Nunca importado en el proyecto |
| `src/core/store/auth.js` | Modify | Borrar función guardarIdioma() y su return |
| `src/core/components/LanguageSelector.vue` | Modify | Llamar guardarPerfil({ idioma }) en vez de guardarIdioma() |

## Testing Strategy

No requiere — cambios puramente mecánicos.

## Migration / Rollout

No migration required.

## Open Questions

None.
