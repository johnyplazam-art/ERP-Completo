import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/core/supabase'

// Mock supabase — same pattern as app.spec.js
function makeChain(resolvedValue = { data: [], error: null }) {
  const then = (resolve) => resolve(resolvedValue)
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    neq: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(resolvedValue)),
    maybeSingle: vi.fn(() => Promise.resolve(resolvedValue)),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    range: vi.fn(() => query),
    limit: vi.fn(() => query),
    in: vi.fn(() => query),
    then,
  }
  return query
}

vi.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Conversiones Unidades ──────────────────────────────

describe('conversiones_unidades', () => {
  let mod

  beforeAll(async () => {
    mod = await import('@/modules/panaderia/composables/database')
  })

  it('fetchConversionesUnidades — selects with joins ordered by origen', async () => {
    const chain = makeChain({ data: [{ id: 1, factor_multiplicacion: 1000 }], error: null })
    supabase.from.mockReturnValue(chain)

    const result = await mod.fetchConversionesUnidades()

    expect(supabase.from).toHaveBeenCalledWith('conversiones_unidades')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('origen:unidad_origen_id'))
    expect(chain.order).toHaveBeenCalledWith('unidad_origen_id')
    expect(result).toHaveLength(1)
    expect(result[0].factor_multiplicacion).toBe(1000)
  })

  it('createConversionUnidad — inserts with number coercion', async () => {
    const chain = makeChain({ data: { id: 1, factor_multiplicacion: 1000 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.createConversionUnidad({ unidad_origen_id: '1', unidad_destino_id: '2', factor_multiplicacion: '1000' })

    expect(supabase.from).toHaveBeenCalledWith('conversiones_unidades')
    expect(chain.insert).toHaveBeenCalledWith({
      unidad_origen_id: 1,
      unidad_destino_id: 2,
      factor_multiplicacion: 1000,
    })
  })

  it('updateConversionUnidad — updates by id with number coercion', async () => {
    const chain = makeChain({ data: { id: 1, factor_multiplicacion: 500 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.updateConversionUnidad(1, { unidad_origen_id: '3', unidad_destino_id: '4', factor_multiplicacion: '500' })

    expect(supabase.from).toHaveBeenCalledWith('conversiones_unidades')
    expect(chain.update).toHaveBeenCalledWith({
      unidad_origen_id: 3,
      unidad_destino_id: 4,
      factor_multiplicacion: 500,
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteConversionUnidad — deletes by id', async () => {
    const chain = makeChain({ error: null })
    supabase.from.mockReturnValue(chain)

    await mod.deleteConversionUnidad(5)

    expect(supabase.from).toHaveBeenCalledWith('conversiones_unidades')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 5)
  })

  it('throws on error', async () => {
    supabase.from.mockReturnValue(makeChain({ data: null, error: new Error('db error') }))

    await expect(mod.fetchConversionesUnidades()).rejects.toThrow('db error')
  })
})

// ─── Ingrediente-Proveedor ──────────────────────────────

describe('ingrediente_proveedor', () => {
  let mod

  beforeAll(async () => {
    mod = await import('@/modules/panaderia/composables/database')
  })

  it('fetchIngredientesProveedor — filters by proveedor_id with join', async () => {
    const chain = makeChain({ data: [{ id: 1, precio_actual: 150 }], error: null })
    supabase.from.mockReturnValue(chain)

    const result = await mod.fetchIngredientesProveedor(3)

    expect(supabase.from).toHaveBeenCalledWith('ingrediente_proveedor')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('ingrediente:ingredientes(nombre, activo)'))
    expect(chain.eq).toHaveBeenCalledWith('proveedor_id', 3)
    expect(chain.order).toHaveBeenCalledWith('ingrediente_id')
    expect(result).toHaveLength(1)
  })

  it('createIngredienteProveedor — inserts with number coercion and defaults', async () => {
    const chain = makeChain({ data: { id: 1, precio_actual: 250 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.createIngredienteProveedor({
      ingrediente_id: '5',
      proveedor_id: '3',
      precio_actual: '250.50',
      plazo_entrega_dias: '7',
      es_preferido: true,
    })

    expect(chain.insert).toHaveBeenCalledWith({
      ingrediente_id: 5,
      proveedor_id: 3,
      precio_actual: 250.5,
      plazo_entrega_dias: 7,
      es_preferido: true,
    })
  })

  it('createIngredienteProveedor — defaults plazo to null and preferido to false', async () => {
    const chain = makeChain({ data: { id: 2 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.createIngredienteProveedor({
      ingrediente_id: '1',
      proveedor_id: '1',
      precio_actual: '100',
    })

    expect(chain.insert).toHaveBeenCalledWith({
      ingrediente_id: 1,
      proveedor_id: 1,
      precio_actual: 100,
      plazo_entrega_dias: null,
      es_preferido: false,
    })
  })

  it('updateIngredienteProveedor — updates price/plazo/preferido by id', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.updateIngredienteProveedor(1, { precio_actual: '300', plazo_entrega_dias: '5', es_preferido: true })

    expect(chain.update).toHaveBeenCalledWith({
      precio_actual: 300,
      plazo_entrega_dias: 5,
      es_preferido: true,
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteIngredienteProveedor — deletes by id', async () => {
    const chain = makeChain({ error: null })
    supabase.from.mockReturnValue(chain)

    await mod.deleteIngredienteProveedor(10)

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 10)
  })
})

// ─── Movimientos PT ─────────────────────────────────────

describe('movimientos_inventario_pt', () => {
  let mod

  beforeAll(async () => {
    mod = await import('@/modules/panaderia/composables/database')
  })

  it('fetchMovimientosPt — selects with join ordered by fecha desc, limit 50', async () => {
    const chain = makeChain({ data: [{ id: 1, cantidad: 10 }], error: null })
    supabase.from.mockReturnValue(chain)

    const result = await mod.fetchMovimientosPt()

    expect(supabase.from).toHaveBeenCalledWith('movimientos_inventario_pt')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('producto:producto_id(nombre)'))
    expect(chain.order).toHaveBeenCalledWith('fecha', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(50)
    expect(result).toHaveLength(1)
  })

  it('fetchMovimientosPt — filters by producto_id when provided', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)

    await mod.fetchMovimientosPt(7)

    expect(chain.eq).toHaveBeenCalledWith('producto_id', 7)
  })

  it('crearMovimientoPt — inserts values', async () => {
    const chain = makeChain({ data: { id: 1, cantidad: 20 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.crearMovimientoPt({ producto_id: 1, tipo: 'ingreso', cantidad: 20 })

    expect(supabase.from).toHaveBeenCalledWith('movimientos_inventario_pt')
    expect(chain.insert).toHaveBeenCalledWith({ producto_id: 1, tipo: 'ingreso', cantidad: 20 })
  })
})

// ─── Mermas ─────────────────────────────────────────────

describe('mermas', () => {
  let mod

  beforeAll(async () => {
    mod = await import('@/modules/panaderia/composables/database')
  })

  it('fetchMermas — selects with joins ordered by fecha_registro desc', async () => {
    const chain = makeChain({ data: [{ id: 1, causa: 'rotura' }], error: null })
    supabase.from.mockReturnValue(chain)

    const result = await mod.fetchMermas()

    expect(supabase.from).toHaveBeenCalledWith('mermas')
    expect(chain.select).toHaveBeenCalledWith(`
      *,
      ingrediente:ingrediente_id(nombre),
      producto:producto_id(nombre),
      unidad:unidad_id(nombre, simbolo),
      registrado_por:registrado_por(nombre)
    `)
    expect(chain.order).toHaveBeenCalledWith('fecha_registro', { ascending: false })
    expect(result).toHaveLength(1)
  })

  it('fetchMermas — filters by empresa_id when provided', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)

    await mod.fetchMermas(5)

    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 5)
  })

  it('createMerma — inserts with null coalescing', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.createMerma({
      origen: 'mp',
      ingrediente_id: 3,
      producto_id: null,
      cantidad: 5.5,
      unidad_id: 2,
      tipo: 'operativa',
      causa: 'derrame',
      empresa_id: 1,
      registrado_por: 'uuid-123',
    })

    expect(chain.insert).toHaveBeenCalledWith({
      origen: 'mp',
      ingrediente_id: 3,
      producto_id: null,
      cantidad: 5.5,
      unidad_id: 2,
      tipo: 'operativa',
      causa: 'derrame',
      empresa_id: 1,
      registrado_por: 'uuid-123',
    })
  })

  it('updateMerma — updates by id', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.updateMerma(1, { origen: 'pt', cantidad: 10, tipo: 'caducidad', causa: 'vencido' })

    expect(chain.update).toHaveBeenCalledWith({
      origen: 'pt',
      ingrediente_id: null,
      producto_id: null,
      cantidad: 10,
      unidad_id: null,
      tipo: 'caducidad',
      causa: 'vencido',
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteMerma — deletes by id', async () => {
    const chain = makeChain({ error: null })
    supabase.from.mockReturnValue(chain)

    await mod.deleteMerma(3)

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 3)
  })

  it('countMermas — returns count, filtered by empresa', async () => {
    const chain = makeChain({})
    supabase.from.mockReturnValue(chain)

    await mod.countMermas(2)

    expect(supabase.from).toHaveBeenCalledWith('mermas')
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 2)
  })
})
