import { supabase } from '@/core/supabase'

// ─── Categorías ──────────────────────────────────────

export async function fetchCategoriasReceta() {
  const { data, error } = await supabase.from('categorias_receta').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function createCategoriaReceta(values) {
  const { data, error } = await supabase.from('categorias_receta').insert(values).select().single()
  if (error) throw error
  return data
}

export async function fetchCategoriasIngrediente() {
  const { data, error } = await supabase.from('categorias_ingrediente').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function fetchCategoriasProducto() {
  const { data, error } = await supabase.from('categorias_producto').select('*').order('nombre')
  if (error) throw error
  return data
}

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

  const { data, error } = await query
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

export async function fetchProveedores() {
  const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function createProveedor(values) {
  const { data, error } = await supabase.from('proveedores').insert(values).select().single()
  if (error) throw error
  return data
}

// ─── Recetas ─────────────────────────────────────────

export async function fetchRecetas() {
  const { data, error } = await supabase
    .from('recetas')
    .select(`
      *,
      categoria:categorias_receta(nombre),
      unidad:unidades_medida(nombre, simbolo),
      creador:perfiles(nombre)
    `)
    .order('nombre')
  if (error) throw error
  return data
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

  const { data: recetaCreada, error: errReceta } = await supabase
    .from('recetas')
    .insert({ ...receta, creado_por: (await supabase.auth.getUser()).data.user?.id })
    .select()
    .single()
  if (errReceta) throw errReceta

  if (ingredientes?.length) {
    const { error: errIng } = await supabase
      .from('receta_ingredientes')
      .insert(ingredientes.map(i => ({ ...i, receta_id: recetaCreada.id })))
    if (errIng) throw errIng
  }

  return fetchRecetaById(recetaCreada.id)
}

// ─── Productos ───────────────────────────────────────

export async function fetchProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      categoria:categorias_producto(nombre),
      receta:recetas(nombre)
    `)
    .order('nombre')
  if (error) throw error
  return data
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

// ─── Órdenes de Producción ───────────────────────────

export async function fetchOrdenesProduccion() {
  const { data, error } = await supabase
    .from('ordenes_produccion')
    .select(`
      *,
      responsable:perfiles!ordenes_produccion_usuario_responsable_id_fkey(nombre),
      detalles:orden_produccion_detalle(
        *,
        producto:productos(nombre),
        receta:recetas(nombre)
      )
    `)
    .order('fecha_programada', { ascending: false })
  if (error) throw error
  return data
}

export async function createOrdenProduccion(values) {
  const { detalles, ...orden } = values
  const user = (await supabase.auth.getUser()).data.user

  const { data: ordenCreada, error: errOrden } = await supabase
    .from('ordenes_produccion')
    .insert({ ...orden, usuario_responsable_id: user?.id })
    .select()
    .single()
  if (errOrden) throw errOrden

  if (detalles?.length) {
    const { error: errDet } = await supabase
      .from('orden_produccion_detalle')
      .insert(detalles.map(d => ({ ...d, orden_id: ordenCreada.id })))
    if (errDet) throw errDet
  }

  return ordenCreada
}

export async function updateOrdenEstado(id, estado) {
  const now = new Date().toISOString()
  const updates = { estado }
  if (estado === 'en_proceso') updates.fecha_inicio = now
  if (estado === 'completada') updates.fecha_fin = now

  const { data, error } = await supabase
    .from('ordenes_produccion')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Movimientos / Stock ─────────────────────────────

export async function fetchMovimientosMp(ingredienteId) {
  let query = supabase
    .from('movimientos_inventario_mp')
    .select(`
      *,
      ingrediente:ingredientes(nombre),
      unidad:unidades_medida(nombre, simbolo)
    `)
    .order('fecha', { ascending: false })
    .limit(50)

  if (ingredienteId) {
    query = query.eq('ingrediente_id', ingredienteId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function crearMovimientoMp(values) {
  const { data, error } = await supabase
    .from('movimientos_inventario_mp')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchStockIngrediente(id) {
  const { data, error } = await supabase.rpc('stock_ingrediente', { p_ingrediente_id: id })
  if (error) throw error
  return data
}
