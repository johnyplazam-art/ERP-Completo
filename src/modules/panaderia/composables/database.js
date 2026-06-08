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

export async function updateCategoriaReceta(id, values) {
  const { data, error } = await supabase.from('categorias_receta').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCategoriaReceta(id) {
  const { error } = await supabase.from('categorias_receta').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCategoriasIngrediente() {
  const { data, error } = await supabase.from('categorias_ingrediente').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function createCategoriaIngrediente(values) {
  const { data, error } = await supabase.from('categorias_ingrediente').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateCategoriaIngrediente(id, values) {
  const { data, error } = await supabase.from('categorias_ingrediente').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCategoriaIngrediente(id) {
  const { error } = await supabase.from('categorias_ingrediente').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCategoriasProducto() {
  const { data, error } = await supabase.from('categorias_producto').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function createCategoriaProducto(values) {
  const { data, error } = await supabase.from('categorias_producto').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateCategoriaProducto(id, values) {
  const { data, error } = await supabase.from('categorias_producto').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCategoriaProducto(id) {
  const { error } = await supabase.from('categorias_producto').delete().eq('id', id)
  if (error) throw error
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

export async function updateUnidadMedida(id, values) {
  const { data, error } = await supabase.from('unidades_medida').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteUnidadMedida(id) {
  const { error } = await supabase.from('unidades_medida').delete().eq('id', id)
  if (error) throw error
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
  if (params.empresa_id) {
    query = query.eq('empresa_id', params.empresa_id)
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

export async function deleteIngrediente(id) {
  const { error } = await supabase.from('ingredientes').delete().eq('id', id)
  if (error) throw error
}

export async function fetchProveedores(empresaId) {
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

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
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

// ─── Recetas ─────────────────────────────────────────

export async function fetchRecetas(empresaId) {
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

  const { data, error } = await query
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
  const empresaId = values.empresa_id

  const { data: recetaCreada, error: errReceta } = await supabase
    .from('recetas')
    .insert({ ...receta, creado_por: (await supabase.auth.getUser()).data.user?.id })
    .select()
    .single()
  if (errReceta) throw errReceta

  if (ingredientes?.length) {
    const { error: errIng } = await supabase
      .from('receta_ingredientes')
      .insert(ingredientes.map(i => ({ ...i, receta_id: recetaCreada.id, empresa_id: empresaId })))
    if (errIng) throw errIng
  }

  return fetchRecetaById(recetaCreada.id)
}

export async function updateReceta(id, values) {
  const { data, error } = await supabase.from('recetas').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteReceta(id) {
  const { data, error } = await supabase.from('recetas').update({ activa: false }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ─── Productos ───────────────────────────────────────

export async function fetchProductos(empresaId) {
  let query = supabase
    .from('productos')
    .select(`
      *,
      categoria:categorias_producto(nombre),
      receta:recetas(nombre)
    `)
    .order('nombre')

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  }

  const { data, error } = await query
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

export async function deleteProducto(id) {
  const { data, error } = await supabase.from('productos').update({ activo: false }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ─── Órdenes de Producción ───────────────────────────

export async function fetchOrdenesProduccion(empresaId) {
  let query = supabase
    .from('ordenes_produccion')
    .select(`
      *,
      responsable:perfiles(nombre),
      detalles:orden_produccion_detalle(
        *,
        producto:productos(nombre),
        receta:recetas(nombre)
      )
    `)
    .order('fecha_programada', { ascending: false })

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createOrdenProduccion(values) {
  const { detalles, ...orden } = values
  const user = (await supabase.auth.getUser()).data.user
  const empresaId = orden.empresa_id

  const { data: ordenCreada, error: errOrden } = await supabase
    .from('ordenes_produccion')
    .insert({ ...orden, usuario_responsable_id: user?.id })
    .select()
    .single()
  if (errOrden) throw errOrden

  if (detalles?.length) {
    const { error: errDet } = await supabase
      .from('orden_produccion_detalle')
      .insert(detalles.map(d => ({ ...d, orden_id: ordenCreada.id, empresa_id: empresaId })))
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

// ─── Cálculo de Materia Prima ──────────────────────────

/**
 * Toma los detalles de una orden y calcula las cantidades escaladas de ingredientes.
 * @param {Array} detalles - [{ producto_id, receta_id, cantidad_programada }]
 * @returns {Array} - [{ ingrediente_id, nombre, cantidad_total, simbolo_unidad }] agregados
 */
export async function calcularIngredientesNecesarios(detalles) {
  if (!detalles?.length) return []

  const uniqRecetas = [...new Set(detalles.map(d => d.receta_id))]
  const uniqProductos = [...new Set(detalles.map(d => d.producto_id))]

  // 1. Unidad de referencia — buscamos 'Gramo' por símbolo 'g'
  const { data: todasUnidades } = await supabase.from('unidades_medida').select('id, nombre, simbolo')
  const gramoId = todasUnidades?.find(u => u.simbolo === 'g')?.id

  // 2. Conversiones disponibles
  const { data: conversiones } = await supabase.from('conversiones_unidades').select('*')

  const encontrarConversion = (origenId, destinoId) => {
    if (origenId === destinoId) return 1
    return conversiones?.find(c => c.unidad_origen_id === origenId && c.unidad_destino_id === destinoId)?.factor_multiplicacion ?? null
  }

  // 3. Recetas con sus ingredientes
  const { data: recetasConIng } = await supabase
    .from('recetas')
    .select(`
      id, rendimiento_cantidad, rendimiento_unidad_id,
      ingredientes:receta_ingredientes(
        *,
        ingrediente:ingredientes(nombre),
        unidad:unidades_medida(simbolo)
      )
    `)
    .in('id', uniqRecetas)

  // 4. Productos (solo necesitamos peso)
  const { data: productos } = await supabase
    .from('productos')
    .select('id, peso_unitario_gr')
    .in('id', uniqProductos)

  const recetaMap = new Map(recetasConIng?.map(r => [r.id, r]))
  const productoMap = new Map(productos?.map(p => [p.id, p]))

  const agregados = new Map() // ingrediente_id -> { nombre, cantidad_total, simbolo_unidad }

  for (const det of detalles) {
    const receta = recetaMap.get(det.receta_id)
    const producto = productoMap.get(det.producto_id)
    if (!receta || !producto || !producto.peso_unitario_gr) continue

    // Convertir rendimiento de receta a gramos
    let rendimientoGr = Number(receta.rendimiento_cantidad)
    const factorConv = encontrarConversion(receta.rendimiento_unidad_id, gramoId)
    if (factorConv !== null) {
      rendimientoGr = rendimientoGr * factorConv
    } else {
      // Sin conversión a gramos — salteamos este detalle
      continue
    }

    if (rendimientoGr <= 0) continue

    const pesoTotalGr = Number(det.cantidad_programada) * Number(producto.peso_unitario_gr)
    const factor = pesoTotalGr / rendimientoGr

    for (const ing of (receta.ingredientes || [])) {
      const cantidadEscalada = Number(ing.cantidad) * factor
      const existente = agregados.get(ing.ingrediente_id)
      if (existente) {
        existente.cantidad_total += cantidadEscalada
      } else {
        agregados.set(ing.ingrediente_id, {
          ingrediente_id: ing.ingrediente_id,
          nombre: ing.ingrediente?.nombre || '?',
          cantidad_total: cantidadEscalada,
          simbolo_unidad: ing.unidad?.simbolo || '',
        })
      }
    }
  }

  return [...agregados.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/**
 * Descuenta del inventario los ingredientes necesarios para una orden.
 * Crea movimientos de egreso por cada ingrediente calculado.
 * @param {number} ordenId
 * @param {Array} detalles - [{ producto_id, receta_id, cantidad_programada, id }]
 */
export async function descontarIngredientesOrden(ordenId, detalles, empresaId) {
  const ingredientes = await calcularIngredientesNecesarios(detalles)
  if (!ingredientes.length) return

  const user = (await supabase.auth.getUser()).data.user

  const movimientos = ingredientes.map(ing => ({
    ingrediente_id: ing.ingrediente_id,
    tipo: 'egreso',
    cantidad: -ing.cantidad_total, // negativo = egreso
    unidad_id: null, // se resuelve del ingrediente
    empresa_id: empresaId,
    motivo: `Consumo orden #${ordenId}`,
    orden_detalle_id: null,
    nota: `Consumo automático`,
    creado_por: user?.id,
  }))

  // Necesitamos la unidad_base de cada ingrediente
  const ids = ingredientes.map(i => i.ingrediente_id)
  const { data: ingreds } = await supabase.from('ingredientes').select('id, unidad_base_id').in('id', ids)
  const baseMap = new Map(ingreds?.map(i => [i.id, i.unidad_base_id]))

  for (const m of movimientos) {
    const uid = baseMap.get(m.ingrediente_id)
    if (!uid) throw new Error(`Ingrediente ${m.ingrediente_id} sin unidad_base`)
    m.unidad_id = uid
  }

  const { error } = await supabase.from('movimientos_inventario_mp').insert(movimientos)
  if (error) throw error
}
