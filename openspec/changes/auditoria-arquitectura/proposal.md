# Auditoría y Estabilización de Arquitectura — Proposal

## Intent

Estabilizar el sistema ERP de panadería para producción real, eliminando bugs de
integridad de datos, conflictos de seguridad multi-tenant, y vulnerabilidades
en flujos críticos.

## Scope

- **Database**: Migraciones SQL para `empresa_id`, RLS policies, triggers, RPCs
- **Frontend**: Refactor de flujo de cambio de estado, auditoría, validaciones
- **Maintainability**: División de archivos monolíticos, tests unitarios

## Approach

### Phase 1 — Data Integrity & Security
1. Agregar `empresa_id` a tablas del módulo panadería (ingredientes, proveedores,
   recetas, productos, órdenes, movimientos, mermas)
2. Reemplazar RLS policies viejas (basadas en `perfiles.rol`) por nuevas basadas
   en `user_roles / role_permissions`
3. Crear RPC `completar_orden()` con transacción atómica (descontar MP +
   actualizar estado + valorizar PT)
4. Validar precio > 0 en `calcular_costo_receta()` — si algún ingrediente no
   tiene precio, devolver error en vez de 0

### Phase 2 — Frontend Robustness
5. Refactor `cambiarEstado()` en ProduccionView.vue para usar el nuevo RPC
6. Cachear IP en `useAudit.js` (stale-while-revalidate 30 min)
7. Fix `formatCurrency` — agregar `minimumFractionDigits: 2`
8. Agregar manejo global de errores Supabase (logout automático en 401)

### Phase 3 — Maintainability
9. Dividir `database.js` en archivos por dominio
10. Agregar tests unitarios para flujos críticos

## Risks
- Migrar `empresa_id` puede afectar datos existentes
- Cambiar RLS policies puede romper acceso si hay usuarios con roles viejos
- El RPC `completar_orden()` debe reemplazar la lógica del frontend completamente

## Success Criteria
1. Todas las tablas del módulo panadería tienen `empresa_id` NOT NULL
2. Un usuario de Empresa A no puede ver datos de Empresa B
3. Una orden que falla a la mitad no deja datos inconsistentes
4. El cálculo de costos nunca devuelve 0 para recetas con ingredientes con precio
5. `useAudit.js` no depende de API externa en el path crítico
