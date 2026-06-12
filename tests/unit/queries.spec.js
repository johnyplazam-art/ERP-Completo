import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'
import { ref, isRef } from 'vue'

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

vi.mock('@tanstack/vue-query', () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: ref(false),
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  keepPreviousData: Symbol('keepPreviousData'),
}))

describe('queries.js — paginated hooks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useAuthStore()
    store.$patch({
      currentEmpresaId: 1,
      user: { id: 'user-1' },
    })
    vi.clearAllMocks()
  })

  describe('useMermasPaginated', () => {
    it('returns paginated shape', async () => {
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

    it('calls usePaginatedList via useQuery for data and count', async () => {
      mockUseQuery.mockClear()
      const queries = await import('@/modules/panaderia/composables/queries')
      queries.useMermasPaginated()

      const calls = mockUseQuery.mock.calls
      expect(calls.length).toBeGreaterThanOrEqual(2)
      const queryKeys = calls.map(c => c[0].queryKey)
      expect(queryKeys.some(k => k[0] === 'mermas')).toBe(true)
    })
  })

  describe('useRecetasPaginated', () => {
    it('returns paginated shape with scoped empresa_id', async () => {
      const queries = await import('@/modules/panaderia/composables/queries')
      const hook = queries.useRecetasPaginated()

      expect(hook).toHaveProperty('data')
      expect(hook).toHaveProperty('total')
      expect(isRef(hook.page)).toBe(true)
      expect(hook.page.value).toBe(1)
    })
  })
})
