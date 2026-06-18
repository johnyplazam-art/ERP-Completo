# Proposal: C3 — Unificar paginación

## Intent

Eliminar 3 implementaciones manuales de paginación que duplican `usePaginatedList()` del factory.

## Scope

### In Scope
- Migrar `useMovimientosMpPaginated` a usar `usePaginatedList` (con filtro por ingrediente_id)
- Migrar `useMovimientosPtPaginated` a usar `usePaginatedList` (con filtro por producto_id)
- Migrar `useAuditLogsPaginated` a usar `usePaginatedList` (con filtros adicionales)

### Out of Scope
- Refactor de vistas que consumen estos hooks
- Cambiar la API pública de los hooks paginados

## Approach

1. Evaluar si `usePaginatedList` necesita un parámetro extra de filtro (`itemId`) para movimientos
2. Si es necesario, extender `usePaginatedList` o crear thin wrappers
3. Migrar cada hook manual manteniendo interfaz exacta de retorno
4. Eliminar ~100 líneas de código duplicado

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/panaderia/composables/queries.js` | Modified | Migrar 3 hooks paginados al factory |
| `src/modules/panaderia/composables/crud-factory.js` | Modified (maybe) | Extender usePaginatedList si necesita soporte de filtro |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| usePaginatedList no soporta itemId filter | Media | Extender factory con opts.filterField |
| Interfaz de retorno distinta | Baja | Comparar struct de retorno de cada hook |

## Rollback Plan

Revertir el commit.

## Dependencies

C2 recomendado antes (para tener factory completo y consistente).

## Success Criteria

- [ ] Los 3 hooks paginados usan `usePaginatedList` internamente
- [ ] Misma interfaz de retorno (data, total, page, etc.)
- [ ] ~100 líneas eliminadas
