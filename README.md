# SIAS ERP

Sistema ERP modular para gestión de panadería, pastelería y más.  
Arquitectura extensible por módulos — cada industria es un módulo independiente.  
Construido con Vue 3 + Supabase, desplegado en GitHub Pages.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3.5 (Composition API, `<script setup>`) |
| Build | Vite 6 |
| Routing | Vue Router 4 (hash history) |
| State | Pinia (global) + TanStack Query (módulos) |
| UI | PrimeVue 4 + Tailwind CSS 3 + PrimeIcons |
| Formularios | Vee-Validate + Zod |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions) |
| Auth | Supabase Auth (email/password, magic link) |
| i18n | vue-i18n v11 (~740 keys, español/inglés, legacy-free mode) |
| Charts | Chart.js + vue-chartjs |
| Despliegue | GitHub Pages (GitHub Actions) |

---

## Funcionalidades

### Módulo Panadería (actual)

| Funcionalidad | Estado |
|---|---|
| Dashboard con gráficos (Chart.js) | ✅ |
| CRUD Ingredientes con costos | ✅ |
| CRUD Productos terminados | ✅ |
| CRUD Recetas con cálculo de MP | ✅ |
| CRUD Proveedores | ✅ |
| Gestión de Inventario | ✅ |
| Órdenes de producción | ✅ |
| Stock de productos terminados | ✅ |
| Mermas y desperdicios | ✅ |
| Movimientos de stock | ✅ |
| Catálogos (categorías, unidades, conversiones) | ✅ |
| Exportación a Excel (SheetJS) | ✅ |
| Reportes en PDF (jsPDF) | ✅ |
| Auditoría de acciones | ✅ |

### Multi-tenant

| Funcionalidad | Estado |
|---|---|
| Empresas aisladas por `empresa_id` | ✅ |
| Usuarios multi-empresa con roles por app | ✅ |
| Switch de empresa en UI | ✅ |
| RLS policy por empresa en todas las tablas | ✅ |

### Autenticación y Usuarios

| Funcionalidad | Estado |
|---|---|
| Login con email/password (Supabase Auth) | ✅ |
| Signup con creación de empresa automática + selección de industria | ✅ |
| Recuperación de contraseña | ✅ |
| Invitaciones por código para unirse a empresa existente | ✅ |
| CRUD completo de usuarios por empresa | ✅ |
| Roles estilo Odoo por aplicación | ✅ |
| Permisos granulares (`ingredientes.create`, `ordenes.edit`, etc.) | ✅ |
| Auditoría de acciones (composable `useAudit`) | ✅ |
| Perfil de usuario (idioma, datos personales, documento, dirección) | ✅ |

### i18n — Internacionalización completa

| Funcionalidad | Estado |
|---|---|
| ~740 keys en español e inglés | ✅ |
| 100% de componentes traducidos (sin texto hardcodeado visible) | ✅ |
| Selector de idioma en navbar | ✅ |
| Persistencia de preferencia en perfil de usuario + localStorage | ✅ |
| Fallback a español automático | ✅ |
| `@` escapado como `\@` para compatibilidad con vue-i18n | ✅ |
| Detección automática del navegador | ✅ |

---

## Arquitectura

### Filosofía

El sistema separa **core** (plataforma) de **módulos** (industrias).  
El core **no conoce los módulos por nombre** — usa `currentAppSlug` dinámico.

```
src/
├── core/                    # ⬅ Plataforma (no tocar para nuevo módulo)
│   ├── store/
│   │   ├── auth.js          # Sesión, multi-tenant, permisos, currentAppSlug
│   │   └── app.js           # Sidebar, theme, admin apps
│   ├── router/
│   │   └── index.js         # Router + guards + registro de módulos
│   ├── components/
│   │   ├── AppLayout.vue    # Sidebar dinámico por app activa
│   │   ├── LoginView.vue    # Login / Signup / Invitación
│   │   ├── ForgotPasswordView.vue
│   │   ├── ResetPasswordView.vue
│   │   ├── HomeDashboard.vue       # Launcher Odoo-like
│   │   ├── PerfilView.vue          # Perfil con i18n + país
│   │   ├── LanguageSelector.vue    # Switch de idioma
│   │   ├── IndustrySelector.vue    # Selector de industria
│   │   ├── DataState.vue           # Loading/error/empty genérico
│   │   ├── AdminUsers.vue          # Usuarios multi-empresa
│   │   ├── AdminAllEmpresas.vue    # Admin de empresas
│   │   ├── AdminApps.vue           # CMS de aplicaciones
│   │   ├── AdminPlanes.vue         # Planes de suscripción
│   │   └── AdminSuscripciones.vue  # Suscripciones
│   ├── composables/
│   │   ├── useAudit.js       # Registro de auditoría (appSlug dinámico)
│   │   ├── useCurrency.js    # Formateo de moneda
│   │   ├── useInvite.js      # Invitaciones por link
│   │   └── useSelectValue.js # Helper para <select> nativo
│   └── supabase.js           # Cliente Supabase singleton
│
├── modules/                  # ⬅ Módulos de industria
│   └── panaderia/            #     (único por ahora)
│       ├── routes.js         # Rutas relativas al path /panaderia
│       ├── composables/
│       │   ├── database.js   # Consultas Supabase específicas
│       │   ├── queries.js    # TanStack Query hooks
│       │   └── crud-factory.js  # Factory genérica para CRUD hooks
│       ├── components/
│       │   ├── CrudTable.vue      # Tabla CRUD genérica con modal
│       │   ├── PaginatorBar.vue   # Paginación server-side
│       │   └── InlineAddSelect.vue # Select con creación inline
│       ├── views/            # 13 vistas
│       └── validations/
│           └── index.js      # Schemas Zod compartidos
│
├── i18n/
│   ├── es.json               # ~740 keys en español
│   ├── en.json               # ~740 keys en inglés
│   └── index.js              # vue-i18n config (legacy: false)
│
├── styles/
│   └── main.css              # Tailwind + estilos globales
│
└── tests/
    ├── unit/                 # Vitest (auth store, database, queries, app)
    └── integration/          # RLS policies
```

### Registro de nuevo módulo

Para crear un módulo (ej: POS, Restaurant, Médico):

```
src/modules/<slug>/
├── routes.js                  # Rutas relativas
├── composables/
│   ├── database.js            # Queries Supabase
│   └── queries.js             # TanStack Query hooks
├── components/                # Componentes privados
├── views/                     # Vistas
└── validations/
    └── index.js               # Zod schemas
```

Luego registrar en 2 archivos del core:

1. `src/core/router/index.js` — importar rutas y agregar child route
2. `src/core/components/AppLayout.vue` — agregar nav items en `navRoutes`

El `currentAppSlug` se sincroniza automáticamente con la ruta activa.

### i18n

Archivos planos por idioma (`es.json` / `en.json`) organizados por feature:

```
home.*, nav.*, admin.*, auth.*, common.*, errors.*, roles.*,
dashboard.*, recetas.*, productos.*, inventario.*, proveedores.*,
produccion.*, movimientos.*, mermas.*, stock.*, auditoria.*,
crud.*, paginator.*, datastate.*, countries.*, language.*,
theme.*, profile.*, pricing.*, subscriptions.*, companies.*
```

Reglas:
- Todo string visible usa `t('section.key')`
- Toda key va en AMBOS archivos simultáneamente
- `@` literal se escapa como `\@`
- `fallbackLocale: 'es'`
- Ver `GOLDEN_RULES.md` para la guía completa

### Auth Flow

```
1. app.use(router) → beforeEach guard:
   - loading=true → skip (deja pasar la ruta inicial)
   - isAuthenticated=true → si va a /login, redirige a /
   - !isAuthenticated → redirige a /login

2. App.vue onMounted → initialize():
   - Restaurar sesión de localStorage
   - setSession() → recupera sesión de Supabase
   - Si hay sesión → carga perfil + empresas + permisos
   - isReady = true → router-view visible

3. onAuthStateChange → escucha cambios en tiempo real
```

### Permisos

Modelo tipo Odoo: **rol → permisos → acciones**.

```
Usuario → empresa_usuarios → user_roles (role_id, application_id)
       → get_user_permissions() RPC → action_names[]
```

El store expone:
- `tienePermiso('ingredientes.create')` — verifica permiso
- `currentRol` — slug del rol activo
- `esAdmin` — shorthand para platform admin o permisos de gestión

---

## Reglas de Desarrollo (GOLDEN_RULES.md)

El proyecto incluye `GOLDEN_RULES.md` con reglas vinculantes para agentes de IA:

| Sección | Qué cubre |
|---------|-----------|
| i18n | `t()` siempre, ambos archivos, escapar `@`, namespaces |
| Arquitectura | Core no conoce módulos, cada módulo se auto-describe |
| Reusabilidad | `DataState`, `CrudTable`, `crud-factory`, `useAudit` |
| Estado | Pinia para global, TanStack Query para módulos |
| Estilo | Composition API, naming conventions, sin comentarios |
| Testing | Unit para stores, integration para RPC/RLS |

---

## Base de Datos

31 migraciones en `supabase/migrations/`. Las principales:

| Migración | Descripción |
|-----------|-------------|
| `create_productos` | Tablas base: productos, ingredientes, recetas |
| `modulo_panaderia` | Módulo panadería completo |
| `sistema_seguridad_roles` | Roles, permisos y RLS |
| `multi_tenant` | Multi-tenant con empresa_id |
| `odoo_roles_multiidioma` | Roles tipo Odoo + multi-idioma |
| `multi_industria_seed` | Seed multi-industria + RLS policies |

Seed data en `supabase/seed.sql`.

---

## Desarrollo

```bash
npm install
npm run dev        # Vite HMR
npm run build      # Build producción
npm run preview    # Vista previa del build
npm test           # Vitest (unit + integration)
```

Variables de entorno (`.env`):

```env
VITE_SUPABASE_URL=https://thnjjqenlnvsdfkbtwri.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Despliegue

Automático vía GitHub Actions: al pushear a `main`, se buildea y deploya a GitHub Pages.

```bash
git push origin main
```

---

## Changelog reciente

| Fecha | Cambio |
|-------|--------|
| 2026-06-22 | i18n completo: ~740 keys, 100% componentes traducidos, @ escapados |
| 2026-06-22 | GOLDEN_RULES.md: reglas vinculantes para agentes de IA |
| 2026-06-22 | Refactor: módulos desacoplados del core (currentAppSlug dinámico) |
| 2026-06-10 | Refactor de Seguridad (Role-based Guards), Limpieza de Dependencias |
| 2026-06-09 | CMS de aplicaciones (icono, orden en dashboard) |
| 2026-06-09 | Auth gate: spinner hasta resolver sesión, fix redirect loop |
| 2026-06-05 | CRUD usuarios completo + invitaciones funcionales |
| 2026-06-04 | Multi-tenant, roles tipo Odoo, multi-idioma inicial |
| 2026-06-01 | Migración a Supabase + Vite |
| 2026-05-28 | SIAS ERP inicial con GAS+Sheets |

---

## SDD (Spec-Driven Development)

Todo el desarrollo sigue el proceso SDD. Los artefactos están documentados en Engram.

Comandos disponibles:

- `/sdd-new <cambio>` — inicia un nuevo cambio
- `/sdd-ff <nombre>` — fast-forward completo
- `/sdd-continue` — continúa la siguiente fase
- `/sdd-apply [cambio]` — implementa tareas
- `/sdd-verify [cambio]` — valida contra specs
- `/sdd-archive [cambio]` — cierra el cambio
