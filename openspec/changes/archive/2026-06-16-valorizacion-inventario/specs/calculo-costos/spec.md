# Delta for Cálculo de Costos

## MODIFIED Requirements

### Requirement: Costo en orden de producción

El sistema MUST al completar una orden de producción crear automáticamente un movimiento de ingreso en `movimientos_inventario_pt` por cada producto, con `precio_unitario` calculado desde `costo_total_estimado / cantidad_producida_total`.
(Previously: solo persistía costo_total_estimado sin interactuar con inventario)

#### Scenario: Auto-valorización al completar orden

- GIVEN una orden en estado `en_proceso` con `costo_total_estimado = 5000`
- AND detalles con `cantidad_producida = 10` unidades cada uno
- WHEN se cambia estado a `completada`
- THEN se crea un movimiento de ingreso en `movimientos_inventario_pt` por cada producto
- AND cada movimiento tiene `precio_unitario = costo_total_estimado / cantidad_producida_total`
