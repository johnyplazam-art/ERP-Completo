import { supabase, withRange } from './_helpers'

// ─── Ingredientes ────────────────────────────────────

export async function fetchIngredientes(params = {}) {
  let query = supabase
    .from('ingredientes')
    .select(`
      *,
      categoria:categorias_ingrediente(nombre),
      unidad:unidades_medida(nombre, simbolo)
    `)
    .order('nombre')

  if (params.activo !== undefined) {
    query = query.eq('activo', params.activo)
  }
  if (params.categoria_id) {
    query = query.eq('categoria_id', params.categoria_id)
  }
  if (params.empresa_id) {
    query = query.eq('empresa_id', params.empresa_id)
  }

  query = withRange(query, params)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countIngredientes(params = {}) {
  let query = supabase
    .from('ingredientes')
    .select('*', { count: 'exact', head: true })

  if (params.activo !== undefined) query = query.eq('activo', params.activo)
  if (params.categoria_id) query = query.eq('categoria_id', params.categoria_id)
  if (params.empresa_id) query = query.eq('empresa_id', params.empresa_id)

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function fetchIngrediente(id) {
  const { data, error } = await supabase
    .from('ingredientes')
    .select(`
      *,
      categoria:categorias_ingrediente(nombre),
      unidad:unidades_medida(nombre, simbolo)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createIngrediente(values) {
  const { data, error } = await supabase.from('ingredientes').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateIngrediente(id, values) {
  const { data, error } = await supabase.from('ingredientes').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteIngrediente(id) {
  const { error } = await supabase.from('ingredientes').delete().eq('id', id)
  if (error) throw error
}

// ─── Precio de Ingrediente ───────────────────────────

export async function fetchPrecioIngrediente(ingredienteId) {
  const { data, error } = await supabase
    .from('ingrediente_proveedor')
    .select('precio_actual')
    .eq('ingrediente_id', ingredienteId)
    .eq('es_preferido', true)
    .order('precio_actual', { ascending: true })
    .limit(1)
  if (error) throw error
  if (data?.length) return data[0].precio_actual
  const { data: fallback } = await supabase
    .from('ingrediente_proveedor')
    .select('precio_actual')
    .eq('ingrediente_id', ingredienteId)
    .order('precio_actual', { ascending: true })
    .limit(1)
  if (fallback?.length) return fallback[0].precio_actual
  return 0
}
