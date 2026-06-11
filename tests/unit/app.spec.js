import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/core/store/app'
import { supabase } from '@/core/supabase'

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
    then,
  }
  return query
}

vi.mock('@/core/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        setSession: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  }
})

describe('App Store', () => {
  let store

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    store = useAppStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('sidebar', () => {
    it('should start collapsed by default', () => {
      expect(store.sidebarCollapsed).toBe(false)
    })

    it('should toggle sidebar', () => {
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(true)
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(false)
    })

    it('should persist collapsed state to localStorage', async () => {
      store.toggleSidebar()
      await vi.waitFor(() => {
        expect(localStorage.getItem('panaderia_sidebar_collapsed')).toBe('true')
      })
      store.toggleSidebar()
      await vi.waitFor(() => {
        expect(localStorage.getItem('panaderia_sidebar_collapsed')).toBe('false')
      })
    })
  })

  describe('theme', () => {
    it('should default to light', () => {
      expect(store.theme).toBe('light')
    })

    it('should set theme', () => {
      store.setTheme('dark')
      expect(store.theme).toBe('dark')
    })

    it('should persist theme to localStorage', async () => {
      store.setTheme('dark')
      await vi.waitFor(() => {
        expect(localStorage.getItem('panaderia_theme')).toBe('dark')
      })
    })
  })

  describe('cargarApps', () => {
    it('should fetch apps ordered by orden and name', async () => {
      const chain = makeChain({ data: [{ id: 1, name: 'Panadería', slug: 'panaderia', orden: 1 }], error: null })
      supabase.from.mockReturnValue(chain)

      const result = await store.cargarApps()

      expect(supabase.from).toHaveBeenCalledWith('applications')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Panadería')
    })
  })

  describe('slugExiste', () => {
    it('should return true when slug exists', async () => {
      const chain = makeChain({ data: { id: 1 }, error: null })
      supabase.from.mockReturnValue(chain)

      const result = await store.slugExiste('panaderia')
      expect(result).toBe(true)
    })

    it('should return false when slug is available', async () => {
      const chain = makeChain({ data: null, error: null })
      supabase.from.mockReturnValue(chain)

      const result = await store.slugExiste('new-app')
      expect(result).toBe(false)
    })
  })

  describe('crearApp', () => {
    it('should insert app payload', async () => {
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
      supabase.from.mockReturnValue({ insert: insertMock })

      await store.crearApp({ name: 'Test App', slug: 'test-app', is_active: true })

      expect(supabase.from).toHaveBeenCalledWith('applications')
      expect(insertMock).toHaveBeenCalledWith({ name: 'Test App', slug: 'test-app', is_active: true })
    })
  })

  describe('actualizarApp', () => {
    it('should update app by id', async () => {
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null })
      supabase.from.mockReturnValue({ update: updateMock, eq: eqMock })

      await store.actualizarApp(1, { name: 'Updated' })

      expect(updateMock).toHaveBeenCalledWith({ name: 'Updated' })
      expect(eqMock).toHaveBeenCalledWith('id', 1)
    })
  })

  describe('toggleActiva', () => {
    it('should toggle is_active', async () => {
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null })
      supabase.from.mockReturnValue({ update: updateMock, eq: eqMock })

      await store.toggleActiva(1, false)

      expect(updateMock).toHaveBeenCalledWith({ is_active: true })
    })
  })

  describe('eliminarApp', () => {
    it('should delete app by id', async () => {
      const deleteMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null })
      supabase.from.mockReturnValue({ delete: deleteMock, eq: eqMock })

      await store.eliminarApp(1)

      expect(deleteMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('id', 1)
    })
  })
})
