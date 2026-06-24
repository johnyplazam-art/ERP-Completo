# Auditoría y Estabilización — Implementation Tasks

## Phase 1: Data Integrity & Security (Critical)

### T1.1 — Add empresa_id to panadería tables
**File**: `supabase/migrations/20260622000100_add_empresa_id.sql`
**Depends on**: Nothing
**Acceptance**: All 11 tables have `empresa_id INT NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT`

Sub-tasks:
- [x] Add `empresa_id` columns (nullable) to all panadería tables
- [x] Backfill existing data with empresa_id = 1 (or empresa del creador)
- [x] Set `NOT NULL` constraint
- [x] Add FK constraints for each table
- [x] Update indexes to include empresa_id

### T1.2 — Reemplazar RLS policies con sistema unificado
**File**: `supabase/migrations/20260622000200_unified_rls_policies.sql`
**Depends on**: T1.1
**Acceptance**: Todas las policies usan `user_roles` + `role_permissions` + `empresa_id`

Sub-tasks:
- [x] DROP all existing RLS policies on panadería tables
- [x] Create helper function `usuario_empresas_ids()` 
- [x] Create helper function `tiene_permiso(action)`
- [x] Create new SELECT policies (all authenticated users with empresa access)
- [x] Create new INSERT policies (requires permission `{entity}.create`)
- [x] Create new UPDATE policies (requires permission `{entity}.update`)
- [x] Create new DELETE policies (requires permission `{entity}.delete`)
- [x] Verify no table has missing policies

### T1.3 — RPC completar_orden() con transacción atómica
**File**: `supabase/migrations/20260622000300_rpc_completar_orden.sql`
**Depends on**: T1.1
**Acceptance**: Una sola transacción descuenta MP, actualiza estado, valoriza PT

Sub-tasks:
- [x] Create RPC function with exception handling
- [x] LOCK row to prevent race conditions
- [x] Calculate ingredients needed (reuse logic)
- [x] Create MP egreso movements
- [x] Update order status + fecha_fin
- [x] Create PT ingreso movements with costo_unitario_estimado
- [x] Return JSONB success/error response

### T1.4 — Validar precios en calcular_costo_receta()
**File**: `supabase/migrations/20260622000400_fix_calcular_costo_receta.sql`
**Depends on**: Nothing
**Acceptance**: Si un ingrediente no tiene precio, la función lanza error con nombre

Sub-tasks:
- [x] Modify function to detect ingredients with precio_actual = 0 or NULL
- [x] Raise EXCEPTION with ingredient name
- [ ] Update auto-creación de producto to handle error gracefully (frontend — Phase 2)
- [ ] Ensure precio_venta stays 0 with warning when costo fails (frontend — Phase 2)

---

## Phase 2: Frontend Robustness (High)

### T2.1 — Refactor cambiarEstado() para usar RPC
**File**: `src/modules/panaderia/views/ProduccionView.vue`
**Depends on**: T1.3
**Acceptance**: "Completar" invoca `completar_orden()` RPC, otras transiciones siguen igual

Sub-tasks:
- [ ] Create mutation or direct supabase.rpc call for completar_orden
- [ ] Replace the "completada" branch in cambiarEstado()
- [ ] Keep other state transitions (pendiente→en_proceso, cancelar) unchanged
- [ ] Add loading state during RPC execution
- [ ] Handle RPC error: show toast with error.message

### T2.2 — Cache IP en useAudit.js
**File**: `src/core/composables/useAudit.js`
**Depends on**: Nothing
**Acceptance**: IP se cachea 30 min con stale-while-revalidate

Sub-tasks:
- [ ] Replace simple cache with TTL-based cache
- [ ] Add stale-while-revalidate logic
- [ ] Ensure errors don't block audit log creation
- [ ] Test with simulated network failures

### T2.3 — Fix formatCurrency decimales
**File**: `src/core/composables/useCurrency.js`
**Depends on**: Nothing
**Acceptance**: `minimumFractionDigits: 2, maximumFractionDigits: 2`

Sub-tasks:
- [ ] Change both min/max fraction digits from 0 to 2

### T2.4 — Agregar manejo global de errores Supabase
**File**: New file `src/core/supabase-error.js`
**Depends on**: Nothing
**Acceptance**: 401 → logout, 403 → toast, red → toast

Sub-tasks:
- [ ] Create supabase-error.js with error handler
- [ ] Create wrapper that intercepts query errors
- [ ] Handle 401: auto logout + redirect to login
- [ ] Handle 403: toast "No tenés permisos"
- [ ] Handle network error: toast "Error de conexión"
- [ ] Integrate wrapper in main.js

---

## Phase 3: Maintainability (Medium)

### T3.1 — Dividir database.js en archivos por dominio
**Files**: `src/modules/panaderia/composables/` — create:
  - `ingredientes.js`
  - `proveedores.js`
  - `recetas.js`
  - `productos.js`
  - `ordenes.js`
  - `stock.js`
  - `mermas.js`
  - `auditoria.js`
  - `catalogos.js`
**Depends on**: Nothing
**Acceptance**: database.js se importa desde cada archivo nuevo en lugar de tener todo inline

Sub-tasks:
- [ ] Create individual domain files
- [ ] Import all from a barrel `index.js`
- [ ] Update imports in queries.js to use new files
- [ ] Verify no broken imports
- [ ] Remove or deprecate original database.js

### T3.2 — Tests unitarios para flujos críticos
**File**: `tests/unit/auditoria-arquitectura/`
**Depends on**: T1.3, T2.1, T2.2
**Acceptance**: Tests pasan para flujo completar_orden, useAudit cache, calcular_costo

Sub-tasks:
- [ ] Setup test file structure
- [ ] Test completar_orden() with mock Supabase
- [ ] Test useAudit IP cache behavior
- [ ] Test calcular_costo_receta validation edge cases
- [ ] Test formatCurrency with various locales
