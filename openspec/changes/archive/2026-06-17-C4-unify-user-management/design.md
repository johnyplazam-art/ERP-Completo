# Design: C4 — Unificar gestión de usuarios

## Technical Approach

Reemplazar las 4 operaciones directas de UsersManagement.vue (cargarPanaderiaAppId, fetch usuarios, fetch roles, mutations) por delegación a authStore.

## Architecture Decisions

### Decision: Usar authStore.cargarUsuariosMultiEmpresa con empresaId

**Choice**: Pasar empresaId actual para filtrar a una empresa  
**Alternatives considered**: Cargar todas y filtrar client-side  
**Rationale**: El hook ya acepta empresaId opcional para filtrar server-side

### Decision: Mapear respuesta del store al formato del template

**Choice**: Mapear explícitamente la respuesta de authStore al formato existente  
**Alternatives considered**: Cambiar el template para usar el formato del store  
**Rationale**: Menos riesgo de romper UI, el store devuelve más datos de los necesarios

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/panaderia/views/UsersManagement.vue` | Modify | Delegar a authStore, eliminar SQL directo |

## Interfaces / Contracts

El template espera `{ ...empresa_usuario, email, rol_actual }`. authStore.cargarUsuariosMultiEmpresa devuelve exactamente eso. Compatible directo.

## Testing Strategy

Verificar que la vista carga y muestra usuarios correctamente.

## Migration / Rollout

No migration required.

## Open Questions

None.
