import { supabase, withRange } from './_helpers'

// ─── Mermas ────────────────────────────────────────────

export async function fetchMermas(empresaId, opts = {}) {
  let query = supabase
    .from('mermas')
    .select(`
      *,
      ingrediente:ingrediente_id(nombre),
      producto:producto_id(nombre),
      unidad:unidad_id(nombre, simbolo),
      registrado_por:registrado_por(nombre)
    `)
    .order('fecha_registro', { ascending: false })

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  }

  query = withRange(query, opts)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createMerma(values) {
  const { data, error } = await supabase.from('mermas').insert({
    origen: values.origen,
    ingrediente_id: values.ingrediente_id || null,
    producto_id: values.producto_id || null,
    cantidad: Number(values.cantidad),
    unidad_id: values.unidad_id || null,
    tipo: values.tipo,
    causa: values.causa || '',
    empresa_id: values.empresa_id,
    registrado_por: values.registrado_por,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateMerma(id, values) {
  const { data, error } = await supabase.from('mermas').update({
    origen: values.origen,
    ingrediente_id: values.ingrediente_id || null,
    producto_id: values.producto_id || null,
    cantidad: Number(values.cantidad),
    unidad_id: values.unidad_id || null,
    tipo: values.tipo,
    causa: values.causa || '',
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteMerma(id) {
  const { error } = await supabase.from('mermas').delete().eq('id', id)
  if (error) throw error
}

export async function countMermas(empresaId) {
  let query = supabase.from('mermas').select('id', { count: 'exact', head: true })
  if (empresaId) query = query.eq('empresa_id', empresaId)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}
