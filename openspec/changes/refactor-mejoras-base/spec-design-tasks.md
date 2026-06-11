# Spec + Design + Tasks: refactor-mejoras-base

## Especificaciones

### Item A.1 — Fix orden onAuthStateChange (auth.js)
**Requerimiento**: `onAuthStateChange` debe registrarse ANTES de `getSession()`.
**Escenario**: Sesión existente → Supabase emite SIGNED_IN entre getSession y listener. Con el orden actual se pierde, con el nuevo se captura.
**Criterio**: No cambiar comportamiento — solo invertir orden de 2 líneas.
**Archivo**: `src/core/store/auth.js`, función `initialize()`, líneas 116-142.

### Item A.2-3 — Reemplazar getUser() en database.js
**Requerimiento**: Las 3 funciones que llaman `(await supabase.auth.getUser()).data.user?.id` deben usar `useAuthStore().user.id`.
**Escenario**: Sesión activa → ambas formas devuelven el mismo ID. La nueva evita una llamada HTTP y es más rápida.
**Archivo**: `src/modules/panaderia/composables/database.js`, líneas 234, 327, 499.
**Función**: `createReceta`, `createOrdenProduccion`, `descontarIngredientesOrden`.

### Item A.4 — Cachear application_id en useAudit
**Requerimiento**: `log()` debe cachear `application_id` en un closure/módulo-ref para no consultar `applications` table en cada llamado.
**Escenario**: Llamados repetidos a `log()` → solo la primera llamada consulta la DB. Las siguientes usan el cache.
**Archivo**: `src/core/composables/useAudit.js`.

### Item A.5 — Error handling en App.vue initialize
**Requerimiento**: Si `initialize()` falla, mostrar pantalla de error en vez de spinner forever.
**Escenario**: Supabase caído → usuario ve mensaje de error con botón de reintentar.
**Archivo**: `src/App.vue`.

### Item B.1 — Reemplazar confirm() nativo con modal PrimeVue
**Requerimiento**: Todas las vistas que usan `window.confirm()` o `confirm()` deben usar PrimeVue ConfirmationService con modal Teleport.
**Escenario**: Click en "Desactivar" → modal con título, mensaje, botones Confirmar/Cancelar y icono de advertencia.
**Archivos**: RecetasView, ProductosView, ProveedoresView, InventarioView, CatalogosView, AdminApps.

### Item C.5 — Persistir UI state en localStorage
**Requerimiento**: `sidebarCollapsed` y `theme` deben persistirse en localStorage para sobrevivir a recargas.
**Escenario**: Usuario colapsa sidebar y recarga → sidebar sigue colapsado.
**Archivo**: `src/core/store/app.js`.

### Item B.2 — Componente DataState
**Requerimiento**: Crear componente `<DataState>` con props `loading`, `error`, `empty`, `emptyIcon`, `emptyText` y slots para personalización.
**Escenario**: Cualquier vista reemplaza su bloque loading/error/empty con `<DataState>`.
**Archivo nuevo**: `src/core/components/DataState.vue`.

### Item C.1 — RecetaFormView edición
**Requerimiento**: RecetaFormView debe cargar datos existentes y permitir guardar cambios cuando se navega a `/panaderia/recetas/:id/editar`.
**Escenario**: Click en "Editar" en RecetasView → formulario precargado con datos de la receta. Guardar → update en vez de create.

### Item C.3 — Dashboard con gráficos
**Requerimiento**: DashboardView de panadería debe mostrar gráficos de torta y barras con Chart.js.
**Escenario**: Al abrir dashboard → ver distribución de productos por categoría y producción por día.
**Archivo**: `src/modules/panaderia/views/DashboardView.vue`.

### Item C.4 — Breadcrumbs
**Requerimiento**: AppLayout debe mostrar breadcrumbs dinámicos basados en la ruta actual.
**Escenario**: Navegar a Proveedores → breadcrumb muestra "Inicio > Panadería > Proveedores".

### Items D.1, D.2, C.2 — Pospuestos
Aplazados para después de los primeros 2 batches. Se evaluará si el presupuesto de 800 líneas lo permite.

---

## Diseño Técnico

### A.1 — Diagrama de flujo de initialize()
```
ANTES:
getSession() → set user/session → [posible evento perdido aquí] → onAuthStateChange()

DESPUÉS:
onAuthStateChange() → [captura eventos desde el inicio] → getSession() → set user/session
```

### B.1 — Patrón de modal para confirmaciones
```vue
<!-- Ejemplo de implementación -->
<PrimeButton @click="confirmDelete(item)" severity="danger" />
```
```js
const confirmDelete = (item) => {
  confirm.require({
    message: `¿Desactivar "${item.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: () => mutate(item.id),
  })
}
```

### B.2 — Componente DataState
```vue
<template>
  <div v-if="loading" class="text-center py-12 text-gray-400">
    <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
    <p><slot name="loading">{{ loadingText }}</slot></p>
  </div>
  <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
    <slot name="error">{{ error }}</slot>
  </div>
  <div v-else-if="empty" class="text-center py-12 text-gray-400">
    <i :class="`pi ${emptyIcon} text-4xl mb-3`"></i>
    <p><slot name="empty">{{ emptyText }}</slot></p>
  </div>
  <slot v-else />
</template>
```

---

## Tareas

### T1: Fix auth.js initialize (A.1)
- Mover `supabase.auth.onAuthStateChange(...)` ANTES de `const { data: { session } } = await supabase.auth.getSession()`
- Archivo: src/core/store/auth.js

### T2: Fix getUser() en database.js (A.2-3)
- En `createReceta()`, reemplazar `creado_por: (await supabase.auth.getUser()).data.user?.id` con `creado_por: useAuthStore().user?.id`
- En `createOrdenProduccion()`, reemplazar `const user = (await supabase.auth.getUser()).data.user`
- En `descontarIngredientesOrden()`, reemplazar `const user = (await supabase.auth.getUser()).data.user`
- Archivo: src/modules/panaderia/composables/database.js

### T3: Cache app_id en useAudit (A.4)
- Agregar variable `let cachedAppId = null` fuera del export
- En `log()`, si `cachedAppId` es null, cargarlo; si no, usarlo
- Archivo: src/core/composables/useAudit.js

### T4: Error handling en App.vue (A.5)
- Agregar `const initError = ref(null)`
- Envolver `await authStore.initialize()` en try-catch con manejo de error
- Mostrar pantalla de error si initError no es null
- Archivo: src/App.vue

### T5: Reemplazar confirm() nativo (B.1)
- En 6 vistas, reemplazar `window.confirm()` / `confirm()` con `ConfirmService`
- Vistas: RecetasView, ProductosView, ProveedoresView, InventarioView, CatalogosView, AdminApps
- Usar `primevue/confirmationservice` + `useConfirm()`

### T6: Persistir sidebar/theme (C.5)
- Agregar `watch(sidebarCollapsed, v => localStorage.setItem(...))`
- Agregar `watch(theme, v => localStorage.setItem(...))`
- En initialize, leer valores guardados
- Archivo: src/core/store/app.js

### T7: Componente DataState (B.2)
- Crear src/core/components/DataState.vue
- Props: loading, error, empty, emptyIcon, emptyText, loadingText
- Slots: default, error, empty, loading

### T8: RecetaFormView edición (C.1)
- Agregar prop/computed para detectar modo edición por ruta
- Si edición: cargar receta por ID, precargar form, usar updateMutation
- Archivo: src/modules/panaderia/views/RecetaFormView.vue

### T9: Dashboard charts (C.3)
- Importar Chart.js components en DashboardView
- Agregar gráfico de torta (productos por categoría)
- Agregar gráfico de barras (órdenes por día)
- Archivo: src/modules/panaderia/views/DashboardView.vue

### T10: Breadcrumbs en AppLayout (C.4)
- Agregar componente breadcrumb en AppLayout
- Derivar de la ruta actual (router.currentRoute)
- Archivo: src/core/components/AppLayout.vue
