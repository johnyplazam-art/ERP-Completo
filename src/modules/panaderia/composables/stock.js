import { supabase, withRange } from './_helpers'
import { fetchProductos } from './productos'

// ─── Movimientos MP ──────────────────────────────────

export async function fetchMovimientosMp(ingredienteId, opts = {}) {
  let query = supabase
    .from('movimientos_inventario_mp')
    .select(`
      *,
      ingrediente:ingredientes(nombre),
      unidad:unidades_medida(nombre, simbolo)
    `)
    .order('fecha', { ascending: false })

  if (ingredienteId) {
    query = query.eq('ingrediente_id', ingredienteId)
  }

  query = withRange(query, opts)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countMovimientosMp(ingredienteId) {
  let query = supabase
    .from('movimientos_inventario_mp')
    .select('*', { count: 'exact', head: true })
  if (ingredienteId) query = query.eq('ingrediente_id', ingredienteId)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
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

// ─── Movimientos PT ──────────────────────────────────

export async function fetchMovimientosPt(productoId, opts = {}) {
  let query = supabase
    .from('movimientos_inventario_pt')
    .select(`
      *,
      producto:producto_id(nombre)
    `)
    .order('fecha', { ascending: false })

  if (productoId) {
    query = query.eq('producto_id', productoId)
  }

  query = withRange(query, opts)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countMovimientosPt(productoId) {
  let query = supabase
    .from('movimientos_inventario_pt')
    .select('*', { count: 'exact', head: true })
  if (productoId) query = query.eq('producto_id', productoId)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function crearMovimientoPt(values) {
  const { data, error } = await supabase
    .from('movimientos_inventario_pt')
    .insert({
      producto_id: values.producto_id,
      tipo: values.tipo || 'ingreso',
      cantidad: Number(values.cantidad),
      precio_unitario: values.precio_unitario != null ? Number(values.precio_unitario) : 0,
      nota: values.nota || '',
      empresa_id: values.empresa_id,
      creado_por: values.creado_por,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Stock queries ───────────────────────────────────

export async function fetchProductosConStock(empresaId) {
  const productos = await fetchProductos(empresaId)

  const { data: movimientos, error } = await supabase
    .from('movimientos_inventario_pt')
    .select('producto_id, cantidad, tipo, precio_unitario')
  if (error) throw error

  const stockMap = {}
  const valorMap = {}

  for (const m of movimientos) {
    const pid = m.producto_id
    if (!stockMap[pid]) {
      stockMap[pid] = { cantidad: 0, valorIngresos: 0, cantIngresos: 0 }
    }
    const cant = Number(m.cantidad)
    if (m.tipo === 'ingreso') {
      stockMap[pid].cantidad += cant
      stockMap[pid].valorIngresos += cant * Number(m.precio_unitario || 0)
      stockMap[pid].cantIngresos += cant
    } else {
      stockMap[pid].cantidad -= Math.abs(cant)
    }
  }

  return productos.map(p => {
    const s = stockMap[p.id] || { cantidad: 0, valorIngresos: 0, cantIngresos: 0 }
    const precioProm = s.cantIngresos > 0 ? s.valorIngresos / s.cantIngresos : 0
    return {
      ...p,
      stock_actual: s.cantidad,
      valor_total: s.cantidad * precioProm,
      precio_promedio: precioProm,
    }
  })
}

export async function fetchStockProducto(id) {
  const { data, error } = await supabase.rpc('stock_producto', { p_producto_id: id })
  if (error) throw error
  return data
}

export async function fetchStockValorizadoTotal(empresaId) {
  const { data, error } = await supabase
    .from('movimientos_inventario_mp')
    .select('precio_unitario, cantidad, tipo, ingrediente:ingredientes!inner(empresa_id)')
    .eq('ingrediente.empresa_id', empresaId)
  if (error) throw error

  let ingCant = 0
  let ingValor = 0
  let neto = 0

  for (const m of data) {
    const cant = Number(m.cantidad)
    if (m.tipo === 'ingreso') {
      ingCant += cant
      ingValor += cant * Number(m.precio_unitario || 0)
      neto += cant
    } else if (['egreso', 'ajuste', 'merma'].includes(m.tipo)) {
      neto -= cant
    }
  }

  if (ingCant <= 0 || neto <= 0) return 0
  return (ingValor / ingCant) * neto
}

export async function fetchStockValorizado(tipo, itemId) {
  const { data, error } = await supabase.rpc('stock_valorizado', { p_tipo: tipo, p_item_id: itemId })
  if (error) throw error
  return data?.[0] ?? { cantidad_total: 0, valor_total: 0, precio_promedio: 0 }
}

export async function fetchStockIngrediente(id) {
  const { data, error } = await supabase.rpc('stock_ingrediente', { p_ingrediente_id: id })
  if (error) throw error
  return data
}
