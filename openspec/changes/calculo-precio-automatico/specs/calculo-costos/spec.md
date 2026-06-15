# Cálculo de Costos Specification

## Purpose

Sistema de 3 capas que calcula costos automáticamente desde el precio de ingredientes hasta la orden de producción, basado en la jerarquía: ingredientes → recetas → productos → órdenes.

## Requirements

### Requirement: Cálculo de costo de receta

El sistema MUST permitir calcular el costo estimado de una receta invocando `calcular_costo_receta()` vía Supabase RPC.

El cálculo MUST usar `ingrediente_proveedor.precio_actual` priorizando el proveedor preferido (`es_preferido = true`). Sin preferido, MUST usar el precio más bajo disponible. Sin ningún precio, MUST devolver 0.

#### Scenario: Cálculo exitoso con ingredientes con precio

- GIVEN una receta con 3 ingredientes que tienen `precio_actual` en `ingrediente_proveedor`
- WHEN se invoca `calcular_costo_receta(receta_id)`
- THEN devuelve la suma de `cantidad × precio_actual` para cada ingrediente
- AND el resultado es > 0

#### Scenario: Sin precios de proveedores

- GIVEN una receta cuyos ingredientes NO tienen registros en `ingrediente_proveedor`
- WHEN se invoca `calcular_costo_receta(receta_id)`
- THEN devuelve 0

### Requirement: Visualización de costo en receta

El sistema MUST mostrar `costo_estimado` en RecetaFormView como campo de solo lectura.

El sistema MUST proveer un botón "Recalcular costo" que actualice el valor mostrado.

#### Scenario: Ver costo estimado en formulario

- GIVEN el usuario abre una receta existente
- THEN el campo `costo_estimado` se muestra como read-only
- AND muestra el valor de `recetas.costo_estimado`

#### Scenario: Recalcular costo manualmente

- GIVEN el usuario está viendo una receta
- WHEN hace clic en "Recalcular costo"
- THEN se invoca `calcular_costo_receta()` vía RPC
- AND el campo `costo_estimado` se actualiza con el nuevo valor
- AND el valor se persiste en `recetas.costo_estimado`

### Requirement: Costo de producto

El sistema MUST agregar la columna `precio_costo` a la tabla `productos`.

El `precio_costo` MUST calcularse como: `receta.costo_estimado × (producto.peso_unitario_gr / receta.rendimiento_en_gramos)`.

Si el producto no tiene `receta_id` asociada, `precio_costo` MUST ser 0.

#### Scenario: Producto con receta produce costo calculado

- GIVEN un producto con `receta_id` asignada
- AND `peso_unitario_gr = 100` y `rendimiento_en_gramos = 1000` en su receta
- AND `costo_estimado` de la receta es 5000
- WHEN se calcula `precio_costo`
- THEN el resultado es `5000 × (100 / 1000) = 500`

#### Scenario: Sin receta no hay costo

- GIVEN un producto sin `receta_id`
- WHEN se obtiene `precio_costo`
- THEN el valor es 0

### Requirement: Visualización de costo en producto

ProductoFormView MUST mostrar `precio_costo` como campo read-only.

ProductoFormView SHOULD auto-sugerir `precio_venta` como `precio_costo × 1.3` cuando el usuario crea un producto nuevo.

#### Scenario: Auto-sugerencia de precio de venta

- GIVEN el usuario crea un producto nuevo con receta asignada
- AND `precio_costo` se ha calculado
- WHEN el campo `precio_venta` está vacío
- THEN el sistema SHOULD pre-completar `precio_venta` con `precio_costo × 1.3`

### Requirement: Costo en orden de producción

El sistema MUST agregar `costo_total_estimado` a `ordenes_produccion` y `costo_unitario_estimado` a `orden_produccion_detalle`.

OrdenFormView MUST mostrar el costo estimado por línea de detalle y el costo total de la orden.

ProduccionView MUST mostrar `costo_total_estimado` como columna en la tabla.

#### Scenario: Costo estimado en orden

- GIVEN una orden de producción con 2 detalles
- AND cada detalle tiene un producto con `precio_costo` conocido
- WHEN se visualiza la orden
- THEN cada línea muestra `cantidad_programada × precio_costo` como costo unitario
- AND el total muestra la suma de todos los costos unitarios

#### Scenario: Producto sin costo en detalle

- GIVEN un detalle de orden cuyo producto tiene `precio_costo = 0`
- WHEN se visualiza la orden
- THEN la línea muestra `costo_unitario_estimado = 0`
- AND el sistema MUST indicar visualmente que falta precio

### Requirement: Seed data de precios

El sistema MUST incluir datos de `ingrediente_proveedor` en seed.sql para que los cálculos de las recetas existentes retornen valores > 0.

#### Scenario: Seed con precios realistas

- GIVEN seed.sql ejecutado
- WHEN se consulta `ingrediente_proveedor`
- THEN existen al menos 10 registros con `precio_actual > 0`
- AND las recetas existentes tienen ingredientes con precios asignados
