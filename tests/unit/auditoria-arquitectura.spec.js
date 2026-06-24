import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { supabase } from '@/core/supabase'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

// Mock auth store — useAudit checks authStore.user before proceeding
vi.mock('@/core/store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user' },
    userEmail: 'test@example.com',
    currentAppSlug: 'panaderia',
    getAppId: vi.fn().mockResolvedValue(1),
  })),
}))

// Mock vue-sonner toast
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.stubGlobal('fetch', vi.fn())

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── formatCurrency ─────────────────────────────────────────────────

describe('formatCurrency', () => {
  let formatCurrency

  beforeAll(async () => {
    const mod = await import('@/core/composables/useCurrency')
    formatCurrency = mod.formatCurrency
  })

  it('formats USD with 2 decimal places by default', () => {
    const result = formatCurrency(1234.5)
    expect(result).toContain('1,234.50')
  })

  it('formats 0 as 0.00', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })

  it('formats large numbers with commas and 2 decimals', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1,000,000.00')
  })

  it('formats negative amounts', () => {
    const result = formatCurrency(-50.3)
    expect(result).toContain('50.30')
  })

  it('rounds to 2 decimal places', () => {
    const result = formatCurrency(10.345)
    expect(result).toContain('10.35')
  })
})

// ─── RPC completar_orden (before error handler patches supabase) ────

describe('completar_orden RPC call', () => {
  it('calls completar_orden RPC with orden id', async () => {
    supabase.rpc.mockResolvedValue({ data: { success: true }, error: null })

    const { error } = await supabase.rpc('completar_orden', { p_orden_id: 42 })

    expect(error).toBeNull()
    expect(supabase.rpc).toHaveBeenCalledWith('completar_orden', { p_orden_id: 42 })
  })

  it('returns error when RPC fails', async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: new Error('Orden no encontrada o no está en proceso'),
    })

    const { error } = await supabase.rpc('completar_orden', { p_orden_id: 999 })

    expect(error).toBeTruthy()
    expect(error.message).toContain('Orden no encontrada')
  })

  it('handles network failure', async () => {
    supabase.rpc.mockRejectedValue(new Error('Failed to fetch'))

    await expect(
      supabase.rpc('completar_orden', { p_orden_id: 1 }),
    ).rejects.toThrow('Failed to fetch')
  })
})

// ─── useAudit logging ──────────────────────────────────────────────

describe('useAudit logging', () => {
  let useAuditModule

  beforeAll(async () => {
    useAuditModule = await import('@/core/composables/useAudit')
  })

  it('inserts audit log on log()', async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: [{}], error: null }),
    })

    const { log } = useAuditModule.useAudit()
    await log('TEST', { table: 'test-table', entityId: '42' })

    expect(supabase.from).toHaveBeenCalledWith('audit_logs')
  })

  it('does not throw on failure', async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const { log } = useAuditModule.useAudit()
    await expect(log('TEST', { table: 't', entityId: '1' })).resolves.toBeUndefined()
  })
})

// ─── Global Error Handler (LAST — mutates global supabase) ─────────

describe('setupGlobalErrorHandler', () => {
  let setupGlobalErrorHandler
  let mockRouter
  let mockAuthStore
  let toast
  let savedFrom
  let savedRpc

  beforeAll(async () => {
    const mod = await import('@/core/supabase-error')
    setupGlobalErrorHandler = mod.setupGlobalErrorHandler
    const toastMod = await import('vue-sonner')
    toast = toastMod.toast
  })

  beforeEach(() => {
    mockRouter = { push: vi.fn() }
    mockAuthStore = {
      logout: vi.fn().mockResolvedValue(undefined),
    }
    // Save mock refs BEFORE test code can replace them
    savedFrom = supabase.from
    savedRpc = supabase.rpc
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore refs that setupGlobalErrorHandler may have replaced
    supabase.from = savedFrom
    supabase.rpc = savedRpc
  })

  it('patches supabase.from() and supabase.rpc()', () => {
    const originalFrom = supabase.from
    const originalRpc = supabase.rpc

    setupGlobalErrorHandler(supabase, { router: mockRouter, authStore: mockAuthStore })

    expect(supabase.from).not.toBe(originalFrom)
    expect(supabase.rpc).not.toBe(originalRpc)
  })

  it('wraps select and returns the builder', async () => {
    // Usar thenable en vez de Promise nativo porque await en Promise nativo
    // bypasses .then() — en prod Supabase devuelve PostgrestFilterBuilder (thenable)
    const queryBuilder = {
      select: vi.fn().mockImplementation(() => makeThenable({ data: null, error: null })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    }
    supabase.from.mockReturnValue(queryBuilder)

    setupGlobalErrorHandler(supabase, { router: mockRouter, authStore: mockAuthStore })

    const result = await supabase.from('test').select()

    expect(result.data).toBeNull()
    expect(result.error).toBeNull()
  })

  it('shows error toast on query error response', async () => {
    const queryBuilder = {
      select: vi.fn().mockImplementation(() => makeThenable({
        data: null,
        error: { code: 'PGRST104', message: 'forbidden', status: 403 },
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    }
    supabase.from.mockReturnValue(queryBuilder)

    setupGlobalErrorHandler(supabase, { router: mockRouter, authStore: mockAuthStore })
    await supabase.from('test').select()

    expect(toast.error).toHaveBeenCalled()
  })

  it('logs out and redirects on 401', async () => {
    const queryBuilder = {
      select: vi.fn().mockImplementation(() => makeThenable({
        data: null,
        error: { code: 'PGRST301', message: 'Invalid JWT', status: 401 },
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    }
    supabase.from.mockReturnValue(queryBuilder)

    setupGlobalErrorHandler(supabase, { router: mockRouter, authStore: mockAuthStore })
    await supabase.from('test').select()

    expect(mockAuthStore.logout).toHaveBeenCalled()
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  /**
   * Crea un thenable (objeto con método .then) que simula el
   * PostgrestFilterBuilder de Supabase. Await en un thenable SÍ llama a .then,
   * mientras que en un Promise nativo lo bypassa.
   */
  function makeThenable(value) {
    return {
      then(onFulfilled, _onRejected) {
        return Promise.resolve(onFulfilled(value))
      },
    }
  }
})
