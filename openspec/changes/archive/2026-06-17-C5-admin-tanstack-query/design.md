# Design: C5 — TanStack Query en AdminPlanes/Suscripciones

## Technical Approach

Crear hooks useQuery/useMutation inline en cada componente, reemplazando las funciones de fetch manual. Mantener UI y forms exactamente iguales.

## Architecture Decisions

### Decision: Hooks inline en cada componente

**Choice**: Definir hooks dentro del script setup de cada componente  
**Alternatives considered**: Crear composable compartido en core/composables/  
**Rationale**: Solo 2 componentes necesitan esto, no justifica una abstracción compartida

### Decision: Separar planes y suscripciones en queries independientes

**Choice**: Query keys separadas para planes y suscripciones  
**Alternatives considered**: Una sola query que cargue todo  
**Rationale**: Son dominios distintos, se invalidan en momentos distintos

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/core/components/AdminPlanes.vue` | Modify | Agregar hooks TanStack Query, reemplazar fetch manual |
| `src/core/components/AdminSuscripciones.vue` | Modify | Agregar hooks TanStack Query, reemplazar fetch manual |

## Testing Strategy

Verificar que los componentes cargan datos correctamente y que las mutaciones actualizan la UI.

## Migration / Rollout

No migration required.

## Open Questions

None.
