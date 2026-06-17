# Fix: watchEffect resetea ingredientes al editar

**Problema:** El `watchEffect` se dispara cada vez que la query de recetas se refetchea, llamando a `resetForm()` y borrando los cambios no guardados del usuario (ingredientes agregados/modificados).

## Cambio 1 — Import `watch` en `RecetaFormView.vue`

**Línea 3** — Agregar `watch` al import de Vue:

```diff
- import { ref, computed } from 'vue'
+ import { ref, computed, watch } from 'vue'
```

## Cambio 2 — Reemplazar `watchEffect` por `watch` con flag `loaded`

**Líneas 49-78** — Reemplazar todo el bloque:

### Original (bug):
```js
if (isEdit.value) {
  const receta = computed(() =>
    recetas.value?.find(r => r.id === Number(route.params.id))
  )

  watchEffect(() => {
    const data = receta.value
    if (data) {
      resetForm({
        values: {
          nombre: data.nombre || '',
          categoria_id: data.categoria_id || null,
          instrucciones: data.instrucciones || '',
          tiempo_preparacion_min: data.tiempo_preparacion_min || null,
          rendimiento_cantidad: data.rendimiento_cantidad || 1,
          rendimiento_unidad_id: data.rendimiento_unidad_id || null,
          activa: data.activa ?? true,
          ingredientes: (data.ingredientes || []).map((ri, i) => ({
            ingrediente_id: ri.ingrediente_id,
            cantidad: ri.cantidad,
            unidad_id: ri.unidad_id,
            es_opcional: ri.es_opcional || false,
            orden: ri.orden || i,
          })),
        },
      })
    }
  })
}
```

### Nuevo (fix):
```js
if (isEdit.value) {
  const receta = computed(() =>
    recetas.value?.find(r => r.id === Number(route.params.id))
  )
  let loaded = false

  watch(receta, (data) => {
    if (data && !loaded) {
      loaded = true
      resetForm({
        values: {
          nombre: data.nombre || '',
          categoria_id: data.categoria_id || null,
          instrucciones: data.instrucciones || '',
          tiempo_preparacion_min: data.tiempo_preparacion_min || null,
          rendimiento_cantidad: data.rendimiento_cantidad || 1,
          rendimiento_unidad_id: data.rendimiento_unidad_id || null,
          activa: data.activa ?? true,
          ingredientes: (data.ingredientes || []).map((ri, i) => ({
            ingrediente_id: ri.ingrediente_id,
            cantidad: ri.cantidad,
            unidad_id: ri.unidad_id,
            es_opcional: ri.es_opcional || false,
            orden: ri.orden || i,
          })),
        },
      })
    }
  }, { immediate: true })
}
```

**Diferencia clave:** `watch` con flag `loaded` solo ejecuta `resetForm` la PRIMERA vez que los datos cargan. Refetcheos posteriores no tocan el formulario.

## Verificación
- `npm run build` debe pasar
- Editar receta: ingredientes existentes cargan al abrir
- Agregar ingrediente: no se pierde al guardar o refetchear
- Guardar receta: persiste correctamente
