# Exploración: refactor-mejoras-base

> Proyecto: erp-completo (SIAS ERP)
> Fecha: 2026-06-09
> Estado: complete

## Resumen Ejecutivo

Se analizaron ~30 archivos del ERP de panadería para identificar 44 hallazgos agrupados en 4 categorías: A (críticos), B (refactors medianos), C (features faltantes), D (arquitectura). Este documento detalla los patrones encontrados, dependencias entre cambios, y esfuerzo estimado.

## Patrones Actuales

### 1. Patrón de Auth (auth.js)

- `initialize()` llama `getSession()` (línea 116) y LUEGO registra `onAuthStateChange` (línea 130)
- Riesgo: si Supabase emite SIGNED_IN/TOKEN_REFRESHED entre ambas llamadas, se pierde el evento
- 3 funciones en database.js usan `(await supabase.auth.getUser()).data.user?.id` en vez de `authStore.user`

### 2. Patrón de Queries/Mutations (queries.js)

- **41 funciones exportadas** (23 queries + 18 mutations)
- **4 sets casi idénticos** para categorías: `categorias_receta`, `categorias_ingrediente`, `categorias_producto`, `unidades_medida`
- Cada set tiene: `useXQuery`, `useCreateXMutation`, `useUpdateXMutation`, `useDeleteXMutation`
- Difieren solo en: queryKey, tabla, función fetch
- ~250 líneas de boilerplate reducibles con un factory pattern

### 3. Patrón de Loading/Error/Empty

12 vistas comparten EXACTAMENTE el mismo bloque de template:

```html
<!-- Loading -->
<div v-if="isLoading" class="text-center py-12 text-gray-400">
  <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
  <p>Cargando ...</p>
</div>

<!-- Error -->
<div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
  {{ error.message }}
</div>

<!-- Empty -->
<div v-else-if="!data?.length" class="text-center py-12 text-gray-400">
  <i class="pi pi-... text-4xl mb-3"></i>
  <p>No hay ...</p>
</div>
```

Vistas afectadas: RecetasView, ProductosView, ProveedoresView, InventarioView, ProduccionView, CatalogosView, OrdenFormView, DashboardView, AdminUsers, AdminApps, HomeDashboard, UsersManagement

### 4. Patrón de Confirmaciones

- **6 vistas** usan `confirm()` o `window.confirm()` nativo del browser
- Solo AdminUsers usa modal con `<Teleport to="body">` correctamente
- AdminApps mezcla: usa modal Teleport para crear/editar pero `confirm()` nativo para eliminar

| Vista | Método | ¿Consistente? |
|-------|--------|--------------|
| AdminUsers | Teleport modal | ✅ Sí |
| AdminApps | confirm() nativo | ❌ No |
| RecetasView | window.confirm() | ❌ No |
| ProductosView | window.confirm() | ❌ No |
| ProveedoresView | window.confirm() | ❌ No |
| InventarioView | confirm() nativo | ❌ No |
| CatalogosView | confirm() nativo | ❌ No |

### 5. Patrón CRUD en Vistas Listado

Todas las vistas listado siguen:
- Header con título + botón "Nuevo X" (router-link)
- Tabla manual con `<table>` (no PrimeVue DataTable)
- Filas con acciones (editar link, desactivar button)
- Sin paginación, sin sorting, sin bulk operations

### 6. Patrón de Formularios

- Todos usan Vee-Validate + Zod
- Algunos definen schema inline (ProveedorFormView, OrdenFormView)
- Otros reusan validations/index.js (RecetaFormView, IngredienteFormView, ProductoFormView)
- Helper `getSelectValue()` duplicado en al menos 3 componentes

### 7. UseAudit

- `application_id` se obtiene de `applications` table en CADA llamado a `log()` (N+1)
- `source_ip` siempre vacío
- `user_agent` viene de `navigator.userAgent` (falseable)

## Dependencias entre Cambios

```
A.1 (auth.js onAuthStateChange)    →   independiente
A.2 (database.js getUser)          →   independiente
A.3 (database.js getUser x3)       →   independiente
A.4 (useAudit N+1)                 →   independiente
A.5 (App.vue error handling)       →   independiente

B.1 (confirm() → modal)            →   depende de: entender patrón AdminUsers
B.2 (DataState component)          →   depende de: entender patrón loading/error/empty
B.3 (cache app_id en useAudit)     →   relacionado con A.4

C.1 (RecetaForm edit)              →   independiente
C.2 (paginación server-side)       →   depende de: D.1 (factory queries opcional pero recomendado)
C.3 (dashboard charts)             →   independiente
C.4 (breadcrumbs)                  →   independiente
C.5 (localStorage persist)         →   independiente

D.1 (factory queries)              →   independiente (pero C.2 se beneficia)
D.2 (CrudTable)                    →   depende de: D.1 parcialmente
```

**Orden recomendado**: A(1-5) → B(1) → C(1) → B(2-3) → C(3,4,5) → D(1) → C(2) → D(2)

## Esfuerzo Estimado

| Item | Esfuerzo | Líneas estimadas | Riesgo |
|------|----------|-----------------|--------|
| A.1 Mover onAuthStateChange | Bajo | ~5 | Medio (tocar auth) |
| A.2-3 Reemplazar getUser() | Bajo | ~6 | Bajo |
| A.4 Cache app_id useAudit | Bajo | ~15 | Bajo |
| A.5 Error handling App.vue | Bajo | ~5 | Bajo |
| B.1 Reemplazar confirm() | Medio | ~80 | Bajo |
| B.2 Componente DataState | Medio | ~50 | Bajo |
| B.3 Cache useAudit | Bajo | ~10 | Bajo |
| C.1 RecetaForm edit | Medio | ~60 | Bajo |
| C.2 Paginación | Alto | ~200 | Medio |
| C.3 Dashboard charts | Medio | ~80 | Bajo |
| C.4 Breadcrumbs | Bajo | ~40 | Bajo |
| C.5 localStorage persist | Bajo | ~15 | Bajo |
| D.1 Factory queries | Alto | ~100 + eliminar ~250 | Alto (tocar toda la capa de datos) |
| D.2 CrudTable component | Alto | ~200 + reemplazar vistas | Alto |

## Riesgos

1. **A.1**: Cambiar orden de `getSession()` / `onAuthStateChange` puede romper sesiones existentes si no se prueba con sesión real
2. **D.1**: Factory de queries requiere refactor de TODOS los componentes que importan queries — un cambio grande que toca ~15 archivos
3. **Pruebas**: No hay test runner configurado (sdd-init reporta strict_tdd: disabled). Solo se puede verificar manualmente.
4. **Mezcla de cambios**: Hacer A+B+C+D en un solo PR puede exceder las 800 líneas fácilmente — necesitamos PRs encadenados o al menos commits atómicos

## Resumen de Código Repetido

| Patrón | Líneas | Ocurrencias | Líneas totales desperdiciadas |
|--------|--------|-------------|-------------------------------|
| Loading/Error/Empty | ~15 | 12 | ~165 |
| queries boilerplate | ~60 | 4 | ~180 |
| getSelectValue() | 4 | 3 | ~8 |
| confirm() | 2 | 6 | ~12 |
| schemas inline | ~10 | 2 | ~10 |
| **Total** | | | **~375 líneas** |

## Conclusión

La aplicación tiene una base sólida pero con áreas claras de mejora. Los items críticos (A) deben resolverse primero por ser bugs/seguridad. Los refactors (B, D) tienen alto ROI porque eliminan ~375 líneas de código repetido. Las features (C) son el valor visible para el usuario.
