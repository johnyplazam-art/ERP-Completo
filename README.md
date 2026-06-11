# SIAS ERP

Sistema ERP modular para gestión de panadería y pastelería.  
Construido con Vue 3 + Supabase, desplegado en GitHub Pages.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3.5 (Composition API, `<script setup>`) |
| Build | Vite 6 |
| Routing | Vue Router 4 (hash history) |
| State | Pinia + TanStack Query |
| UI | PrimeVue 4 + Tailwind CSS 3 + PrimeIcons |
| Formularios | Vee-Validate + Zod |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions) |
| Auth | Supabase Auth (email/password, magic link) |
| i18n | vue-i18n (español, inglés) |
| Despliegue | GitHub Pages (GitHub Actions) |

---

## Funcionalidades

### Módulo Panadería (core)

| Funcionalidad | Estado |
|---|---|
| Dashboard con gráficos (Chart.js) | ✅ |
| CRUD Ingredientes con costos | ✅ |
| CRUD Productos terminados | ✅ |
| CRUD Recetas con cálculo de MP | ✅ |
| CRUD Proveedores | ✅ |
| Gestión de Inventario | ✅ |
| Órdenes de producción | ✅ |
| Catálogos (categorías, unidades, conversiones) | ✅ |
| Exportación a Excel (SheetJS) | ✅ |
| Reportes en PDF (jsPDF) | 🛠️ (Migrado de html2pdf) |

### Dashboard y Aplicaciones

| Funcionalidad | Estado |
|---|---|
| Home dashboard tipo Odoo con grid de apps | ✅ |
| CMS de aplicaciones (icono, orden, visibilidad) | ✅ |
| Sidebar dinámico por app activa | ✅ |

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
| Signup con creación de empresa automática | ✅ |
| Invitaciones por código para unirse a empresa existente | ✅ |
| CRUD completo de usuarios por empresa | ✅ |
| Roles estilo Odoo por aplicación (`admin`, `produccion`, `ventas`) | ✅ |
| Permisos granulares (`ingredientes.create`, `ordenes.edit`, etc.) | ✅ |
| Multi-idioma (español / inglés) con detección de idioma | ✅ |
| Auditoría de acciones (composable `useAudit`) | ✅ |

---

## Arquitectura

### Frontend

```
src/
├── App.vue                     # Auth gate + router-view con spinner
├── main.js                     # Entry point (Pinia, Router, PrimeVue, i18n)
├── core/
│   ├── store/
│   │   ├── auth.js             # Auth store (sesión, login, signup, perfil, empresas)
│   │   └── app.js              # App store (sidebar, theme)
│   ├── router/
│   │   └── index.js            # Router base + Role-based Guards
│   ├── components/
│   │   ├── LoginView.vue       # Login / Signup / Invitación
│   │   ├── AppLayout.vue       # Layout principal con sidebar + header
│   │   ├── HomeDashboard.vue   # Dashboard Odoo-like con grid de apps
│   │   ├── AdminUsers.vue      # Admin de usuarios por empresa
│   │   ├── AdminApps.vue       # CMS de aplicaciones
│   │   └── LanguageSelector.vue
│   ├── composables/
│   │   ├── usePermissions.js   # Helper de permisos (can, hasRole, isAdmin)
│   │   └── useAudit.js         # Registro de auditoría
│   └── supabase.js             # Cliente Supabase singleton + Session Persist
├── modules/
│   └── panaderia/
│       ├── routes.js           # Rutas del módulo
│       ├── views/              # 10+ vistas (Dashboard, Recetas, Inventario, etc.)
│       ├── components/         # Componentes específicos del módulo
│       ├── composables/
│       │   ├── database.js     # Consultas Supabase (CRUDs con soporte paginación)
│       │   └── queries.js      # TanStack Query keys + mutations
│       └── validations/
│           └── index.js        # Esquemas Zod compartidos
├── i18n/
│   ├── es.json                 # Traducciones español
│   ├── en.json                 # Traducciones inglés
│   └── index.js                # Configuración vue-i18n con auto-detección
└── styles/
    └── main.css                # Tailwind + estilos globales
```

### Auth Flow

```
1. app.use(router) → beforeEach guard:
   - loading=true → skip (deja pasar la ruta inicial)
   - isAuthenticated=true → si va a /login, redirige a /
   - !isAuthenticated → redirige a /login (guardando la ruta de retorno en query)
   - role mismatch → redirige a home

2. App.vue onMounted → initialize():
   - getSession() → recupera sesión de Supabase
   - Si hay sesión → carga perfil + empresas
   - Si está en /login y autenticado → redirige a /
   - Si no está autenticado y no está en /login → redirige a /login
   - isReady = true → router-view visible

3. onAuthStateChange → escucha cambios de sesión en tiempo real
```

### Permisos

Modelo tipo Odoo: **rol → permisos → acciones**.

```
Usuario → empresa_usuarios (empresa_id, rol_slug) → user_roles (role_id, app)
         → user_permissions (action_name) vía RPC get_user_permissions()
```

El composable `usePermissions` expone:
- `can('ingredientes.create')` — verifica permiso específico
- `hasRole('admin')` — verifica rol
- `isAdmin`, `isProduccion`, `isVentas` — shorthands

---

## Base de Datos

### Migraciones (cronológico)

| Migración | Descripción |
|-----------|-------------|
| `20260605132957_create_productos` | Tablas base: productos, ingredientes, recetas |
| `20260605133316_fix_rls_policies` | Corrección de policies RLS |
| `20260605145000_modulo_panaderia` | Módulo panadería completo |
| `20260605150000_sistema_seguridad_roles` | Roles, permisos y RLS |
| `20260605160000_fix_fk_to_perfiles` | Fix FK a tabla perfiles |
| `20260605170000_catalogos_rls_update_delete` | RLS para catálogos |
| `20260605200000_multi_tenant` | Multi-tenant con empresa_id |
| `20260609140000_odoo_roles_multiidioma` | Roles tipo Odoo + multi-idioma |
| `20260609160000_fix_functions_dropped_column` | Fix funciones post-drop columnas |
| `20260609170000_fix_user_roles_rls_recursion` | Fix RLS recursión en user_roles |
| `20260609180000_get_usuarios_email_rpc` | RPC para listar usuarios por email |
| `20260609190000_add_es_dueno_to_empresa_usuarios` | Flag es_dueno en empresa_usuarios |
| `20260609200000_get_usuarios_email_all_rpc` | RPC usuarios email multi-empresa |
| `20260609210000_add_delete_empresa_usuarios_policy` | Policy DELETE para empresa_usuarios |
| `20260609220000_add_icon_orden_to_applications` | CMS apps: icono y orden |

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar dev server (Vite HMR)
npm run dev

# Build producción
npm run build

# Vista previa del build
npm run preview
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
# → https://<user>.github.io/erp-completo/
```

---

## Changelog reciente

| Fecha | Cambio |
|-------|--------|
| 2026-06-10 | Refactor de Seguridad (Role-based Guards), Limpieza de Dependencias, Mejora de Auth/Session, Optimización de i18n y Vite Build |
| 2026-06-09 | CMS de aplicaciones (icono, orden en dashboard) |
| 2026-06-09 | Auth gate: spinner hasta resolver sesión, fix redirect loop |
| 2026-06-05 | CRUD usuarios completo + invitaciones funcionales |
| 2026-06-05 | Signup completo con creación de empresa |
| 2026-06-04 | Multi-tenant con empresa switcher |
| 2026-06-04 | Roles tipo Odoo con permisos granulares |
| 2026-06-04 | Multi-idioma (español/inglés) |
| 2026-06-01 | Migración a Supabase + Vite |
| 2026-05-28 | SIAS ERP inicial con GAS+Sheets |

---

## SDD (Spec-Driven Development)

Todo el desarrollo sigue el proceso SDD. Los artefactos (exploración, propuesta, specs, diseño, tareas, verificación, archivo) están documentados en Engram y pueden consultarse con el agente `gentle-orchestrator`.

Comandos disponibles:

- `/sdd-new <cambio>` — inicia un nuevo cambio (exploración → propuesta)
- `/sdd-ff <nombre>` — fast-forward: propuesta → specs → diseño → tareas
- `/sdd-continue` — continúa la siguiente fase del cambio activo
- `/sdd-explore <tema>` — investiga una idea sin crear archivos
- `/sdd-apply [cambio]` — implementa tareas
- `/sdd-verify [cambio]` — valida contra specs
- `/sdd-archive [cambio]` — cierra el cambio y persiste estado
