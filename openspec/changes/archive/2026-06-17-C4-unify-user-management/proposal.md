# Proposal: C4 — Unificar gestión de usuarios

## Intent

Eliminar la duplicación de lógica en `UsersManagement.vue` que hace consultas SQL directas en vez de delegar a `authStore`, duplicando `cargarPanaderiaAppId()` y la lógica de merge.

## Scope

### In Scope
- Reemplazar `cargarPanaderiaAppId()` manual por `authStore.getAppId('panaderia')`
- Reemplazar consultas SQL directas por `authStore.cargarUsuariosMultiEmpresa(empresaId)`
- Reemplazar fetch de roles directo por `authStore.cargarRolesPorApp(appId)`
- Usar `authStore.cambiarRol()`, `authStore.toggleActivo()`, `authStore.removerUsuario()` en vez de SQL directo

### Out of Scope
- Fusionar AdminUsers.vue con UsersManagement.vue (diferentes rutas/propósitos)
- Cambiar AdminUsers.vue

## Capabilities

### New Capabilities
None

### Modified Capabilities
None — pure refactor, sin cambios de comportamiento.

## Approach

1. En UsersManagement.vue: reemplazar `cargarPanaderiaAppId()` manual por `authStore.getAppId()`
2. Reemplazar el bloque de carga de usuarios por `authStore.cargarUsuariosMultiEmpresa()`
3. Reemplazar las mutaciones directas (cambiarRol, toggleActivo, removerUsuario) por las del store
4. Eliminar import de `supabase` si ya no se necesita

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/panaderia/views/UsersManagement.vue` | Modified | Delegar a authStore en vez de SQL directo |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| authStore.cargarUsuariosMultiEmpresa devuelve formato distinto | Media | Mapear respuesta al formato que espera el template |
| Rota la carga de roles | Baja | Mantener el rolMap de la misma forma |

## Rollback Plan

Revertir el commit.

## Dependencies

Ninguna.

## Success Criteria

- [ ] UsersManagement.vue no importa `supabase` directamente
- [ ] UsersManagement.vue no tiene `cargarPanaderiaAppId()` manual
- [ ] Toda la carga de datos delega en authStore
- [ ] Funcionalidad idéntica desde la perspectiva del usuario
