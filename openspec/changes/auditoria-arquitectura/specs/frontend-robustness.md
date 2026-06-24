# Frontend Robustness — Specs

## 5. useAudit.js — Cache de IP

### Requirement AUD-1: IP caching with stale-while-revalidate

`useAudit.js` MUST cachear la IP pública obtenida de `api.ipify.org` con
una estrategia stale-while-revalidate de 30 minutos.

La función `resolvePublicIp()` MUST:
1. Devolver IP cachead si existe y no expiró (30 min)
2. Si existe pero expiró (stale), devolver la cacheada y refrescar en background
3. Si no existe, hacer fetch y cachear
4. Si el fetch falla, devolver string vacío sin bloquear

#### Scenario: Primera llamada

- GIVEN `cachedIp = null`
- WHEN se invoca `resolvePublicIp()`
- THEN hace fetch a `api.ipify.org`
- AND cachea el resultado con timestamp

#### Scenario: Llamada dentro de la ventana de 30 min

- GIVEN `cachedIp` con timestamp de hace 5 minutos
- WHEN se invoca `resolvePublicIp()`
- THEN devuelve `cachedIp` inmediatamente
- AND NO hace fetch

#### Scenario: Llamada después de 30 min (stale)

- GIVEN `cachedIp` con timestamp de hace 35 minutos
- WHEN se invoca `resolvePublicIp()`
- THEN devuelve `cachedIp` inmediatamente (stale)
- AND inicia fetch en background para refrescar

#### Scenario: API externa falla

- GIVEN `cachedIp = null`
- WHEN `api.ipify.org` devuelve error
- THEN `resolvePublicIp()` devuelve `''`
- AND el log de auditoría se crea igual (con source_ip vacío)

---

## 6. FormatCurrency — Decimales

### Requirement CUR-1: Mostrar centavos

`useCurrency.js` — `formatCurrency()` MUST usar `minimumFractionDigits: 2` y
`maximumFractionDigits: 2` en vez de 0.

#### Scenario: Precio con decimales

- GIVEN `formatCurrency(1500.50, 'ARS')`
- THEN devuelve `"$1.500,50"` (formato es-AR)

#### Scenario: Precio entero

- GIVEN `formatCurrency(2000, 'ARS')`
- THEN devuelve `"$2.000,00"`

---

## 7. Manejo Global de Errores

### Requirement ERR-1: Interceptor de errores Supabase

El sistema MUST tener un mecanismo global que intercepte errores de Supabase y:

1. En caso de `401` (Unauthorized), haga logout automático del store de auth
2. En caso de `403` (Forbidden), muestre toast con "No tenés permisos para esta
   acción"
3. En caso de error de red, muestre toast con "Error de conexión. Reintentando..."
4. En caso de `422`/`400`, muestre el mensaje del servidor

El interceptor NO MUST interferir con el manejo de errores existente en cada
vista — solo captura errores no manejados.

#### Scenario: Sesión expirada

- GIVEN el usuario está autenticado
- WHEN el token JWT expira y Supabase devuelve 401
- THEN el interceptor llama a `logout()` automáticamente
- AND redirige al login

#### Scenario: Error de permisos

- GIVEN un usuario sin permisos para eliminar ingredientes
- WHEN intenta DELETE y Supabase devuelve 403
- THEN el interceptor muestra toast: "No tenés permisos para esta acción"
- AND NO llama a logout

---

## 8. Refactor cambio de estado

### Requirement EST-1: Usar RPC completar_orden()

`ProduccionView.vue` — `cambiarEstado()` MUST delegar la transacción completa
al RPC `completar_orden()` en lugar de hacer 3 operaciones separadas.

Para cambios de estado que NO son "completada" (pendiente → en_proceso,
cancelar), se mantiene el `updateOrdenEstado()` actual.

#### Scenario: Iniciar orden

- GIVEN una orden en estado `pendiente`
- WHEN el usuario hace clic en "Iniciar"
- THEN se invoca `updateOrdenEstado(id, 'en_proceso')`
- AND NO se descuenta inventario todavía

#### Scenario: Completar orden (usa RPC)

- GIVEN una orden en estado `en_proceso`
- WHEN el usuario hace clic en "Completar"
- THEN se invoca `completar_orden(id)` RPC
- AND el frontend espera la respuesta
- AND muestra toast de éxito o error

#### Scenario: Cancelar orden

- GIVEN una orden en estado `pendiente` o `en_proceso`
- WHEN el usuario hace clic en "Cancelar"
- THEN se invoca `updateOrdenEstado(id, 'cancelada')`
