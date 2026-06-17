# Valorización de Inventario Specification

## Purpose

Registro de precio unitario en movimientos de inventario y cálculo del valor del stock disponible, tanto para materia prima como para producto terminado.

## Requirements

### Requirement: Precio en movimientos de MP

El sistema MUST agregar la columna `precio_unitario NUMERIC(12,4) DEFAULT 0` a `movimientos_inventario_mp`.

#### Scenario: Movimiento con precio registrado

- GIVEN un movimiento de ingreso de MP con `precio_unitario = 500`
- WHEN se consulta el movimiento
- THEN el campo `precio_unitario` devuelve 500
- AND el `valor_total = cantidad × precio_unitario`

### Requirement: Precio en movimientos de PT

El sistema MUST agregar la columna `precio_unitario NUMERIC(12,4) DEFAULT 0` a `movimientos_inventario_pt`.

#### Scenario: Ingreso de PT desde orden completada

- GIVEN una orden de producción completada con `costo_total_estimado = 10000`
- WHEN se crea el movimiento de ingreso de PT
- THEN `precio_unitario = costo_total_estimado / cantidad_producida_total`

### Requirement: Pre-carga de precio en ingreso de MP

El sistema MUST pre-cargar el campo precio al crear un ingreso de MP, obteniendo el valor desde `ingrediente_proveedor.precio_actual` (priorizando proveedor preferido). El usuario SHOULD poder editarlo manualmente.

#### Scenario: Ingreso con precio de proveedor

- GIVEN un ingrediente con `precio_actual = 15` en su proveedor preferido
- WHEN el usuario abre el modal de nuevo ingreso y selecciona ese ingrediente
- THEN el campo precio se pre-completa con 15

#### Scenario: Sin precio de proveedor

- GIVEN un ingrediente SIN registros en `ingrediente_proveedor`
- WHEN el usuario selecciona ese ingrediente en el modal
- THEN el campo precio se pre-completa con 0

### Requirement: Stock valorizado

La base de datos MUST exponer una función `stock_valorizado(tipo TEXT, item_id INT)` que devuelva `{ cantidad_total, valor_total }`.

#### Scenario: Valor de stock de un ingrediente

- GIVEN 2 ingresos de Harina 000 (100kg a $1.20 y 50kg a $1.30) y un egreso de 30kg
- WHEN se consulta `stock_valorizado('MP', ingrediente_id)`
- THEN `cantidad_total = 120kg` y `valor_total = 100×1.20 + 50×1.30 - 30×(precio_promedio)`
