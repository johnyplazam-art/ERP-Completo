# Data Integrity & Security — Specs

## 1. Multi-tenancy: empresa_id

### Requirement MI-1: empresa_id en tablas del módulo panadería

Todas las tablas del módulo panadería MUST tener columna `empresa_id INT NOT NULL
REFERENCES public.empresas(id) ON DELETE RESTRICT`.

Tablas afectadas:

| Tabla | Estado actual | Acción |
|-------|--------------|--------|
| `ingredientes` | Sin `empresa_id` | ADD COLUMN + UPDATE con empresa por defecto (1) + SET NOT NULL |
| `proveedores` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |
| `ingrediente_proveedor` | Sin `empresa_id` (hereda de ingredientes/proveedores) | ADD COLUMN + UPDATE + SET NOT NULL |
| `recetas` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |
| `receta_ingredientes` | Sin `empresa_id` (hereda de recetas) | ADD COLUMN + UPDATE + SET NOT NULL |
| `productos` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |
| `ordenes_produccion` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |
| `orden_produccion_detalle` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |
| `movimientos_inventario_mp` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |
| `movimientos_inventario_pt` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |
| `mermas` | Sin `empresa_id` | ADD COLUMN + UPDATE + SET NOT NULL |

#### Scenario: empresa_id se asigna automáticamente

- GIVEN un usuario autenticado con `currentEmpresaId = 5`
- WHEN crea un nuevo ingrediente desde el frontend
- THEN el registro en `ingredientes` tiene `empresa_id = 5`

#### Scenario: Datos aislados por empresa

- GIVEN un usuario de Empresa A (id=1)
- WHEN consulta `ingredientes`
- THEN SOLO ve ingredientes con `empresa_id = 1`
- AND NO ve ingredientes con `empresa_id = 2`

---

## 2. RLS Policies Unificadas

### Requirement RLS-1: Reemplazar policies basadas en `perfiles.rol`

Todas las políticas RLS actuales que usan `EXISTS (SELECT 1 FROM public.perfiles
WHERE id = auth.uid() AND rol IN ('admin', 'produccion'))` MUST ser reemplazadas
por políticas que usen `user_roles` + `role_permissions`.

#### Scenario: Admin de panadería puede escribir

- GIVEN un usuario con rol `admin_local` en app `panaderia`
- WHEN intenta INSERT en `ingredientes`
- THEN la policy permite la operación

#### Scenario: Usuario sin rol no puede escribir

- GIVEN un usuario con rol `vendedor` en app `pos`
- AND sin rol en app `panaderia`
- WHEN intenta INSERT en `ingredientes`
- THEN la policy DENIEGA la operación

#### Scenario: DELETE policy faltante

- GIVEN un usuario con rol `admin_local` en app `panaderia`
- WHEN intenta DELETE en `ingredientes`
- THEN la policy PERMITE la operación (DELETE policy actualmente no existe)

---

## 3. Transacción Atómica: completar_orden()

### Requirement TO-1: RPC completar_orden()

El sistema MUST tener una función RPC `completar_orden(p_orden_id INT)` que
ejecute en una SOLA transacción:

1. Descontar ingredientes del inventario MP (crear movimientos de egreso)
2. Actualizar estado de la orden a `completada` con `fecha_fin = now()`
3. Crear movimientos de ingreso en inventario PT con `precio_unitario` desde
   `costo_unitario_estimado`

Si CUALQUIER paso falla, TODA la transacción MUST hacer ROLLBACK.

#### Scenario: Completar orden exitosamente

- GIVEN una orden en estado `en_proceso` con 2 productos
- WHEN se invoca `completar_orden(orden_id)`
- THEN el estado cambia a `completada`
- AND se crean movimientos de egreso en MP por los ingredientes necesarios
- AND se crean movimientos de ingreso en PT por los productos
- AND `fecha_fin` se actualiza

#### Scenario: Fallo en medio de la transacción

- GIVEN una orden en estado `en_proceso`
- AND el ingrediente X no existe (FK violación)
- WHEN se invoca `completar_orden(orden_id)`
- THEN la transacción hace ROLLBACK completo
- AND la orden permanece en estado `en_proceso`
- AND NO se crean movimientos parciales

---

## 4. Validación de Costos

### Requirement VC-1: Precio > 0 en calcular_costo_receta()

La función `calcular_costo_receta()` MUST validar que TODOS los ingredientes
tengan `precio_actual > 0` en `ingrediente_proveedor` (por proveedor preferido
o el más barato disponible).

Si algún ingrediente tiene `precio_actual = 0` o no tiene registro en
`ingrediente_proveedor`, la función MUST devolver un error con el mensaje:
"Ingrediente X no tiene precio registrado".

#### Scenario: Todos los ingredientes tienen precio

- GIVEN una receta con 3 ingredientes, todos con `precio_actual > 0`
- WHEN se invoca `calcular_costo_receta()`
- THEN el cálculo se realiza normalmente
- AND devuelve `sum(cantidad × precio) > 0`

#### Scenario: Ingrediente sin precio

- GIVEN una receta con ingrediente "Harina 000" sin registro en
  `ingrediente_proveedor`
- WHEN se invoca `calcular_costo_receta()`
- THEN la función lanza error: "Ingrediente 'Harina 000' no tiene precio
  registrado"

#### Scenario: Precio venta = 0 cuando falla el costo

- GIVEN un producto con `receta_id` asignada
- AND `calcular_costo_receta()` falla por ingrediente sin precio
- WHEN se intenta crear el producto automáticamente
- THEN `precio_venta` se setea en 0
- AND se muestra advertencia al usuario
