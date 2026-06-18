# Design: C2 — Refactor queries.js al factory

## Technical Approach

Por cada entidad, crear instancia de `createCrudHooks()` con su queryKey + funciones de database.js, y re-exportar con nombre original. Mantener hooks especiales inalterados.

## Architecture Decisions

### Decision: Migrar entidades una por una

**Choice**: Migrar cada entidad completa (list, create, update, delete) en un solo cambio  
**Alternatives considered**: Migrar solo list primero, luego mutations  
**Rationale**: El factory ya está probado con los catálogos; migrar todo de una es más limpio

### Decision: Mantener hooks con lógica extra fuera del factory

**Choice**: No forzar entidades con lógica especial dentro del factory  
**Alternatives considered**: Extender el factory con callbacks  
**Rationale**: useCreateRecetaMutation y useCreateOrdenMutation tienen lógica extra (creado_por, auto-crear producto) — mantenerlas fuera evita romper el patrón simple del factory

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/panaderia/composables/queries.js` | Modify | Migrar ~6 grupos al factory, ~400 líneas eliminadas |

## Interfaces / Contracts

No cambia la API pública. Todos los exports mantienen nombre exacto.

## Testing Strategy

Confiar en que los tests existentes pasan. Las vistas importan estos hooks por nombre — si el nombre no cambia, no se rompe nada.

## Migration / Rollout

No migration required.

## Open Questions

None.
