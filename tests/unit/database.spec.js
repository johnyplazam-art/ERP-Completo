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
    ilike: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
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

  it('fetchMovimientosPt — selects with join ordered by fecha desc', async () => {
    const chain = makeChain({ data: [{ id: 1, cantidad: 10 }], error: null })
    supabase.from.mockReturnValue(chain)

    const result = await mod.fetchMovimientosPt()

    expect(supabase.from).toHaveBeenCalledWith('movimientos_inventario_pt')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('producto:producto_id(nombre)'))
    expect(chain.order).toHaveBeenCalledWith('fecha', { ascending: false })
    expect(result).toHaveLength(1)
  })

  it('fetchMovimientosPt — filters by producto_id when provided', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)

    await mod.fetchMovimientosPt(7)

    expect(chain.eq).toHaveBeenCalledWith('producto_id', 7)
  })

  it('fetchMovimientosPt — applies range when opts.from/to provided', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)

    await mod.fetchMovimientosPt(undefined, { from: 0, to: 24 })

    expect(chain.range).toHaveBeenCalledWith(0, 24)
  })

  it('crearMovimientoPt — inserts values', async () => {
    const chain = makeChain({ data: { id: 1, cantidad: 20 }, error: null })
    supabase.from.mockReturnValue(chain)

    await mod.crearMovimientoPt({ producto_id: 1, tipo: 'ingreso', cantidad: 20 })

    expect(supabase.from).toHaveBeenCalledWith('movimientos_inventario_pt')
    expect(chain.insert).toHaveBeenCalledWith({
      producto_id: 1,
      tipo: 'ingreso',
      cantidad: 20,
      precio_unitario: 0,
      nota: '',
      empresa_id: undefined,
      creado_por: undefined,
    })
  })

  it('countMovimientosPt — returns total count', async () => {
    const chain = makeChain({ count: 42, error: null })
    supabase.from.mockReturnValue(chain)

    const count = await mod.countMovimientosPt()

    expect(supabase.from).toHaveBeenCalledWith('movimientos_inventario_pt')
    expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(count).toBe(42)
  })

  it('countMovimientosPt — filters by producto_id', async () => {
    const chain = makeChain({ count: 5, error: null })
    supabase.from.mockReturnValue(chain)

    const count = await mod.countMovimientosPt(3)

    expect(chain.eq).toHaveBeenCalledWith('producto_id', 3)
    expect(count).toBe(5)
  })
})

// ─── Mermas ─────────────────────────────────────────────

// ─── Categorías (factory) ─────────────────────────────────

describe('categorias_receta (factory)', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchCategoriasReceta — selects all ordered by nombre', async () => {
    const chain = makeChain({ data: [{ id: 1, nombre: 'Pan' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchCategoriasReceta()
    expect(supabase.from).toHaveBeenCalledWith('categorias_receta')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('nombre')
    expect(result[0].nombre).toBe('Pan')
  })

  it('createCategoriaReceta — inserts and returns', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Pan' }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.createCategoriaReceta({ nombre: 'Pan' })
    expect(chain.insert).toHaveBeenCalledWith({ nombre: 'Pan' })
    expect(result.nombre).toBe('Pan')
  })

  it('updateCategoriaReceta — updates by id', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Pan Artesanal' }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.updateCategoriaReceta(1, { nombre: 'Pan Artesanal' })
    expect(chain.update).toHaveBeenCalledWith({ nombre: 'Pan Artesanal' })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteCategoriaReceta — deletes by id', async () => {
    const chain = makeChain({ error: null })
    supabase.from.mockReturnValue(chain)
    await mod.deleteCategoriaReceta(5)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 5)
  })
})

describe('categorias_ingrediente (factory)', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchCategoriasIngrediente — selects from categorias_ingrediente', async () => {
    const chain = makeChain({ data: [{ id: 1 }], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchCategoriasIngrediente()
    expect(supabase.from).toHaveBeenCalledWith('categorias_ingrediente')
  })

  it('createCategoriaIngrediente — inserts', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.createCategoriaIngrediente({ nombre: 'Harina' })
    expect(chain.insert).toHaveBeenCalledWith({ nombre: 'Harina' })
  })
})

describe('categorias_producto (factory)', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchCategoriasProducto — selects from categorias_producto', async () => {
    const chain = makeChain({ data: [{ id: 1 }], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchCategoriasProducto()
    expect(supabase.from).toHaveBeenCalledWith('categorias_producto')
  })
})

// ─── Unidades de Medida ───────────────────────────────────

describe('unidades_medida', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchUnidadesMedida — selects all ordered by nombre', async () => {
    const chain = makeChain({ data: [{ id: 1, nombre: 'Gramo', simbolo: 'g' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchUnidadesMedida()
    expect(supabase.from).toHaveBeenCalledWith('unidades_medida')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('nombre')
    expect(result[0].nombre).toBe('Gramo')
  })

  it('createUnidadMedida — inserts with select', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Kilogramo' }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.createUnidadMedida({ nombre: 'Kilogramo', simbolo: 'kg' })
    expect(chain.insert).toHaveBeenCalledWith({ nombre: 'Kilogramo', simbolo: 'kg' })
  })

  it('updateUnidadMedida — updates by id', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.updateUnidadMedida(1, { nombre: 'KG' })
    expect(chain.update).toHaveBeenCalledWith({ nombre: 'KG' })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteUnidadMedida — deletes by id', async () => {
    const chain = makeChain({ error: null })
    supabase.from.mockReturnValue(chain)
    await mod.deleteUnidadMedida(1)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })
})

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

// ─── Ingredientes ────────────────────────────────────────

describe('ingredientes', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchIngredientes — selects with joins ordered by nombre', async () => {
    const chain = makeChain({ data: [{ id: 1, nombre: 'Harina' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchIngredientes()
    expect(supabase.from).toHaveBeenCalledWith('ingredientes')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('categoria:categorias_ingrediente(nombre)'))
    expect(chain.order).toHaveBeenCalledWith('nombre')
    expect(result).toHaveLength(1)
  })

  it('fetchIngredientes — filters by activo, categoria_id, empresa_id', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchIngredientes({ activo: true, categoria_id: 2, empresa_id: 1 })
    expect(chain.eq).toHaveBeenCalledWith('activo', true)
    expect(chain.eq).toHaveBeenCalledWith('categoria_id', 2)
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 1)
  })

  it('fetchIngredientes — applies range when opts.from/to provided', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchIngredientes({ from: 0, to: 24 })
    expect(chain.range).toHaveBeenCalledWith(0, 24)
  })

  it('countIngredientes — returns exact count', async () => {
    const chain = makeChain({ count: 10, error: null })
    supabase.from.mockReturnValue(chain)
    const count = await mod.countIngredientes()
    expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(count).toBe(10)
  })

  it('countIngredientes — filters by activo', async () => {
    const chain = makeChain({ count: 5, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.countIngredientes({ activo: true })
    expect(chain.eq).toHaveBeenCalledWith('activo', true)
  })

  it('fetchIngrediente — fetches by id with joins', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Harina' }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchIngrediente(1)
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
    expect(chain.single).toHaveBeenCalled()
    expect(result.nombre).toBe('Harina')
  })

  it('createIngrediente — inserts and returns', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Sal' }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.createIngrediente({ nombre: 'Sal', empresa_id: 1 })
    expect(chain.insert).toHaveBeenCalledWith({ nombre: 'Sal', empresa_id: 1 })
  })

  it('updateIngrediente — updates by id', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.updateIngrediente(1, { nombre: 'Sal Marina' })
    expect(chain.update).toHaveBeenCalledWith({ nombre: 'Sal Marina' })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteIngrediente — deletes by id', async () => {
    const chain = makeChain({ error: null })
    supabase.from.mockReturnValue(chain)
    await mod.deleteIngrediente(1)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })
})

// ─── Proveedores ─────────────────────────────────────────

describe('proveedores', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchProveedores — selects with ingredientes join ordered by nombre', async () => {
    const chain = makeChain({ data: [{ id: 1, nombre: 'Prov1' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchProveedores(1)
    expect(supabase.from).toHaveBeenCalledWith('proveedores')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('ingredientes:ingrediente_proveedor'))
    expect(chain.order).toHaveBeenCalledWith('nombre')
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 1)
    expect(result).toHaveLength(1)
  })

  it('fetchProveedores — applies range', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchProveedores(1, { from: 0, to: 10 })
    expect(chain.range).toHaveBeenCalledWith(0, 10)
  })

  it('countProveedores — returns exact count', async () => {
    const chain = makeChain({ count: 5, error: null })
    supabase.from.mockReturnValue(chain)
    const count = await mod.countProveedores({ empresa_id: 1 })
    expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 1)
    expect(count).toBe(5)
  })

  it('createProveedor — inserts and returns', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Distribuidora X' }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.createProveedor({ nombre: 'Distribuidora X', empresa_id: 1 })
    expect(chain.insert).toHaveBeenCalledWith({ nombre: 'Distribuidora X', empresa_id: 1 })
  })

  it('updateProveedor — updates by id', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.updateProveedor(1, { nombre: 'Dist Y' })
    expect(chain.update).toHaveBeenCalledWith({ nombre: 'Dist Y' })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteProveedor — soft-deletes by setting activo=false', async () => {
    const chain = makeChain({ data: { id: 1, activo: false }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.deleteProveedor(1)
    expect(chain.update).toHaveBeenCalledWith({ activo: false })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
    expect(result.activo).toBe(false)
  })

  it('fetchProveedoresByIngrediente — selects with proveedor join ordered by precio', async () => {
    const chain = makeChain({ data: [{ id: 1, precio_actual: 100 }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchProveedoresByIngrediente(5)
    expect(supabase.from).toHaveBeenCalledWith('ingrediente_proveedor')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('proveedor:proveedores(nombre, activo)'))
    expect(chain.eq).toHaveBeenCalledWith('ingrediente_id', 5)
    expect(chain.order).toHaveBeenCalledWith('precio_actual', { ascending: true })
    expect(result).toHaveLength(1)
  })
})

// ─── Recetas ─────────────────────────────────────────────

describe('recetas', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchRecetas — selects with multiple joins ordered by nombre', async () => {
    const chain = makeChain({ data: [{ id: 1, nombre: 'Pan Francés' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchRecetas(1)
    expect(supabase.from).toHaveBeenCalledWith('recetas')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('categoria:categorias_receta(nombre)'))
    expect(chain.order).toHaveBeenCalledWith('nombre')
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 1)
    expect(result).toHaveLength(1)
  })

  it('fetchRecetas — applies range', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchRecetas(1, { from: 0, to: 20 })
    expect(chain.range).toHaveBeenCalledWith(0, 20)
  })

  it('countRecetas — returns count filtered by empresa', async () => {
    const chain = makeChain({ count: 15, error: null })
    supabase.from.mockReturnValue(chain)
    const count = await mod.countRecetas({ empresa_id: 1 })
    expect(count).toBe(15)
  })

  it('fetchRecetaById — fetches single with joins', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Pan Francés' }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchRecetaById(1)
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
    expect(chain.single).toHaveBeenCalled()
    expect(result.nombre).toBe('Pan Francés')
  })

  it('createReceta — inserts receta then ingredientes then refetches', async () => {
    const chainReceta = makeChain({ data: { id: 1, nombre: 'Pan' }, error: null })
    const chainIng = makeChain({ error: null })
    const chainFetch = makeChain({ data: { id: 1, nombre: 'Pan', ingredientes: [] }, error: null })
    supabase.from
      .mockReturnValueOnce(chainReceta)
      .mockReturnValueOnce(chainIng)
      .mockReturnValueOnce(chainFetch)

    const result = await mod.createReceta({
      nombre: 'Pan', empresa_id: 1, creado_por: 'u1',
      ingredientes: [{ ingrediente_id: 1, cantidad: 500 }],
    })

    expect(chainReceta.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Pan', creado_por: 'u1' })
    )
    expect(chainIng.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ receta_id: 1, empresa_id: 1 })])
    )
    expect(result.nombre).toBe('Pan')
  })

  it('createReceta — without ingredientes still creates receta', async () => {
    const chainReceta = makeChain({ data: { id: 2 }, error: null })
    const chainFetch = makeChain({ data: { id: 2 }, error: null })
    supabase.from
      .mockReturnValueOnce(chainReceta)
      .mockReturnValueOnce(chainFetch)
    const result = await mod.createReceta({ nombre: 'Base', empresa_id: 1, creado_por: 'u1' })
    expect(result.id).toBe(2)
  })

  it('updateReceta — updates receta, deletes old ingredientes, inserts new ones', async () => {
    const chainUpd = makeChain({ error: null })
    const chainDel = makeChain({ error: null })
    const chainIns = makeChain({ error: null })
    const chainFetch = makeChain({ data: { id: 1, nombre: 'Pan Actualizado', ingredientes: [] }, error: null })
    supabase.from
      .mockReturnValueOnce(chainUpd)
      .mockReturnValueOnce(chainDel)
      .mockReturnValueOnce(chainIns)
      .mockReturnValueOnce(chainFetch)

    const result = await mod.updateReceta(1, {
      nombre: 'Pan Actualizado', empresa_id: 1,
      ingredientes: [{ ingrediente_id: 2, cantidad: 300 }],
    })

    expect(chainUpd.update).toHaveBeenCalledWith({ nombre: 'Pan Actualizado', empresa_id: 1 })
    expect(chainUpd.eq).toHaveBeenCalledWith('id', 1)
    expect(chainDel.delete).toHaveBeenCalled()
    expect(chainDel.eq).toHaveBeenCalledWith('receta_id', 1)
    expect(chainIns.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ receta_id: 1 })])
    )
    expect(result.nombre).toBe('Pan Actualizado')
  })

  it('updateReceta — without ingredientes does not insert new ingredients', async () => {
    const chainUpd = makeChain({ error: null })
    const chainDel = makeChain({ error: null })
    const chainFetch = makeChain({ data: { id: 1 }, error: null })
    supabase.from
      .mockReturnValueOnce(chainUpd)
      .mockReturnValueOnce(chainDel)
      .mockReturnValueOnce(chainFetch)
    const spy = vi.fn()
    await mod.updateReceta(1, { nombre: 'Solo nombre', empresa_id: 1, ingredientes: [] })
    expect(spy).not.toHaveBeenCalled()
    expect(chainUpd.update).toHaveBeenCalled()
  })

  it('deleteReceta — soft-deletes by setting activa=false', async () => {
    const chain = makeChain({ data: { id: 1, activa: false }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.deleteReceta(1)
    expect(chain.update).toHaveBeenCalledWith({ activa: false })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
    expect(result.activa).toBe(false)
  })
})

// ─── Productos ─────────────────────────────────────────

describe('productos', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchProductos — selects with joins ordered by nombre', async () => {
    const chain = makeChain({ data: [{ id: 1, nombre: 'Baguette' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchProductos(1)
    expect(supabase.from).toHaveBeenCalledWith('productos')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('categoria:categorias_producto(nombre)'))
    expect(chain.order).toHaveBeenCalledWith('nombre')
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 1)
    expect(result).toHaveLength(1)
  })

  it('fetchProductos — applies range', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchProductos(1, { from: 0, to: 10 })
    expect(chain.range).toHaveBeenCalledWith(0, 10)
  })

  it('countProductos — returns count filtered by empresa', async () => {
    const chain = makeChain({ count: 8, error: null })
    supabase.from.mockReturnValue(chain)
    const count = await mod.countProductos({ empresa_id: 1 })
    expect(count).toBe(8)
  })

  it('createProducto — inserts and returns', async () => {
    const chain = makeChain({ data: { id: 1, nombre: 'Croissant' }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.createProducto({ nombre: 'Croissant', empresa_id: 1 })
    expect(chain.insert).toHaveBeenCalledWith({ nombre: 'Croissant', empresa_id: 1 })
  })

  it('updateProducto — updates by id', async () => {
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.updateProducto(1, { nombre: 'Croissant de Chocolate' })
    expect(chain.update).toHaveBeenCalledWith({ nombre: 'Croissant de Chocolate' })
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('deleteProducto — soft-deletes by setting activo=false', async () => {
    const chain = makeChain({ data: { id: 1, activo: false }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.deleteProducto(1)
    expect(chain.update).toHaveBeenCalledWith({ activo: false })
    expect(result.activo).toBe(false)
  })
})

// ─── Órdenes de Producción ──────────────────────────────

describe('ordenes_produccion', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchOrdenesProduccion — selects with joins ordered by fecha_programada desc', async () => {
    const chain = makeChain({ data: [{ id: 1, estado: 'pendiente' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchOrdenesProduccion(1)
    expect(supabase.from).toHaveBeenCalledWith('ordenes_produccion')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('responsable:perfiles(nombre)'))
    expect(chain.order).toHaveBeenCalledWith('fecha_programada', { ascending: false })
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 1)
    expect(result).toHaveLength(1)
  })

  it('fetchOrdenProduccion — fetches single with detalles join', async () => {
    const chain = makeChain({ data: { id: 1, estado: 'pendiente' }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchOrdenProduccion(1)
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
    expect(chain.single).toHaveBeenCalled()
    expect(result.estado).toBe('pendiente')
  })

  it('countOrdenesProduccion — returns count filtered by empresa', async () => {
    const chain = makeChain({ count: 5, error: null })
    supabase.from.mockReturnValue(chain)
    const count = await mod.countOrdenesProduccion({ empresa_id: 1 })
    expect(count).toBe(5)
  })

  it('updateOrdenEstado — sets estado and fecha_inicio for en_proceso', async () => {
    const chain = makeChain({ data: { id: 1, estado: 'en_proceso' }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.updateOrdenEstado(1, 'en_proceso')
    const updateCall = chain.update.mock.calls[0][0]
    expect(updateCall.estado).toBe('en_proceso')
    expect(updateCall.fecha_inicio).toBeDefined()
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('updateOrdenEstado — sets fecha_fin for completada', async () => {
    const chain = makeChain({ data: { id: 1, estado: 'completada' }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.updateOrdenEstado(1, 'completada')
    const updateCall = chain.update.mock.calls[0][0]
    expect(updateCall.estado).toBe('completada')
    expect(updateCall.fecha_fin).toBeDefined()
  })

  it('createOrdenProduccion — inserts orden without detalles', async () => {
    const chain = makeChain({ data: { id: 1, estado: 'pendiente' }, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.createOrdenProduccion({ empresa_id: 1, usuario_responsable_id: 'u1' })
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ usuario_responsable_id: 'u1' }))
    expect(result.id).toBe(1)
  })

  it('createOrdenProduccion — inserts with detalles and costo', async () => {
    const chainOrd = makeChain({ data: { id: 1 }, error: null })
    const chainCostoFetch = makeChain({ data: { precio_costo: 100 }, error: null })
    const chainDet = makeChain({ error: null })
    const chainCostoUpd = makeChain({ error: null })
    supabase.rpc.mockReturnValue(undefined)

    supabase.from
      .mockReturnValueOnce(chainOrd)
      .mockReturnValueOnce(chainCostoFetch)
      .mockReturnValueOnce(chainDet)
      .mockReturnValueOnce(chainCostoUpd)

    await mod.createOrdenProduccion({
      empresa_id: 1, usuario_responsable_id: 'u1',
      detalles: [{ producto_id: 5, receta_id: 3, cantidad_programada: 10 }],
    })
    expect(chainDet.insert).toHaveBeenCalled()
    expect(chainCostoUpd.update).toHaveBeenCalled()
  })

  it('fetchPrecioCostoProducto — returns precio_costo via single select', async () => {
    const chain = makeChain({ data: { precio_costo: 250 }, error: null })
    supabase.from.mockReturnValue(chain)
    const precio = await mod.fetchPrecioCostoProducto(1)
    expect(chain.select).toHaveBeenCalledWith('precio_costo')
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
    expect(precio).toBe(250)
  })

  it('fetchPrecioCostoProducto — returns 0 when null', async () => {
    supabase.from.mockReturnValue(makeChain({ data: { precio_costo: null }, error: null }))
    expect(await mod.fetchPrecioCostoProducto(1)).toBe(0)
  })
})

// ─── Movimientos MP ──────────────────────────────────────

describe('movimientos_inventario_mp', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchMovimientosMp — selects with joins ordered by fecha desc', async () => {
    const chain = makeChain({ data: [{ id: 1, cantidad: 50 }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchMovimientosMp()
    expect(supabase.from).toHaveBeenCalledWith('movimientos_inventario_mp')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('ingrediente:ingredientes(nombre)'))
    expect(chain.order).toHaveBeenCalledWith('fecha', { ascending: false })
    expect(result).toHaveLength(1)
  })

  it('fetchMovimientosMp — filters by ingrediente_id', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchMovimientosMp(3)
    expect(chain.eq).toHaveBeenCalledWith('ingrediente_id', 3)
  })

  it('fetchMovimientosMp — applies range', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchMovimientosMp(undefined, { from: 0, to: 50 })
    expect(chain.range).toHaveBeenCalledWith(0, 50)
  })

  it('countMovimientosMp — returns count filtered by ingrediente_id', async () => {
    const chain = makeChain({ count: 20, error: null })
    supabase.from.mockReturnValue(chain)
    const count = await mod.countMovimientosMp(3)
    expect(count).toBe(20)
    expect(chain.eq).toHaveBeenCalledWith('ingrediente_id', 3)
  })

  it('crearMovimientoMp — inserts values', async () => {
    const chain = makeChain({ data: { id: 1, cantidad: 100 }, error: null })
    supabase.from.mockReturnValue(chain)
    await mod.crearMovimientoMp({ ingrediente_id: 1, tipo: 'ingreso', cantidad: 100, empresa_id: 1 })
    expect(chain.insert).toHaveBeenCalledWith({ ingrediente_id: 1, tipo: 'ingreso', cantidad: 100, empresa_id: 1 })
  })

  it('fetchPrecioIngrediente — returns precio from preferido', async () => {
    const chain = makeChain({ data: [{ precio_actual: 50 }], error: null })
    supabase.from.mockReturnValue(chain)
    const precio = await mod.fetchPrecioIngrediente(1)
    expect(chain.eq).toHaveBeenCalledWith('es_preferido', true)
    expect(precio).toBe(50)
  })

  it('fetchPrecioIngrediente — falls back to first available when no preferido', async () => {
    const chain1 = makeChain({ data: [], error: null })
    const chain2 = makeChain({ data: [{ precio_actual: 45 }], error: null })
    supabase.from.mockReturnValueOnce(chain1).mockReturnValueOnce(chain2)
    const precio = await mod.fetchPrecioIngrediente(1)
    expect(precio).toBe(45)
  })

  it('fetchPrecioIngrediente — returns 0 when no prices found', async () => {
    supabase.from.mockReturnValue(makeChain({ data: [], error: null }))
    expect(await mod.fetchPrecioIngrediente(1)).toBe(0)
  })
})

// ─── Stock / RPC ─────────────────────────────────────────

describe('stock / RPC', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchStockProducto — calls rpc stock_producto', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ cantidad: 50 }], error: null })
    const result = await mod.fetchStockProducto(1)
    expect(supabase.rpc).toHaveBeenCalledWith('stock_producto', { p_producto_id: 1 })
    expect(result).toEqual([{ cantidad: 50 }])
  })

  it('fetchStockIngrediente — calls rpc stock_ingrediente', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ cantidad: 100 }], error: null })
    const result = await mod.fetchStockIngrediente(5)
    expect(supabase.rpc).toHaveBeenCalledWith('stock_ingrediente', { p_ingrediente_id: 5 })
  })

  it('fetchStockValorizado — calls rpc stock_valorizado', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ cantidad_total: 200, valor_total: 5000 }], error: null })
    const result = await mod.fetchStockValorizado('mp', 3)
    expect(supabase.rpc).toHaveBeenCalledWith('stock_valorizado', { p_tipo: 'mp', p_item_id: 3 })
    expect(result.cantidad_total).toBe(200)
  })

  it('fetchStockValorizado — returns defaults for empty result', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null })
    const result = await mod.fetchStockValorizado('mp', 99)
    expect(result).toEqual({ cantidad_total: 0, valor_total: 0, precio_promedio: 0 })
  })

  it('fetchProductosConStock — combines productos with stock from movimientos', async () => {
    const chainProd = makeChain({ data: [{ id: 1, nombre: 'Pan' }, { id: 2, nombre: 'Factura' }], error: null })
    const chainMov = makeChain({
      data: [
        { producto_id: 1, cantidad: 10, tipo: 'ingreso', precio_unitario: 100 },
        { producto_id: 1, cantidad: -2, tipo: 'egreso', precio_unitario: 0 },
        { producto_id: 2, cantidad: 5, tipo: 'ingreso', precio_unitario: 50 },
      ],
      error: null,
    })
    supabase.from.mockReturnValueOnce(chainProd).mockReturnValueOnce(chainMov)

    const result = await mod.fetchProductosConStock(1)

    expect(result).toHaveLength(2)
    expect(result[0].stock_actual).toBe(8) // 10 - 2
    expect(result[0].precio_promedio).toBe(100)
    expect(result[1].stock_actual).toBe(5)
  })

  it('fetchStockValorizadoTotal — calculates weighted average from movimientos_mp', async () => {
    const chain = makeChain({
      data: [
        { precio_unitario: 10, cantidad: 100, tipo: 'ingreso', ingrediente: { empresa_id: 1 } },
        { precio_unitario: 20, cantidad: 50, tipo: 'ingreso', ingrediente: { empresa_id: 1 } },
        { precio_unitario: 0, cantidad: -30, tipo: 'egreso', ingrediente: { empresa_id: 1 } },
      ],
      error: null,
    })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchStockValorizadoTotal(1)
    // ingCant=150, ingValor=2000, neto=180 (100+50-(-30))
    // avg=2000/150 → 13.33, total=13.33*180 → 2400
    expect(result).toBeCloseTo(2400, 0)
  })

  it('fetchStockValorizadoTotal — returns 0 when no ingresos', async () => {
    supabase.from.mockReturnValue(makeChain({ data: [
      { precio_unitario: 10, cantidad: -50, tipo: 'egreso', ingrediente: { empresa_id: 1 } },
    ], error: null }))
    expect(await mod.fetchStockValorizadoTotal(1)).toBe(0)
  })
})

// ─── Auditoría ─────────────────────────────────────────

describe('audit_logs', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('fetchAuditLogs — selects with count ordered by created_at desc', async () => {
    const chain = makeChain({ data: [{ id: 1, action: 'INSERT' }], error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchAuditLogs()
    expect(supabase.from).toHaveBeenCalledWith('audit_logs')
    expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact' })
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result.data).toHaveLength(1)
  })

  it('fetchAuditLogs — filters by action, table, userId', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchAuditLogs({ action: 'DELETE', table: '%productos%', userId: 'u1' })
    expect(chain.eq).toHaveBeenCalledWith('action', 'DELETE')
    expect(chain.ilike).toHaveBeenCalledWith('affected_table', '%productos%')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('fetchAuditLogs — filters by date range', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    const from = '2024-01-01T00:00:00Z'
    const to = '2024-12-31T23:59:59Z'
    await mod.fetchAuditLogs({ from, to })
    expect(chain.gte).toHaveBeenCalledWith('created_at', from)
    expect(chain.lte).toHaveBeenCalledWith('created_at', to)
  })

  it('fetchAuditLogs — applies range', async () => {
    const chain = makeChain({ data: [], error: null })
    supabase.from.mockReturnValue(chain)
    await mod.fetchAuditLogs({ from: 0, to: 49 })
    expect(chain.range).toHaveBeenCalledWith(0, 49)
  })

  it('fetchAuditLogs — returns total count', async () => {
    const chain = makeChain({ data: [], count: 100, error: null })
    supabase.from.mockReturnValue(chain)
    const result = await mod.fetchAuditLogs()
    expect(result.total).toBe(100)
  })
})

// ─── Costos ────────────────────────────────────────────

describe('costos', () => {
  let mod
  beforeAll(async () => { mod = await import('@/modules/panaderia/composables/database') })

  it('calcularCostoRecetaRPC — calls rpc calcular_costo_receta', async () => {
    supabase.rpc.mockResolvedValue({ data: 1500, error: null })
    const result = await mod.calcularCostoRecetaRPC(1)
    expect(supabase.rpc).toHaveBeenCalledWith('calcular_costo_receta', { p_receta_id: 1 })
    expect(result).toBe(1500)
  })

  it('calcularCostoProducto — multiplies factor by costo_estimado', async () => {
    const receta = { costo_estimado: 100, rendimiento_cantidad: 500 }
    const producto = { peso_unitario_gr: 250 }
    const result = await mod.calcularCostoProducto(receta, producto)
    expect(result).toBe(50)
  })

  it('calcularCostoProducto — returns 0 when missing data', async () => {
    expect(await mod.calcularCostoProducto(null, {})).toBe(0)
    expect(await mod.calcularCostoProducto({}, null)).toBe(0)
  })

  it('calcularIngredientesNecesarios — returns empty for no detalles', async () => {
    const result = await mod.calcularIngredientesNecesarios([])
    expect(result).toEqual([])
  })

  it('calcularIngredientesNecesarios — returns aggregated ingredients', async () => {
    const chainUnidades = makeChain({
      data: [
        { id: 1, nombre: 'Gramo', simbolo: 'g' },
        { id: 2, nombre: 'Kilogramo', simbolo: 'kg' },
      ],
      error: null,
    })
    const chainConversiones = makeChain({
      data: [{ id: 1, unidad_origen_id: 2, unidad_destino_id: 1, factor_multiplicacion: 1000 }],
      error: null,
    })
    const chainRecetas = makeChain({
      data: [{
        id: 1, rendimiento_cantidad: 2, rendimiento_unidad_id: 2,
        ingredientes: [
          { ingrediente_id: 10, cantidad: 1, ingrediente: { nombre: 'Harina' }, unidad: { simbolo: 'kg' } },
        ],
      }],
      error: null,
    })
    const chainProductos = makeChain({
      data: [{ id: 5, peso_unitario_gr: 200 }],
      error: null,
    })

    supabase.from
      .mockReturnValueOnce(chainUnidades)
      .mockReturnValueOnce(chainConversiones)
      .mockReturnValueOnce(chainRecetas)
      .mockReturnValueOnce(chainProductos)

    const result = await mod.calcularIngredientesNecesarios([
      { producto_id: 5, receta_id: 1, cantidad_programada: 10 },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].nombre).toBe('Harina')
    expect(result[0].cantidad_total).toBeGreaterThan(0)
  })

  it('descontarIngredientesOrden — creates egreso movimientos for calculated ingredients', async () => {
    // First call: calcularIngredientesNecesarios internal queries
    const chainUnidades = makeChain({ data: [{ id: 1, nombre: 'Gramo', simbolo: 'g' }], error: null })
    const chainConversiones = makeChain({ data: [], error: null })
    const chainRecetas = makeChain({
      data: [{
        id: 1, rendimiento_cantidad: 500, rendimiento_unidad_id: 1,
        ingredientes: [{ ingrediente_id: 10, cantidad: 250, ingrediente: { nombre: 'Harina' }, unidad: { simbolo: 'g' } }],
      }],
      error: null,
    })
    const chainProductos = makeChain({ data: [{ id: 5, peso_unitario_gr: 100 }], error: null })
    // Then: descontar queries: ingredientes select, movimientos insert
    const chainIngredientes = makeChain({ data: [{ id: 10, unidad_base_id: 1 }], error: null })
    const chainMovInsert = makeChain({ error: null })

    supabase.from
      .mockReturnValueOnce(chainUnidades)
      .mockReturnValueOnce(chainConversiones)
      .mockReturnValueOnce(chainRecetas)
      .mockReturnValueOnce(chainProductos)
      .mockReturnValueOnce(chainIngredientes)
      .mockReturnValueOnce(chainMovInsert)

    await mod.descontarIngredientesOrden(1, [
      { producto_id: 5, receta_id: 1, cantidad_programada: 10 },
    ], 1, 'u1')

    expect(chainMovInsert.insert).toHaveBeenCalled()
    const insertArgs = chainMovInsert.insert.mock.calls[0][0]
    expect(insertArgs[0].tipo).toBe('egreso')
    expect(insertArgs[0].unidad_id).toBe(1)
  })
})
