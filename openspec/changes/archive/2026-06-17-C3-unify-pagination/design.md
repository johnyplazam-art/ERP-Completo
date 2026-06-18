# Design: C3 — Unificar paginación

## Technical Approach

Extender `usePaginatedList` con soporte opcional de `filterField`/`filterValue`, luego migrar los 3 hooks manuales a thin wrappers.

## Architecture Decisions

### Decision: Extender usePaginatedList con filtro opcional

**Choice**: Agregar `filterField` y `filterValue` opcionales a usePaginatedList  
**Alternatives considered**: Crear thin wrappers manuales que llamen a usePaginatedList y filtren después  
**Rationale**: usePaginatedList ya acepta `queryOpts` — podemos pasarle el filtro como parte de los parámetros de list/count sin tocar la firma

### Decision: useAuditLogsPaginated requiere thin wrapper

**Choice**: Crear thin wrapper que use usePaginatedList internamente  
**Alternatives considered**: Forzar useAuditLogsPaginated a usar los mismos parámetros  
**Rationale**: AuditLogs tiene estructura de retorno distinta ({ data, total }) con computed unwraps — más seguro mantener el wrapper

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/panaderia/composables/queries.js` | Modify | Migrar 3 hooks paginados |
| `src/modules/panaderia/composables/crud-factory.js` | Modify (maybe) | Extender usePaginatedList si es necesario |

## Testing Strategy

Verificar que los 3 hooks retornan exactamente la misma interfaz que antes (data, total, page, etc.).

## Migration / Rollout

No migration required. Dependencia lógica con C2 (se puede hacer antes o después, pero idealmente después).

## Open Questions

None.
