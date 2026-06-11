# Propuesta: refactor-mejoras-base

> Proyecto: erp-completo (SIAS ERP)
> Fecha: 2026-06-09

## Alcance

Corregir 44 hallazgos de análisis de código en 4 áreas, priorizados en 3 batches de implementación.

## Objetivo

Mejorar calidad de código, eliminar bugs latentes, reducir boilerplate, y agregar features faltantes de mediano esfuerzo en el ERP de panadería.

## Entregables por Batch

### Batch 1 (Bajo riesgo, independiente): Items A + B.1 + C.5
1. **A.1** auth.js: Mover `onAuthStateChange` antes de `getSession()` en `initialize()`
2. **A.2** database.js: Reemplazar `(await supabase.auth.getUser()).data.user?.id` con `useAuthStore().user.id`
3. **A.3** database.js: Misma corrección en 2 funciones adicionales
4. **A.4** useAudit.js: Cachear `application_id` al primer llamado
5. **A.5** App.vue: Agregar manejo de error en `initialize()` con estado `initError`
6. **B.1** Reemplazar `window.confirm()` con modal PrimeVue ConfirmationService en 6 vistas
7. **C.5** Persistir `sidebarCollapsed` y `theme` en localStorage

### Batch 2 (Mediano): Items B.2 + C.1 + C.3 + C.4
8. **B.2** Crear componente `<DataState>` con slots para loading/error/empty
9. **C.1** Implementar edición en RecetaFormView
10. **C.3** Agregar gráficos al DashboardView de panadería
11. **C.4** Agregar breadcrumbs al AppLayout

### Batch 3 (Alto): Items D.1 + D.2 + C.2
12. **D.1** Factory de queries CRUD
13. **D.2** Componente CrudTable genérico
14. **C.2** Paginación server-side en listados

## Riesgos

1. Batch 3 toca muchos archivos y tiene alto riesgo de romper queries existentes — requiere verificación manual exhaustiva
2. Sin tests automatizados, la verificación depende de navegación manual
3. El estimado total excede 800 líneas — se recomiendan PRs encadenados o commits atómicos por batch

## Criterios de Aceptación

- Cada batch debe ser verificado individualmente antes de pasar al siguiente
- Regresión: ninguna vista existente debe romper su funcionalidad actual
- Todos los `window.confirm()` deben desaparecer
- auth.js debe manejar correctamente el flujo de sesión
- El factory de queries debe generar funciones que se comporten idéntico a las actuales
