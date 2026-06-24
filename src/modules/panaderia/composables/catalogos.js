import { supabase } from './_helpers'

// ─── Categorías (factory) ────────────────────────────

function createCategoriaCrud(table) {
  const fetchFn = () =>
    supabase.from(table).select('*').order('nombre').then(r => { if (r.error) throw r.error; return r.data })
  const createFn = (values) =>
    supabase.from(table).insert(values).select().single().then(r => { if (r.error) throw r.error; return r.data })
  const updateFn = (id, values) =>
    supabase.from(table).update(values).eq('id', id).select().single().then(r => { if (r.error) throw r.error; return r.data })
  const deleteFn = (id) =>
    supabase.from(table).delete().eq('id', id).then(r => { if (r.error) throw r.error })
  return { fetch: fetchFn, create: createFn, update: updateFn, delete: deleteFn }
}

const categorias_receta = createCategoriaCrud('categorias_receta')
const categorias_ingrediente = createCategoriaCrud('categorias_ingrediente')
const categorias_producto = createCategoriaCrud('categorias_producto')

export const fetchCategoriasReceta = categorias_receta.fetch
export const createCategoriaReceta = categorias_receta.create
export const updateCategoriaReceta = categorias_receta.update
export const deleteCategoriaReceta = categorias_receta.delete

export const fetchCategoriasIngrediente = categorias_ingrediente.fetch
export const createCategoriaIngrediente = categorias_ingrediente.create
export const updateCategoriaIngrediente = categorias_ingrediente.update
export const deleteCategoriaIngrediente = categorias_ingrediente.delete

export const fetchCategoriasProducto = categorias_producto.fetch
export const createCategoriaProducto = categorias_producto.create
export const updateCategoriaProducto = categorias_producto.update
export const deleteCategoriaProducto = categorias_producto.delete

// ─── Unidades de Medida ──────────────────────────────

export async function fetchUnidadesMedida() {
  const { data, error } = await supabase.from('unidades_medida').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function createUnidadMedida(values) {
  const { data, error } = await supabase.from('unidades_medida').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateUnidadMedida(id, values) {
  const { data, error } = await supabase.from('unidades_medida').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteUnidadMedida(id) {
  const { error } = await supabase.from('unidades_medida').delete().eq('id', id)
  if (error) throw error
}

// ─── Conversiones de Unidades ────────────────────────

export async function fetchConversionesUnidades() {
  const { data, error } = await supabase
    .from('conversiones_unidades')
    .select(`
      *,
      origen:unidad_origen_id(nombre, simbolo),
      destino:unidad_destino_id(nombre, simbolo)
    `)
    .order('unidad_origen_id')
  if (error) throw error
  return data
}

export async function createConversionUnidad(values) {
  const { data, error } = await supabase.from('conversiones_unidades').insert({
    unidad_origen_id: Number(values.unidad_origen_id),
    unidad_destino_id: Number(values.unidad_destino_id),
    factor_multiplicacion: Number(values.factor_multiplicacion),
  }).select().single()
  if (error) throw error
  return data
}

export async function updateConversionUnidad(id, values) {
  const { data, error } = await supabase.from('conversiones_unidades').update({
    unidad_origen_id: Number(values.unidad_origen_id),
    unidad_destino_id: Number(values.unidad_destino_id),
    factor_multiplicacion: Number(values.factor_multiplicacion),
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteConversionUnidad(id) {
  const { error } = await supabase.from('conversiones_unidades').delete().eq('id', id)
  if (error) throw error
}
