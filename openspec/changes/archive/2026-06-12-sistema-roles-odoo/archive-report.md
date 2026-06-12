# Archive: sistema-roles-odoo

> Fecha: 2026-06-12
> Estado: ✅ closed

## Resumen

Se implementó la unificación del sistema de roles Odoo-like + Multi-idioma. 
Backend: migración de schema (empresa_id en user_roles, drop de empresa_usuarios.rol, 
nuevos roles, permisos, funciones actualizadas, políticas RLS). 
Frontend: i18n completo (vue-i18n, es/en), LanguageSelector, auth store con permisos 
granulares, UI adaptativa por permisos.

## Archivos Nuevos
- `src/i18n/index.js`
- `src/i18n/es.json`
- `src/i18n/en.json`
- `src/core/components/LanguageSelector.vue`
- `supabase/migrations/20260609140000_odoo_roles_multiidioma.sql`
- `supabase/migrations/20260609160000_fix_functions_dropped_column.sql`
- `supabase/migrations/20260609170000_fix_user_roles_rls_recursion.sql`

## Archivos Modificados
- `src/main.js` — usa i18n desde ./i18n
- `src/core/store/auth.js` — permisos, tienePermiso, cargarPermisos, guardarIdioma, etc.
- `src/core/components/AppLayout.vue` — LanguageSelector, nav filtering por permisos
- `src/modules/panaderia/views/UsersManagement.vue` — permission-aware

## Lo que se logró
- 🏗️ Schema: empresa_id en user_roles (backfill + NOT NULL), drop de empresa_usuarios.rol
- 👥 3 nuevos roles: panificador, ayudante_panificador, inventario
- 🔐 Nuevo permiso usuarios.invite con asignaciones granulares
- 🌐 Multi-idioma funcional (es/en) con persisted en perfiles.idioma
- 🧠 Auth store con permisos granulares (tienePermiso, cargarPermisos)
- 🔒 RLS policies actualizadas con has_permission() scope empresa
- 🎛️ UI adaptativa (botón invitar, nav items, asignación de roles)

## Lo que queda
- Conversiones de unidades (tab en CatalogosView)
- Vista de Mermas
- Vistas de movimientos de inventario (MP/PT)
- Vista de ingrediente_proveedor

## Artefactos
- spec.md
- design.md
- tasks.md
- verify-report.md
- archive-report.md
