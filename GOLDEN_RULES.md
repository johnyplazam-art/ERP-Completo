
> **Para agentes de IA (opencode, Copilot, etc.)**. Estas reglas son vinculantes al generar
> código en este proyecto. Si una sugerencia viola estas reglas, debe rechazarse.

---

## 1. i18n — Internacionalización

### 1.1 Todo string visible debe pasar por `t()`

```vue
<!-- ❌ INCORRECTO -->
<h2>Guardar</h2>

<!-- ✅ CORRECTO -->
<h2>{{ t('common.save') }}</h2>
```

### 1.2 Importar `useI18n` siempre en `<script setup>`

```vue
<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
```

### 1.3 Las keys se agregan SIEMPRE en ambos archivos

Editar `src/i18n/es.json` y `src/i18n/en.json` simultáneamente.
`es.json` es la fuente de verdad (`fallbackLocale: 'es'`).

### 1.4 Escapar `@` como `\@`

vue-i18n interpreta `@` como "linked message". Para escribir un `@` literal:

```json
"emailPlaceholder": "correo\\@ejemplo.com"
```

### 1.5 Preferir secciones existentes antes de crear nuevas

| Sección | Uso |
|---------|-----|
| `common.*` | Botones genéricos: save, cancel, delete, search, loading |
| `errors.*` | Mensajes de error reutilizables |
| `nav.*` | Navegación del sidebar |
| `crud.*` | Acciones de tablas CRUD |
| `roles.*` | Nombres de roles del sistema |

### 1.6 Namespace por módulo

Las keys de un módulo deben llevar prefijo del módulo:

```json
{
  "pos": {
    "mesas": "Mesas",
    "ordenes": "Órdenes"
  }
}
```

No mezclar keys de módulos distintos en la misma sección (ej: no poner `pos.mesas` dentro de `nav.*`).

---

## 2. Arquitectura — Core vs Módulos

### 2.1 El core NO conoce los módulos por nombre

El archivo `src/core/` **nunca** debe hardcodear el slug de un módulo.

```js
// ❌ INCORRECTO — core conoce el módulo por nombre
const appId = await getAppId('panaderia')

// ✅ CORRECTO — el slug se pasa dinámicamente
const appId = await getAppId(authStore.currentAppSlug)
```

### 2.2 Cada módulo se auto-describe

Un módulo nuevo debe crear:

```
src/modules/<slug>/
├── routes.js               # Rutas relativas al path base
├── composables/
│   ├── database.js          # Queries a Supabase
│   └── queries.js           # TanStack Query hooks
├── components/              # Componentes privados del módulo
├── views/                   # Vistas del módulo
└── validations/
    └── index.js             # Schemas Zod
```

### 2.3 No importar entre módulos

Un composable de `modules/panaderia/` no debe importar de `modules/pos/`.
La comunicación entre módulos debe ir a través de `core/`.

### 2.4 El registro de módulos debe ser explícito pero centralizado

```js
// src/core/router/index.js — ÚNICO lugar donde se registran módulos
import panaderiaRoutes from '@/modules/panaderia/routes'
```

No se requiere un sistema de plugins dinámico, pero cada módulo debe registrarse en
exactamente **un** lugar.

### 2.5 Navegación: las rutas viven en el módulo, los nav items en AppLayout

La navegación lateral se define en `AppLayout.vue`, no en el módulo. Cada módulo expone
sus rutas pero no sus items de navegación. Al crear un módulo nuevo se debe:

1. Importar sus rutas en `router/index.js`
2. Agregar sus nav items en `AppLayout.vue > navRoutes`

---

## 3. Reusabilidad — Componentes y Composables

### 3.1 DataState para loading/error/empty

TODAS las vistas deben usar `DataState.vue`:

```vue
<DataState :loading="isLoading" :error="error" :empty="!items.length" @retry="fetchData">
  <!-- ⚠️ Los slots loading/error/empty son OPCIONALES -->
  <!-- Por defecto DataState muestra textos del i18n ya integrados -->

  <!-- Contenido principal cuando hay datos -->
  <MiLista :items="items" />
</DataState>
```

### 3.2 CrudTable + crud-factory para listados CRUD

Para vistas de listado con operaciones CRUD:
- Usar `CrudTable.vue` (componente genérico de tabla con modal inline)
- Usar `createCrudHooks(config)` de `crud-factory.js` para queries TanStack Query

### 3.3 useAudit para auditoría

Siempre usar `useAudit()` para registrar cambios en datos sensibles. El composable acepta
un `appSlug` opcional:

```js
const { log } = useAudit()
await log('UPDATE', { table: 'ingredientes', entityId: id, appSlug: 'pos' })
```

### 3.4 Composable, no lógica en componentes

Toda lógica de negocio que pueda ser testeada debe vivir en composables, no en componentes.

### 3.5 Componentes compartibles van en core, no en módulos

Si un componente es útil para más de un módulo, debe moverse a `src/core/components/`.

---

## 4. Estado y Stores (Pinia)

### 4.1 Estado global en Pinia, datos de módulo en TanStack Query

- **Estado global** (sesión, empresa activa, tema, permisos globales) → Pinia
- **Datos de negocio** (ingredientes, recetas, órdenes) → TanStack Query
- **Estado local de UI** → `ref()` en el componente

### 4.2 No hay stores por módulo

Cada módulo maneja su estado via TanStack Query. No crear `defineStore` dentro de módulos.

### 4.3 Permisos: cargar por appSlug dinámico

Al cambiar de módulo, recargar permisos:

```js
authStore.setCurrentApp('pos')              // actualiza el slug activo
await authStore.cargarPermisos(empresaId)   // usa currentAppSlug internamente
```

---

## 5. Estilo de Código

### 5.1 Sin comentarios en código

No agregar comentarios explicativos. El código debe ser auto-documentado.

### 5.2 Composition API, sin Options API

Usar `<script setup>` y Composition API en todos los componentes.

### 5.3 Convención de nombres

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase | `DataState.vue` |
| Composables | camelCase con `use` | `useCurrency.js` |
| Stores | camelCase con `use` y `Store` | `useAuthStore` |
| Archivos de módulo | kebab-case | `crud-factory.js` |
| Rutas | kebab-case | `/panaderia/stock-productos` |
| Keys i18n | dot notation | `common.saveChanges` |

### 5.4 Templates sin lógica compleja

No usar expresiones complejas en templates. Mover a `computed` o funciones.

```vue
<!-- ❌ INCORRECTO -->
<span>{{ items.filter(i => i.active).map(i => i.name).join(', ') }}</span>

<!-- ✅ CORRECTO -->
<span>{{ activeNames }}</span>
```

---

## 6. Testing

### 6.1 Unit tests para stores y composables

Toda función pública en stores y composables debe tener test unitario.

### 6.2 Integration tests para RPC y RLS

Cambios en lógica de Supabase (RPC, RLS, funciones) deben tener test de integración.

### 6.3 Nombrar tests por función, no por archivo

```js
describe('cargarPermisos', () => {
  it('retorna array vacío si no hay usuario', ...)
  it('filtra permisos por appSlug', ...)
})
```
