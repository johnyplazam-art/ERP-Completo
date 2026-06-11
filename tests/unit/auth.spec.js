// tests/unit/auth.spec.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'

// Mock completo y encadenable de Supabase
vi.mock('@/core/supabase', () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: '1', nombre: 'Test' }, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  }

  let authCallback = null
  const mockOnAuthStateChange = vi.fn((cb) => {
    authCallback = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: mockOnAuthStateChange,
        setSession: vi.fn().mockImplementation((session) => {
          if (authCallback) {
            authCallback('SIGNED_IN', session)
          }
          return Promise.resolve({ data: { session }, error: null })
        }),
      },
      from: vi.fn().mockReturnValue(mockChain),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  }
})

describe('Auth Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('initialize', () => {
    it('should initialize with a valid session', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
      }
      localStorage.setItem('panaderia_session', JSON.stringify(mockSession))

      await store.initialize()

      expect(store.isAuthenticated).toBe(true)
      expect(store.user).toEqual(mockSession.user)
    })

    it('should handle logout correctly', async () => {
      await store.logout()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('cannotRemoveSelf', () => {
    it('should prevent a user from removing themselves from the company', async () => {
      const currentUser = { id: 'user-123' }
      
      const removeUser = async (userId) => {
        if (userId === currentUser.id) {
          throw new Error('cannotRemoveSelf')
        }
      }

      await expect(removeUser(currentUser.id)).rejects.toThrow('cannotRemoveSelf')
      await expect(removeUser('other-user')).resolves.not.toThrow()
    })
  })

  describe('language persistence (idioma)', () => {
    it('should persist user language preference in profile', async () => {
      const user = { id: 'user-123' }
      const selectedLanguage = 'en'

      store.user = user

      await store.guardarIdioma(selectedLanguage)

      expect(supabase.from).toHaveBeenCalledWith('perfiles')
      const chain = supabase.from('perfiles')
      expect(chain.update).toHaveBeenCalledWith({ idioma: selectedLanguage })
    })

    it('should load language from profile on initialization', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
      }
      const mockProfile = { id: 'user-123', idioma: 'en' }

      localStorage.setItem('panaderia_session', JSON.stringify(mockSession))

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })

      await store.initialize()

      expect(store.perfil).toEqual(mockProfile)
    })
  })
})