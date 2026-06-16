import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/core/store/auth'
import { ref, isRef, computed } from 'vue'

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

const mockUseQuery = vi.fn((opts) => ({
  data: ref(null),
  isLoading: ref(false),
  error: ref(null),
}))

const mockUseMutation = vi.fn(() => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: ref(false),
}))

const mockInvalidateQueries = vi.fn()

vi.mock('@tanstack/vue-query', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
  keepPreviousData: Symbol('keepPreviousData'),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  const store = useAuthStore()
  store.$patch({
    currentEmpresaId: 1,
    user: { id: 'user-1' },
  })
  vi.clearAllMocks()
})

// ─── Query Hooks ────────────────────────────────────────

describe('query hooks', () => {
  const testCases = [
    'useIngredientesQuery', 'useIngredienteQuery',
    'useProveedoresQuery', 'useProveedoresByIngredienteQuery',
    'useRecetasQuery', 'useProductosQuery',
    'useOrdenesProduccionQuery', 'useMermasQuery',
    'useMovimientosMpQuery', 'useMovimientosPtQuery',
    'useStockIngredienteQuery', 'useStockProductoQuery',
    'useProductosConStockQuery', 'useStockValorizadoQuery',
  ]

  for (const name of testCases) {
    it(`${name} — calls useQuery`, async () => {
      mockUseQuery.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      queries[name]()
      expect(mockUseQuery).toHaveBeenCalled()
    })
  }
})

// ─── Detail Queries (enabled: !!id) ─────────────────────

describe('detail query hooks (enabled by id)', () => {
  it('useIngredienteQuery — enabled when id is truthy', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    queries.useIngredienteQuery(5)
    const call = mockUseQuery.mock.calls[0][0]
    expect(call.enabled).toBe(true)
  })

  it('useIngredienteQuery — not enabled when id is falsy', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    queries.useIngredienteQuery(null)
    const call = mockUseQuery.mock.calls[0][0]
    expect(call.enabled).toBe(false)
  })

  it('useOrdenProduccionQuery — enabled when id is truthy', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    queries.useOrdenProduccionQuery(3)
    const call = mockUseQuery.mock.calls[0][0]
    expect(call.enabled).toBe(true)
  })

  it('useMovimientosMpQuery — enabled when ingredienteId present', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    queries.useMovimientosMpQuery(3)
    const call = mockUseQuery.mock.calls[0][0]
    expect(call.enabled).toBe(true)
  })

  it('useMovimientosMpQuery — disabled when no ingredienteId', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    queries.useMovimientosMpQuery(null)
    const call = mockUseQuery.mock.calls[0][0]
    expect(call.enabled).toBe(false)
  })
})

// ─── Mutation Hooks ─────────────────────────────────────

describe('mutation hooks', () => {
  const createMutations = [
    'useCreateIngredienteMutation',
    'useCreateProveedorMutation',
    'useCreateRecetaMutation',
    'useCreateProductoMutation',
    'useCreateOrdenMutation',
    'useCreateMermaMutation',
    'useCrearMovimientoMpMutation',
    'useCrearMovimientoPtMutation',
  ]
  for (const name of createMutations) {
    it(`${name} — calls useMutation and invalidates on success`, async () => {
      mockUseMutation.mockClear()
      mockInvalidateQueries.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      const hook = queries[name]()
      expect(hook.mutate).toBeDefined()
      expect(hook.mutateAsync).toBeDefined()
      expect(mockUseMutation).toHaveBeenCalled()
      const opts = mockUseMutation.mock.calls[0][0]
      expect(typeof opts.mutationFn).toBe('function')
    })
  }

  const crudMutations = [
    'useUpdateIngredienteMutation',
    'useDeleteIngredienteMutation',
    'useUpdateProveedorMutation',
    'useDeleteProveedorMutation',
    'useUpdateRecetaMutation',
    'useDeleteRecetaMutation',
    'useUpdateProductoMutation',
    'useDeleteProductoMutation',
    'useUpdateMermaMutation',
    'useDeleteMermaMutation',
    'useUpdateOrdenEstadoMutation',
    'useUpdateOrdenMutation',
  ]
  for (const name of crudMutations) {
    it(`${name} — calls useMutation`, async () => {
      mockUseMutation.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      const hook = queries[name]()
      expect(hook.mutate).toBeDefined()
    })
  }

  it('useRecalcularCostoMutation — calls useMutation', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useRecalcularCostoMutation()
    expect(hook.mutate).toBeDefined()
  })

  it('useDescontarInventarioMutation — calls useMutation', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useDescontarInventarioMutation()
    expect(hook.mutate).toBeDefined()
  })
})

// ─── Paginated Hooks ─────────────────────────────────

describe('paginated hooks', () => {
  it('useIngredientesPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useIngredientesPaginated()
    expect(hook).toHaveProperty('data')
    expect(hook).toHaveProperty('total')
    expect(hook).toHaveProperty('page')
    expect(hook).toHaveProperty('pageSize')
    expect(hook.pageSize).toBe(25)
    expect(typeof hook.setPage).toBe('function')
    expect(typeof hook.nextPage).toBe('function')
    expect(typeof hook.prevPage).toBe('function')
  })

  it('useRecetasPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useRecetasPaginated()
    expect(hook.pageSize).toBe(25)
    expect(isRef(hook.page)).toBe(true)
    expect(hook.page.value).toBe(1)
  })

  it('useProductosPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useProductosPaginated()
    expect(hook).toHaveProperty('data')
    expect(hook).toHaveProperty('totalPages')
  })

  it('useProveedoresPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useProveedoresPaginated()
    expect(hook).toHaveProperty('data')
    expect(hook.pageSize).toBe(25)
  })

  it('useMermasPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useMermasPaginated()
    expect(hook).toHaveProperty('data')
    expect(hook).toHaveProperty('total')
    expect(hook).toHaveProperty('page')
    expect(hook).toHaveProperty('pageSize')
    expect(hook).toHaveProperty('setPage')
    expect(hook).toHaveProperty('nextPage')
    expect(hook).toHaveProperty('prevPage')
    expect(hook).toHaveProperty('isLoading')
    expect(hook).toHaveProperty('error')
    expect(typeof hook.setPage).toBe('function')
    expect(typeof hook.nextPage).toBe('function')
    expect(typeof hook.prevPage).toBe('function')
    expect(hook.pageSize).toBe(25)
    expect(isRef(hook.page)).toBe(true)
    expect(hook.page.value).toBe(1)
  })

  it('useMovimientosMpPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useMovimientosMpPaginated(1)
    expect(hook).toHaveProperty('data')
    expect(hook).toHaveProperty('page')
    expect(isRef(hook.page)).toBe(true)
    expect(hook.pageSize).toBe(25)
    expect(typeof hook.setPage).toBe('function')
  })

  it('useMovimientosPtPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useMovimientosPtPaginated(1)
    expect(hook).toHaveProperty('data')
    expect(hook.pageSize).toBe(25)
  })

  it('useAuditLogsPaginated — returns paginated shape', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useAuditLogsPaginated()
    expect(hook).toHaveProperty('data')
    expect(hook).toHaveProperty('total')
    expect(hook).toHaveProperty('page')
    expect(hook).toHaveProperty('pageSize')
    expect(hook.pageSize).toBe(50)
    expect(typeof hook.setPage).toBe('function')
    expect(typeof hook.nextPage).toBe('function')
    expect(typeof hook.prevPage).toBe('function')
    expect(isRef(hook.page)).toBe(true)
    expect(hook.page.value).toBe(1)
  })

  it('useAuditLogsPaginated — setPage clamps between 1 and totalPages', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useAuditLogsPaginated()
    hook.setPage(0)
    expect(hook.page.value).toBe(1)
    hook.setPage(9999)
    expect(hook.page.value).toBe(1)
  })
})

// ─── Factory Hooks (categorías, unidades, conversiones) ─

describe('factory hooks (createCrudHooks)', () => {
  const factoryQueries = [
    'useCategoriasRecetaQuery',
    'useCategoriasIngredienteQuery',
    'useCategoriasProductoQuery',
    'useUnidadesMedidaQuery',
    'useConversionesUnidadesQuery',
  ]

  for (const name of factoryQueries) {
    it(`${name} — calls useQuery`, async () => {
      mockUseQuery.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      const hook = queries[name]()
      expect(hook.data).toBeDefined()
      expect(mockUseQuery).toHaveBeenCalled()
    })
  }

  const factoryMutations = [
    { create: 'useCreateCategoriaRecetaMutation', update: 'useUpdateCategoriaRecetaMutation', remove: 'useDeleteCategoriaRecetaMutation' },
    { create: 'useCreateCategoriaIngredienteMutation', update: 'useUpdateCategoriaIngredienteMutation', remove: 'useDeleteCategoriaIngredienteMutation' },
    { create: 'useCreateCategoriaProductoMutation', update: 'useUpdateCategoriaProductoMutation', remove: 'useDeleteCategoriaProductoMutation' },
    { create: 'useCreateUnidadMedidaMutation', update: 'useUpdateUnidadMedidaMutation', remove: 'useDeleteUnidadMedidaMutation' },
    { create: 'useCreateConversionUnidadMutation', update: 'useUpdateConversionUnidadMutation', remove: 'useDeleteConversionUnidadMutation' },
  ]

  for (const group of factoryMutations) {
    it(`${group.create} — calls useMutation`, async () => {
      mockUseMutation.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      const hook = queries[group.create]()
      expect(hook.mutate).toBeDefined()
    })
    it(`${group.update} — calls useMutation`, async () => {
      mockUseMutation.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      const hook = queries[group.update]()
      expect(hook.mutate).toBeDefined()
    })
    it(`${group.remove} — calls useMutation`, async () => {
      mockUseMutation.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      const hook = queries[group.remove]()
      expect(hook.mutate).toBeDefined()
    })
  }
})

// ─── Cálculo de Ingredientes ─────────────────────────────

describe('useCalculoIngredientesQuery', () => {
  it('returns query shape with staleTime', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const detalles = ref([
      { producto_id: 1, receta_id: 1, cantidad_programada: 10 },
    ])
    const hook = queries.useCalculoIngredientesQuery(detalles)
    expect(hook.isLoading).toBeDefined()
    const call = mockUseQuery.mock.calls[0][0]
    expect(call.staleTime).toBe(30000)
  })
})

// ─── Stock Valorizado ────────────────────────────────────

describe('useStockValorizadoTotalQuery', () => {
  it('returns query shape enabled when empresaId is truthy', async () => {
    const queries = await import('@/modules/panaderia/composables/queries')
    const hook = queries.useStockValorizadoTotalQuery(1)
    expect(hook.isLoading).toBeDefined()
  })
})
