# Proposal: C5 — TanStack Query en AdminPlanes/Suscripciones

## Intent

Migrar los fetch manuales en `onMounted` de AdminPlanes.vue y AdminSuscripciones.vue a TanStack Vue Query, obteniendo caching, stale-while-revalidate e invalidación automática.

## Scope

### In Scope
- Crear hooks useQuery/useMutation inline en AdminPlanes.vue para planes CRUD
- Reemplazar `cargarPlanes()` + `guardar()` + `toggleActivo()` + `eliminarPlan()` con useQuery/useMutation
- Crear hooks inline en AdminSuscripciones.vue para suscripciones CRUD
- Reemplazar `cargarDatos()` + `guardar()` + `cancelarSuscripcion()` con useQuery/useMutation

### Out of Scope
- Refactor del UI/forms
- Crear un crud-factory compartido en core (los hooks van inline)

## Capabilities

### New Capabilities
None

### Modified Capabilities
None — refactor de la capa de datos, sin cambios de comportamiento.

## Approach

1. AdminPlanes: Crear `usePlanesQuery` + `useCreatePlanMutation` + `useUpdatePlanMutation` + `useDeletePlanMutation`
2. AdminSuscripciones: Crear `useSuscripcionesQuery` + `useCreateSuscripcionMutation` + `useCancelarSuscripcionMutation`
3. Reemplazar `cargarPlanes()` en onMounted por `usePlanesQuery()`
4. Reemplazar `cargarDatos()` en onMounted por `useSuscripcionesQuery()`
5. Mutations invalidan queryKey automáticamente

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/core/components/AdminPlanes.vue` | Modified | Agregar hooks TanStack Query, reemplazar fetch manual |
| `src/core/components/AdminSuscripciones.vue` | Modified | Agregar hooks TanStack Query, reemplazar fetch manual |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AdminPlanes carga datos de apps además de planes | Baja | Apps pueden seguir con fetch manual o también usar query |
| Romper el form modal | Baja | Solo cambios en la capa de datos, UI intacta |

## Rollback Plan

Revertir el commit.

## Dependencies

Ninguna.

## Success Criteria

- [ ] AdminPlanes usa useQuery/useMutation sin fetch manual en onMounted
- [ ] AdminSuscripciones usa useQuery/useMutation sin fetch manual en onMounted
- [ ] Mutaciones invalidan queries automáticamente
- [ ] UI/UX idéntico
