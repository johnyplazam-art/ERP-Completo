import { supabase, withRange } from './_helpers'

// ─── Helper: categoría de producto desde receta ──────

async function getProductCategoryFromRecipe(recipeCategoriaId) {
  const { data: cat } = await supabase
    .from('categorias_receta')
    .select('nombre')
    .eq('id', recipeCategoriaId)
    .single()
  if (!cat) return null

  const { data: prodCat } = await supabase
    .from('categorias_producto')
    .select('id')
    .eq('nombre', cat.nombre)
    .maybeSingle()
  if (prodCat) return prodCat.id

  const { data: firstCat } = await supabase
    .from('categorias_producto')
    .select('id')
    .limit(1)
    .maybeSingle()
  return firstCat?.id ?? null
}

// ─── Recetas ─────────────────────────────────────────

export async function fetchRecetas(empresaId, opts = {}) {
  let query = supabase
    .from('recetas')
    .select(`
      *,
      categoria:categorias_receta(nombre),
      unidad:unidades_medida(nombre, simbolo),
      creador:perfiles(nombre),
      ingredientes:receta_ingredientes(
        *,
        ingrediente:ingredientes(nombre),
        unidad:unidades_medida(nombre, simbolo)
      )
    `)
    .order('nombre')

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  }

  query = withRange(query, opts)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countRecetas(params = {}) {
  let query = supabase
    .from('recetas')
    .select('*', { count: 'exact', head: true })
  if (params.empresa_id) query = query.eq('empresa_id', params.empresa_id)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function fetchRecetaById(id) {
  const { data, error } = await supabase
    .from('recetas')
    .select(`
      *,
      categoria:categorias_receta(nombre),
      unidad:unidades_medida(nombre, simbolo),
      ingredientes:receta_ingredientes(
        *,
        ingrediente:ingredientes(nombre),
        unidad:unidades_medida(nombre, simbolo)
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createReceta(values) {
  const { ingredientes, ...receta } = values
  const empresaId = values.empresa_id

  const { data: recetaCreada, error: errReceta } = await supabase
    .from('recetas')
    .insert({ ...receta, creado_por: values.creado_por })
    .select()
    .single()
  if (errReceta) throw errReceta

  if (ingredientes?.length) {
    const { error: errIng } = await supabase
      .from('receta_ingredientes')
      .insert(ingredientes.map(i => ({ ...i, receta_id: recetaCreada.id, empresa_id: empresaId })))
    if (errIng) throw errIng
  }

  try {
    const prodCategoriaId = await getProductCategoryFromRecipe(recetaCreada.categoria_id)
    if (prodCategoriaId) {
      const { data: costo } = await supabase
        .rpc('calcular_costo_receta', { p_receta_id: recetaCreada.id })
      if (costo != null) {
        await supabase.from('recetas').update({ costo_estimado: costo }).eq('id', recetaCreada.id)
      }
      const precioVenta = costo != null ? Number((Number(costo) * 3).toFixed(4)) : 0
      await supabase.from('productos').insert({
        nombre: recetaCreada.nombre,
        categoria_id: prodCategoriaId,
        receta_id: recetaCreada.id,
        precio_venta: precioVenta,
        activo: false,
        empresa_id: empresaId,
      })
    }
  } catch (e) {
    console.error('Error al auto-crear producto:', e)
  }

  return fetchRecetaById(recetaCreada.id)
}

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

export async function deleteReceta(id) {
  const { data, error } = await supabase.from('recetas').update({ activa: false }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ─── Cálculo de Costos ───────────────────────────────

export async function calcularCostoRecetaRPC(recetaId) {
  const { data, error } = await supabase.rpc('calcular_costo_receta', { p_receta_id: recetaId })
  if (error) throw error
  return data
}

export async function calcularCostoProducto(receta, producto) {
  if (!receta || !producto) return 0
  if (!receta.costo_estimado || !producto.peso_unitario_gr || !receta.rendimiento_cantidad) return 0
  const factor = producto.peso_unitario_gr / receta.rendimiento_cantidad
  return receta.costo_estimado * factor
}
