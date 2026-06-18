# Tasks: Plataforma Multi-Industria

## Review Workload Forecast
- **Estimated changed lines**: ~1800 (8 migrations + frontend components + RLS)
- **400-line budget risk**: High
- **Chained PRs recommended**: Yes — split into 3 chained PRs
- **Decision needed before apply**: Yes — need to confirm chained PRs

---

## Fase 1: Schema DB (PR #1)
**Estimado**: ~250 líneas | **Dependencias**: ninguna

### T1.1 — Crear tabla industrias + industria_apps
- Archivo: `supabase/migrations/20260618000100_multi_industria.sql`
- CREATE TABLE industrias
- CREATE TABLE industria_apps
- ALTER TABLE empresas (industria_principal, config)
- RLS policies para industrias/industria_apps
- Seed industrias
- Seed industria_apps
- Verificación: `SELECT '✅'`

### T1.2 — Crear app core + apps por industria
- Archivo: mismo migration (continuación)
- INSERT applications: core, restaurant, pos, medico, academico
- ON CONFLICT DO NOTHING
- Verificación: query de count

### T1.3 — Migrar empresas existentes
- Archivo: mismo migration (final)
- UPDATE empresas SET industria_principal = (SELECT id FROM industrias WHERE slug = 'panaderia')
  WHERE industria_principal IS NULL
- Verificación: empresas sin industria_principal = 0

---

## Fase 2: Roles y Permisos (PR #1 continue)
**Estimado**: ~350 líneas | **Dependencias**: Fase 1

### T2.1 — Roles plataforma (app core)
- Archivo: `supabase/migrations/20260618000200_multi_industria_roles.sql`
- DO $$ block: crear roles super_admin, admin, auditor, supervisor en app core
- Crear permisos core.*
- Asignar role_permissions

### T2.2 — Roles por industria
- Mismo migration (continuación)
- DO $$ block con IDs de cada app
- Restaurant: admin_local, chef, cocinero, ayudante_cocina, cajero
- POS: admin_tienda, vendedor, cajero_pos, gerente_turno
- Médico: medico, enfermero, recepcionista, administrativo_med
- Académico: profesor, alumno, preceptor, coordinador
- Admin (adicional): contador, administrativo, gestor

### T2.3 — Asignar permisos básicos a roles nuevos
- Mismo migration (continuación)
- Cada rol obtiene permisos de lectura + los específicos de su función
- Admin_local (restaurant) → todos los permisos de restaurant
- Chef → restaurant.recetas.*, restaurant.inventario.*
- etc.

---

## Fase 3: Actualizar handle_new_user() (PR #2)
**Estimado**: ~200 líneas | **Dependencias**: Fase 2

### T3.1 — Reescribir handle_new_user()
- Archivo: `supabase/migrations/20260618000300_multi_industria_registro.sql`
- Nuevo flujo:
  1. Obtener industria de raw_user_meta_data->>'industria' (default 'panaderia')
  2. Validar que industria exista
  3. Crear empresa con industria_principal
  4. Crear empresa_usuarios como dueño (es_dueno = true)
  5. Asignar rol admin (core)
  6. Obtener apps por defecto de industria_apps
  7. Para cada app, asignar rol por defecto:
     - panaderia → admin (existente)
     - restaurant → admin_local
     - pos → admin_tienda
     - medico → medico
     - academico → profesor
     - admin → admin (core ya asignado)
  8. Crear suscripción gratuita
- VERIFICACIÓN: registrar usuario nuevo, verificar empresa + roles correctos

---

## Fase 4: Frontend — IndustrySelector (PR #2)
**Estimado**: ~250 líneas | **Dependencias**: Fase 1

### T4.1 — Crear IndustrySelector.vue
- Archivo: `src/core/components/IndustrySelector.vue`
- Props: modelValue (slug de industria seleccionada)
- Emits: update:modelValue
- Template: grid de tarjetas con icon + nombre + descripción
- Query: SELECT * FROM industrias WHERE activa = true
- Estados: loading (skeleton), empty, error, success

### T4.2 — Modificar RegisterView
- Archivo: `src/core/views/RegisterView.vue` (o donde esté el registro)
- Agregar paso: selección de industria después de email/password
- Pasar industria elegida en raw_user_meta_data
- Validar que se seleccione una industria

### T4.3 — Agregar ruta al router
- Verificar que RegisterView tenga su ruta

---

## Fase 5: UI Dinámica + Navegación (PR #3)
**Estimado**: ~350 líneas | **Dependencias**: Fase 1, Fase 2

### T5.1 — Modificar AppLayout.vue
- Archivo: `src/core/components/AppLayout.vue`
- Sidebar dinámico: solo mostrar apps que el usuario tiene disponibles
- Usar `get_apps_por_suscripcion()` para obtener apps
- Filtrar por permisos del usuario
- Agrupar apps por industria si hay varias

### T5.2 — Modificar HomeDashboard.vue
- Archivo: `src/core/views/HomeDashboard.vue`
- Mostrar solo apps según suscripción
- Si no hay suscripción activa: mostrar mensaje + botón a planes

### T5.3 — Guardar industria actual en auth store
- Archivo: `src/core/store/auth.js`
- Agregar `currentIndustria` ref
- Cargar desde `empresas.industria_principal` al seleccionar empresa
- Exponer computed `industriaSlug`

---

## Fase 6: RLS + Tests (PR #3)
**Estimado**: ~400 líneas | **Dependencias**: Fase 1-5

### T6.1 — Revisar y actualizar RLS policies
- Archivo: `supabase/migrations/20260618000400_multi_industria_rls.sql`
- empireas: SELECT solo miembros activos
- industrias: SELECT universal, INSERT/UPDATE/DELETE solo super_admin
- industria_apps: SELECT universal, solo super_admin escribe
- Verificar que policies existentes de panadería sigan funcionando

### T6.2 — Tests unitarios: industrias CRUD
- Archivo: `tests/unit/database.spec.js` (agregar describe block)
- fetchIndustrias
- (CRUD factory ya cubre lo básico)

### T6.3 — Tests: handle_new_user multi-industria
- Archivo: `tests/unit/auth.spec.js` (agregar tests)
- Registrar con industria = restaurant → verificar empresa + roles
- Registrar sin industria → default panaderia
- Registrar con industria inválida → error manejado

### T6.4 — Arreglar tests rotos
- auth.spec.js: guardarIdioma → reemplazar o actualizar test
- database.spec.js: createReceta tests → actualizar mocks

---

## Resumen de PRs

| PR | Fases | Cambios | Líneas est. |
|----|-------|---------|-------------|
| PR #1 | Fase 1 + 2 | Schema + Roles | ~600 |
| PR #2 | Fase 3 + 4 | Registro + IndustrySelector | ~450 |
| PR #3 | Fase 5 + 6 | UI dinámica + RLS + Tests | ~750 |

**Total estimado**: ~1800 líneas
**Estrategia**: Chained PRs recomendado
