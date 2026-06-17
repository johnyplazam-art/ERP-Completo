# Fix: Editar receta no carga ingredientes y "Actualizar" no funciona

## Diagnóstico

### Problema 1: No aparecen ingredientes al editar
**Archivo:** `src/modules/panaderia/views/RecetaFormView.vue:67`

El `fetchRecetas` usa alias de Supabase:
```js
ingredientes:receta_ingredientes(*, ingrediente:ingredientes(nombre), unidad:unidades_medida(nombre, simbolo))
```

La respuesta tiene campo `ingredientes`, pero el código accede a `data.receta_ingredientes` → `undefined` → cae a `[]`.

**Fix:** Cambiar `data.receta_ingredientes` → `data.ingredientes`

### Problema 2: "Actualizar receta" no hace nada
**Archivo:** `src/modules/panaderia/composables/database.js:370-374`

La función `updateReceta` hace `.update(values)` con el form entero, que incluye `ingredientes` (array). La tabla `recetas` no tiene columna `ingredientes` → error silencioso.

`createReceta` sí separa ingredientes correctamente (líneas 349-368), pero `updateReceta` no.

## Cambios

### Cambio 1: RecetaFormView.vue (1 línea)

| Línea | Original | Nuevo |
|---|---|---|
| 67 | `data.receta_ingredientes` | `data.ingredientes` |

### Cambio 2: database.js — reemplazar updateReceta

**Original (actual — roto):**
```js
export async function updateReceta(id, values) {
  const { data, error } = await supabase.from('recetas').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}
```

**Nuevo:**
```js
export async function updateReceta(id, values) {
  const { ingredientes, ...receta } = values
  const empresaId = values.empresa_id

  const { error: errReceta } = await supabase
    .from('recetas')
    .update(receta)
    .eq('id', id)
  if (errReceta) throw errReceta

  if (ingredientes) {
    const { error: errDel } = await supabase
      .from('receta_ingredientes')
      .delete()
      .eq('receta_id', id)
    if (errDel) throw errDel

    if (ingredientes.length) {
      const { error: errIns } = await supabase
        .from('receta_ingredientes')
        .insert(ingredientes.map(i => ({ ...i, receta_id: id, empresa_id: empresaId })))
      if (errIns) throw errIns
    }
  }

  return fetchRecetaById(id)
}
```

## Verificación
- `npm run build` debe pasar sin errores
- Editar receta: debe cargar ingredientes existentes
- Actualizar receta: debe guardar cambios incluyendo ingredientes
