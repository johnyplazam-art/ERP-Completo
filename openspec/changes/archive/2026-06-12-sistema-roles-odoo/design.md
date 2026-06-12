# Design — sistema-roles-odoo

> SDD Technical Design
> Cambio: Unificación del sistema de roles Odoo-like + Multi-idioma

## 1. Architecture Decision Records

### ADR-1: Unificar en `user_roles` en lugar de extender `empresa_usuarios`

**Contexto:** Tenemos dos sistemas. Sistema A (user_roles + role_permissions + permissions) tiene permisos granulares pero sin scope de empresa. Sistema B (empresa_usuarios.rol) tiene scope de empresa pero solo un TEXT con CHECK.

**Decisión:** Agregar `empresa_id` a `user_roles` y eliminar `empresa_usuarios.rol`.

**Consecuencia:** Un modelo único de autorización. `empresa_usuarios` queda como membresía pura. Las RLS policies y el frontend consultan `user_roles` para permisos.

**Alternativa rechazada:** Reemplazar el CHECK con FK a `roles`. Esto no daba permisos por aplicación, solo un rol global por empresa.

### ADR-2: Traducciones en JSON plano (no por módulo independiente)

**Contexto:** La app es mediana y tiene un solo módulo (Panadería). Podríamos dividir traducciones por módulo (carga lazy) o mantenerlas en archivos planos.

**Decisión:** Usar `es.json` y `en.json` planos por ahora. La estructura de keys usa namespaces (`nav.*`, `common.*`, `roles.*`, `panaderia.*`).

**Consecuencia:** Simple, sin complejidad de carga dinámica. Cuando hayamos múltiples módulos grandes, se puede migrar a archivos por módulo sin romper keys existentes.

### ADR-3: `handle_new_user()` escribe en ambas tablas (empresa_usuarios + user_roles)

**Contexto:** `empresa_usuarios` ya no tiene rol, pero sigue siendo la tabla de membresía (quién pertenece a qué empresa). `user_roles` tiene el rol por aplicación.

**Decisión:** En signup, el trigger:
1. Crea perfil en `perfiles`
2. Inserta membresía en `empresa_usuarios` (activo = true)
3. Inserta rol en `user_roles` con `empresa_id` y `application_id`

**Consecuencia:** Dos inserts por signup en lugar de uno. Consistente con la separación de concerns.

### ADR-4: Permisos evaluados en frontend via RPC, no via RLS lookup

**Contexto:** El frontend necesita saber qué permisos tiene el usuario para mostrar/ocultar UI.

**Decisión:** Usar `get_user_permissions(uid, app_slug, empresa_id)` como RPC. El frontend la llama al cargar empresa y cachea la lista.

**Consecuencia:** Una llamada al cambiar de empresa. La RPC es SECURITY DEFINER, no expone datos de otras empresas porque filtra por `empresa_id`.

## 2. Migration Plan

### Fase 1: Schema (database only)

```
Migration: 20260609140000_odoo_roles_multiidioma.sql
```

Order of operations:
1. Add `empresa_id` to `user_roles` (nullable initially)
2. Drop old unique constraint, add new `(user_id, empresa_id, application_id)`
3. Backfill existing `user_roles` with `empresa_id = 1`
4. Set `empresa_id` NOT NULL
5. Insert new roles: panificador, ayudante_panificador, inventario
6. Insert new permission: usuarios.invite
7. Grant permissions for new roles (role_permissions)
8. Add `idioma` column to `perfiles`
9. Backfill existing `empresa_usuarios.rol` → `user_roles` entries
10. Drop `empresa_usuarios.rol` column
11. Update `has_permission()` function
12. Update `get_user_permissions()` function
13. Update `handle_new_user()` function
14. Update RLS policies on business tables

### Fase 2: RLS Policy Updates

For each business table (ingredientes, proveedores, recetas, productos, ordenes_produccion, etc.):
- DROP existing `empresa_insert`, `empresa_update`, `empresa_delete` policies
- CREATE new policies that check BOTH `usuario_en_empresa()` AND `has_permission()`

### Fase 3: i18n Setup

1. Create `src/i18n/index.js` with vue-i18n config
2. Create `src/i18n/es.json` with all Spanish translations
3. Create `src/i18n/en.json` with all English translations
4. Remove inline messages from `src/main.js`
5. Update `src/main.js` to use new i18n config

### Fase 4: Frontend Refactor

1. Update `auth.js` store:
   - Add `permisos` ref
   - Add `tienePermiso()` function
   - Add `cargarPermisos()` that calls `get_user_permissions()` RPC
   - Remove `currentRol`, `esAdmin`, `puedeEscribir` (or keep as shims)
   - Call `cargarPermisos()` after `seleccionarEmpresa()`

2. Update `AppLayout.vue`:
   - Add language selector
   - Filter nav items by permissions

3. Update `UsersManagement.vue`:
   - Show "Invitar usuario" based on `tienePermiso('usuarios.invite')`
   - Load roles from `roles` table (not hardcoded)
   - Update role change to write to `user_roles` instead of `empresa_usuarios`

## 3. Sequence Diagrams

### 3.1 User Login Flow

```
User                    Frontend                    Supabase                    DB
  |                        |                           |                         |
  |-- login(email,pwd) -->|                           |                         |
  |                        |-- POST /auth/v1/token -->|                         |
  |                        |<-- JWT + user ----------|                         |
  |                        |                           |                         |
  |                        |-- SELECT * FROM empresas--|                         |
  |                        |   JOIN empresa_usuarios   |--> empresa_usuarios -->|
  |                        |<-- empresas list ---------|<----------------------|
  |                        |                           |                         |
  |                        |-- SELECT get_user_permissions(uid, 'panaderia', empresa_id) -- RPC -->|
  |                        |<-- permisos[] -----------|<------------------------|
  |                        |                           |                         |
  |<-- UI con permisos ---|                           |                         |
```

### 3.2 Language Switch Flow

```
User                    Frontend (vue-i18n)          Supabase
  |                        |                           |
  |-- click "English" --->|                           |
  |                        |-- i18n.locale = 'en'     |
  |                        |   (instant UI update)    |
  |                        |                           |
  |                        |-- UPDATE perfiles         |
  |                        |   SET idioma = 'en'      |
  |                        |   WHERE id = uid ------->|
  |<-- UI in English -----|                           |
```

### 3.3 Role Change Flow (Admin)

```
Admin                   Frontend                    Supabase                    DB
  |                        |                           |                         |
  |-- cambia rol de ------|                           |                         |
  |   usuario X a         |                           |                         |
  |   "panificador"       |                           |                         |
  |                        |-- UPDATE user_roles      |                         |
  |                        |   SET role_id = X        |                         |
  |                        |   WHERE user_id = Y      |                         |
  |                        |   AND empresa_id = Z --->|--> user_roles --------->|
  |                        |<-- success --------------|<------------------------|
  |                        |                           |                         |
  |                        |-- re-fetch permisos       |                         |
  |<-- UI actualizado ----|                           |                         |
```

## 4. Component Tree (affected)

```
AppLayout.vue
├── LanguageSelector.vue (NEW — icon + dropdown in header)
├── Sidebar.vue (updated — permission-based nav filtering)
└── <router-view>
    └── modules/panaderia/
        └── UsersManagement.vue (updated — permission-aware)
```

## 5. API Surface

### New/Modified RPCs

| RPC | Parameters | Returns | Description |
|---|---|---|---|
| `get_user_permissions` | p_user_id UUID, p_app_slug TEXT, p_empresa_id INT | TABLE(action_name TEXT) | Permisos del usuario en una app+empresa |
| `has_permission` | p_user_id UUID, p_action_name TEXT, p_app_slug TEXT, p_empresa_id INT | BOOLEAN | Check single permission |

### New Store API

```js
// auth.js additions:
const permisos = ref([])
const tienePermiso = (accion) => permisos.value.includes(accion)
const cargarPermisos = async (empresaId) => {
  const { data } = await supabase.rpc('get_user_permissions', {
    p_user_id: user.value.id,
    p_app_slug: 'panaderia',
    p_empresa_id: empresaId
  })
  permisos.value = (data ?? []).map(p => p.action_name)
}
```

## 6. File Inventory

### New Files
- `src/i18n/index.js` — i18n configuration
- `src/i18n/es.json` — Spanish translations
- `src/i18n/en.json` — English translations
- `src/core/components/LanguageSelector.vue` — Language switcher UI
- `supabase/migrations/20260609140000_odoo_roles_multiidioma.sql` — Migration

### Modified Files
- `src/main.js` — Remove inline i18n messages, use new config
- `src/core/store/auth.js` — Add permisos, tienePermiso(), cargarPermisos()
- `src/core/components/AppLayout.vue` — Add LanguageSelector, permission-based nav
- `src/modules/panaderia/views/UsersManagement.vue` — Permission-aware UI
- `src/modules/panaderia/composables/queries.js` — May need permission checks
- `src/modules/panaderia/composables/database.js` — May need permission checks
- `supabase/functions/has_permission.sql` — Updated with empresa_id
- `supabase/functions/get_user_permissions.sql` — Updated with empresa_id
- `supabase/functions/handle_new_user.sql` — Updated logic
- RLS policies on all business tables

## 7. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Migration fails mid-way | High — data inconsistency | Low | All DDL in single transaction; test on local first |
| RLS policy incorrect after change | High — data exposure | Medium | Write policies are CHECK (WITH CHECK), read policies are permissive; test each table |
| Broken frontend after removing currentRol | Medium — UI errors | Medium | Keep compatibility shim: `currentRol` derived from first user_roles entry |
| Missing translations | Low — shows key name | Low | Fallback to 'es'; lint to check key parity |
| Permission cache stale | Low — wrong UI state | Low | Clear cache on empresa switch; add manual refresh |
