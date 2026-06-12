# Tasks — sistema-roles-odoo

> SDD Task Breakdown
> Cambio: Unificación del sistema de roles Odoo-like + Multi-idioma

## Review Workload Forecast

- **Estimated changed lines**: ~650-850 (migration ~200, i18n ~300, frontend ~200, RLS ~100)
- **Files touched**: ~12 (2 new, 10 modified)
- **400-line budget risk**: High (estimated 650-850 lines)
- **Decision needed before apply**: Yes — consider splitting into 2 chained PRs

**Recommendation**: Split into 2 chained PRs:
1. **PR 1 — Backend**: Migration (schema + functions + RLS) — ~350 lines
2. **PR 2 — Frontend**: i18n + auth store + permission-aware UI — ~400 lines

---

## Task Group A: Database Migration (PR 1)

### A.1 Add `empresa_id` to `user_roles`
- [ ] Create migration `20260609140000_odoo_roles_multiidioma.sql`
- [ ] ALTER TABLE user_roles ADD COLUMN empresa_id (nullable)
- [ ] Drop old unique constraint
- [ ] Add new unique `(user_id, empresa_id, application_id)`
- [ ] Backfill existing rows with empresa_id = 1
- [ ] SET NOT NULL

### A.2 Add new roles and permissions
- [ ] INSERT roles: panificador, ayudante_panificador, inventario
- [ ] INSERT permission: usuarios.invite
- [ ] Grant permissions for new roles (admin gets all, panificador gets limited, etc.)
- [ ] Grant usuarios.invite to admin, panificador, produccion

### A.3 Migrate `empresa_usuarios.rol` data
- [ ] INSERT into user_roles for each active empresa_usuarios record
- [ ] Handle ON CONFLICT (already migrated)
- [ ] DROP COLUMN rol from empresa_usuarios

### A.4 Add `idioma` to `perfiles`
- [ ] ALTER TABLE perfiles ADD COLUMN idioma TEXT DEFAULT 'es'
- [ ] ADD CHECK (idioma IN ('es', 'en'))

### A.5 Update backend functions
- [ ] Recreate `has_permission()` with p_empresa_id param
- [ ] Recreate `get_user_permissions()` with p_empresa_id param
- [ ] Recreate `handle_new_user()` to write to both empresa_usuarios + user_roles

### A.6 Update RLS policies
- [ ] For each business table: update INSERT/UPDATE/DELETE policies to check BOTH `usuario_en_empresa()` AND `has_permission()`
- [ ] Affected tables: ingredientes, proveedores, ingrediente_proveedor, recetas, receta_ingredientes, productos, ordenes_produccion, orden_produccion_detalle, movimientos_inventario_mp, movimientos_inventario_pt, mermas

---

## Task Group B: i18n Setup (PR 2)

### B.1 Create translation files
- [ ] Create `src/i18n/index.js` with vue-i18n config (locale, fallback, messages import)
- [ ] Create `src/i18n/es.json` with all Spanish translations
- [ ] Create `src/i18n/en.json` with all English translations
- [ ] Move inline messages from `src/main.js` to JSON files
- [ ] Update `src/main.js` to use new i18n config

### B.2 Create LanguageSelector component
- [ ] Create `src/core/components/LanguageSelector.vue` with dropdown
- [ ] Save preference via UPDATE perfiles SET idioma
- [ ] Load saved preference on app init

---

## Task Group C: Frontend Refactor (PR 2)

### C.1 Update auth store
- [ ] Add `permisos` reactive ref
- [ ] Add `cargarPermisos(empresaId)` — calls get_user_permissions RPC
- [ ] Add `tienePermiso(accion)` computed
- [ ] Keep `currentRol` and `esAdmin` as backward-compatible shims (derived from permisos)
- [ ] Call `cargarPermisos()` after `seleccionarEmpresa()`

### C.2 Update AppLayout
- [ ] Add LanguageSelector to header
- [ ] Filter nav items by permissions (show "Usuarios" only if `usuarios.manage` or `usuarios.invite`)

### C.3 Update UsersManagement.vue
- [ ] Show "Invitar usuario" based on `tienePermiso('usuarios.invite')`
- [ ] Load roles list from `roles` table instead of hardcoded array
- [ ] Restrict assignable roles based on current user's role
- [ ] Update role change mutation to write to `user_roles` instead of `empresa_usuarios`

---

## Rollback Plan (for entire change)

1. **If migration fails**: The migration runs in a single transaction. If any step fails, all changes are rolled back. The `empresa_usuarios.rol` column and old `user_roles` structure are preserved.
2. **If frontend breaks**: Revert files to previous commit. The old auth store (`currentRol`/`esAdmin`) is kept as shims, so the frontend remains functional even if the permission RPC fails.
3. **If RLS policies break**: Temporarily disable the new policies and re-enable the old `empresa_insert/update/delete` policies that check `usuario_en_empresa()` only. This is less secure but keeps the app running.
