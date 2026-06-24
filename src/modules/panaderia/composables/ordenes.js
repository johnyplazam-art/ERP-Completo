import { supabase, withRange } from './_helpers'

// ─── Órdenes de Producción ───────────────────────────

export async function fetchOrdenProduccion(id) {
  const { data, error } = await supabase
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
    .eq('id', id)
    .single()
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

export async function updateOrdenProduccion(id, values) {
  const { detalles, ...orden } = values

  const { error: errOrden } = await supabase
    .from('ordenes_produccion')
    .update(orden)
    .eq('id', id)
  if (errOrden) throw errOrden

  if (detalles) {
    const { error: errDel } = await supabase
      .from('orden_produccion_detalle')
      .delete()
      .eq('orden_id', id)
    if (errDel) throw errDel

    if (detalles.length) {
      let costoTotal = 0
      const detalleRows = await Promise.all(detalles.map(async (d) => {
        const precioCosto = await fetchPrecioCostoProducto(d.producto_id)
        const costoLinea = precioCosto * (d.cantidad_programada || 0)
        costoTotal += costoLinea
        return {
          orden_id: id,
          producto_id: d.producto_id,
          receta_id: d.receta_id,
          cantidad_programada: Number(d.cantidad_programada),
          cantidad_producida: Number(d.cantidad_producida || 0),
          lote: d.lote || '',
          empresa_id: orden.empresa_id,
          costo_unitario_estimado: precioCosto,
          costo_total_estimado: costoLinea,
        }
      }))

      const { error: errIns } = await supabase
        .from('orden_produccion_detalle')
        .insert(detalleRows)
      if (errIns) throw errIns

      if (costoTotal > 0) {
        const { error: errCosto } = await supabase
          .from('ordenes_produccion')
          .update({ costo_total_estimado: costoTotal })
          .eq('id', id)
        if (errCosto) throw errCosto
      }
    }
  }

  return fetchOrdenProduccion(id)
}

export async function fetchOrdenesProduccion(empresaId, opts = {}) {
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

  if (empresaId) query = query.eq('empresa_id', empresaId)
  query = withRange(query, opts)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function countOrdenesProduccion(params = {}) {
  let query = supabase
    .from('ordenes_produccion')
    .select('*', { count: 'exact', head: true })
  if (params.empresa_id) query = query.eq('empresa_id', params.empresa_id)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function createOrdenProduccion(values) {
  const { detalles, ...orden } = values
  const empresaId = orden.empresa_id

  const { data: ordenCreada, error: errOrden } = await supabase
    .from('ordenes_produccion')
    .insert({ ...orden, usuario_responsable_id: orden.usuario_responsable_id })
    .select()
    .single()
  if (errOrden) throw errOrden

  let costoTotal = 0

  if (detalles?.length) {
    const detalleRows = await Promise.all(detalles.map(async (d) => {
      const precioCosto = await fetchPrecioCostoProducto(d.producto_id)
      const costoLinea = precioCosto * (d.cantidad_programada || 0)
      costoTotal += costoLinea
      return {
        ...d,
        orden_id: ordenCreada.id,
        empresa_id: empresaId,
        costo_unitario_estimado: precioCosto,
        costo_total_estimado: costoLinea,
      }
    }))

    const { error: errDet } = await supabase
      .from('orden_produccion_detalle')
      .insert(detalleRows)
    if (errDet) throw errDet
  }

  if (costoTotal > 0) {
    const { error: errCosto } = await supabase
      .from('ordenes_produccion')
      .update({ costo_total_estimado: costoTotal })
      .eq('id', ordenCreada.id)
    if (errCosto) throw errCosto
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

// ─── Cálculo de Materia Prima ────────────────────────

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
export async function descontarIngredientesOrden(ordenId, detalles, empresaId, usuarioId) {
  const ingredientes = await calcularIngredientesNecesarios(detalles)
  if (!ingredientes.length) return

  const movimientos = ingredientes.map(ing => ({
    ingrediente_id: ing.ingrediente_id,
    tipo: 'egreso',
    cantidad: -ing.cantidad_total,
    unidad_id: null,
    empresa_id: empresaId,
    motivo: `Consumo orden #${ordenId}`,
    orden_detalle_id: null,
    nota: `Consumo automático`,
    creado_por: usuarioId,
  }))

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
