import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'

function makeChain(resolvedValue = { data: null, error: null }) {
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
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'tok', refresh_token: 'ref' },
            user: { id: 'user-123', email: 'test@example.com' },
          },
          error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
          data: {
            session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'tok', refresh_token: 'ref' },
            user: { id: 'user-123', email: 'test@example.com' },
          },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: mockOnAuthStateChange,
        setSession: vi.fn().mockImplementation((session) => {
          if (authCallback) {
            authCallback('SIGNED_IN', session)
          }
          return Promise.resolve({ data: { session }, error: null })
        }),
      },
      from: vi.fn(),
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

    it('should handle no session gracefully', async () => {
      await store.initialize()
      expect(store.isAuthenticated).toBe(false)
      expect(store.loading).toBe(false)
    })
  })

  describe('login', () => {
    it('should login and persist session', async () => {
      await store.login('test@example.com', 'password')

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })
      expect(localStorage.getItem('panaderia_session')).toBeTruthy()
    })

    it('should throw on invalid credentials', async () => {
      supabase.auth.signInWithPassword.mockRejectedValueOnce(new Error('Invalid login credentials'))

      await expect(store.login('bad@email.com', 'wrong')).rejects.toThrow('Invalid login credentials')
    })
  })

  describe('signup', () => {
    it('should signup and persist session when returned', async () => {
      await store.signup('new@example.com', 'password123', { nombre: 'New User' })

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: { data: { nombre: 'New User' } },
      })
      expect(localStorage.getItem('panaderia_session')).toBeTruthy()
    })
  })

  describe('logout', () => {
    it('should clear session and call signOut', async () => {
      localStorage.setItem('panaderia_session', 'some-session')
      await store.logout()

      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(localStorage.getItem('panaderia_session')).toBeNull()
    })
  })

  describe('tienePermiso', () => {
    it('should return false when user has no permissions', () => {
      store.$patch({ permisos: [] })
      expect(store.tienePermiso('usuarios.manage')).toBe(false)
    })

    it('should return true when user has the required permission', () => {
      store.$patch({ permisos: ['usuarios.manage'] })
      expect(store.tienePermiso('usuarios.manage')).toBe(true)
    })
  })

  describe('esAdmin', () => {
    it('should be false without usuarios.manage permission', () => {
      store.$patch({ permisos: [] })
      expect(store.esAdmin).toBe(false)
    })

    it('should be true with usuarios.manage permission', () => {
      store.$patch({ permisos: ['usuarios.manage'] })
      expect(store.esAdmin).toBe(true)
    })
  })

  describe('cargarEmpresas', () => {
    it('should populate empresas when user exists', async () => {
      store.$patch({ user: { id: 'user-123' } })
      const chain = makeChain({
        data: [
          { empresa_id: 1, empresa: { id: 1, nombre: 'Panadería Test' } },
        ],
        error: null,
      })
      supabase.from.mockReturnValue(chain)

      await store.cargarEmpresas()

      expect(store.empresas).toHaveLength(1)
      expect(store.empresas[0].nombre).toBe('Panadería Test')
    })

    it('should not call supabase when user is null', async () => {
      store.$patch({ user: null })
      await store.cargarEmpresas()
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })

  describe('guardarIdioma', () => {
    it('should persist language preference in profile', async () => {
      store.$patch({ user: { id: 'user-123' }, perfil: { nombre: 'Test' } })
      const chain = makeChain({ data: null, error: null })
      supabase.from.mockReturnValue(chain)

      await store.guardarPerfil({ idioma: 'en' })

      expect(supabase.from).toHaveBeenCalledWith('perfiles')
    })

    it('should load language from profile on initialization', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
      }
      const mockProfile = { id: 'user-123', idioma: 'en' }

      localStorage.setItem('panaderia_session', JSON.stringify(mockSession))

      supabase.from.mockReturnValue(makeChain({ data: mockProfile, error: null }))

      await store.initialize()

      expect(store.perfil).toEqual(mockProfile)
    })
  })
})
