import { supabase, withRange } from './_helpers'

// ─── Proveedores ─────────────────────────────────────

export async function fetchProveedores(empresaId, opts = {}) {
  let query = supabase
    .from('proveedores')
    .select(`
      *,
      ingredientes:ingrediente_proveedor(
        *,
        ingrediente:ingredientes(nombre)
      )
    `)
    .order('nombre')

  if (empresaId) query = query.eq('empresa_id', empresaId)
  query = withRange(query, opts)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countProveedores(params = {}) {
  let query = supabase
    .from('proveedores')
    .select('*', { count: 'exact', head: true })
  if (params.empresa_id) query = query.eq('empresa_id', params.empresa_id)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function createProveedor(values) {
  const { data, error } = await supabase.from('proveedores').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateProveedor(id, values) {
  const { data, error } = await supabase.from('proveedores').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProveedor(id) {
  const { data, error } = await supabase.from('proveedores').update({ activo: false }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ─── Ingrediente-Proveedor (precios) ─────────────────

export async function fetchIngredientesProveedor(proveedorId) {
  const { data, error } = await supabase
    .from('ingrediente_proveedor')
    .select(`
      *,
      ingrediente:ingredientes(nombre, activo)
    `)
    .eq('proveedor_id', proveedorId)
    .order('ingrediente_id')
  if (error) throw error
  return data
}

export async function fetchProveedoresByIngrediente(ingredienteId) {
  const { data, error } = await supabase
    .from('ingrediente_proveedor')
    .select(`
      *,
      proveedor:proveedores(nombre, activo)
    `)
    .eq('ingrediente_id', ingredienteId)
    .order('precio_actual', { ascending: true })
  if (error) throw error
  return data
}

export async function createIngredienteProveedor(values) {
  const { data, error } = await supabase.from('ingrediente_proveedor').insert({
    ingrediente_id: Number(values.ingrediente_id),
    proveedor_id: Number(values.proveedor_id),
    precio_actual: Number(values.precio_actual),
    plazo_entrega_dias: values.plazo_entrega_dias ? Number(values.plazo_entrega_dias) : null,
    es_preferido: values.es_preferido ?? false,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateIngredienteProveedor(id, values) {
  const { data, error } = await supabase.from('ingrediente_proveedor').update({
    precio_actual: Number(values.precio_actual),
    plazo_entrega_dias: values.plazo_entrega_dias ? Number(values.plazo_entrega_dias) : null,
    es_preferido: values.es_preferido ?? false,
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteIngredienteProveedor(id) {
  const { error } = await supabase.from('ingrediente_proveedor').delete().eq('id', id)
  if (error) throw error
}
