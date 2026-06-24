import { supabase, withRange } from './_helpers'

// ─── Helper: categoría de producto desde receta ──────
// (compartido con recetas.js pero necesario acá para
//  generarProductosFaltantes sin importar de recetas)

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

// ─── Productos ───────────────────────────────────────

export async function fetchProductos(empresaId, opts = {}) {
  let query = supabase
    .from('productos')
    .select(`
      *,
      categoria:categorias_producto(nombre),
      receta:recetas(nombre)
    `)
    .order('nombre')

  if (empresaId) query = query.eq('empresa_id', empresaId)
  query = withRange(query, opts)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countProductos(params = {}) {
  let query = supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })
  if (params.empresa_id) query = query.eq('empresa_id', params.empresa_id)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function createProducto(values) {
  const { data, error } = await supabase.from('productos').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateProducto(id, values) {
  const { data, error } = await supabase.from('productos').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProducto(id) {
  const { data, error } = await supabase.from('productos').update({ activo: false }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function fetchPrecioCostoProducto(productoId) {
  const { data, error } = await supabase
    .from('productos')
    .select('precio_costo')
    .eq('id', productoId)
    .single()
  if (error) throw error
  return data?.precio_costo ?? 0
}

// ─── Generar productos faltantes ─────────────────────

export async function generarProductosFaltantes(empresaId) {
  const { data: productos } = await supabase
    .from('productos')
    .select('receta_id')
    .not('receta_id', 'is', null)

  const recetasConProducto = new Set(productos?.map(p => p.receta_id) ?? [])

  const { data: recetas, error: errRecetas } = await supabase
    .from('recetas')
    .select('id, nombre, categoria_id, costo_estimado, empresa_id')
    .eq('empresa_id', empresaId)

  if (errRecetas) throw errRecetas

  const pendientes = (recetas ?? []).filter(r => !recetasConProducto.has(r.id))
  let creados = 0

  for (const receta of pendientes) {
    const prodCategoriaId = await getProductCategoryFromRecipe(receta.categoria_id)
    if (!prodCategoriaId) continue

    let precioVenta = 0
    let costo = receta.costo_estimado
    if (costo == null || costo === 0) {
      const { data: costoCalculado } = await supabase
        .rpc('calcular_costo_receta', { p_receta_id: receta.id })
      costo = costoCalculado
      if (costo != null) {
        await supabase.from('recetas').update({ costo_estimado: costo }).eq('id', receta.id)
      }
    }
    precioVenta = costo != null ? Number((Number(costo) * 3).toFixed(4)) : 0

    const { error } = await supabase.from('productos').insert({
      nombre: receta.nombre,
      categoria_id: prodCategoriaId,
      receta_id: receta.id,
      precio_venta: precioVenta,
      activo: false,
      empresa_id: empresaId,
    })
    if (!error) creados++
  }

  return { creados, total: pendientes.length }
}
