import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/core/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const perfil = ref(null)
  const empresas = ref([])
  const currentEmpresa = ref(null)
  const empresaUsuarios = ref([])

  const isAuthenticated = computed(() => !!user.value && !!session.value)
  const userEmail = computed(() => user.value?.email ?? '')
  const currentEmpresaId = computed(() => currentEmpresa.value?.id ?? null)
  const currentRol = computed(() => {
    if (!currentEmpresaId.value || !empresaUsuarios.value.length) return null
    const eu = empresaUsuarios.value.find(eu => eu.empresa_id === currentEmpresaId.value)
    return eu?.rol ?? null
  })
  const esAdmin = computed(() => currentRol.value === 'admin')
  const puedeEscribir = computed(() => ['admin', 'produccion'].includes(currentRol.value))

  async function cargarEmpresas() {
    if (!user.value) return
    try {
      const { data } = await supabase
        .from('empresa_usuarios')
        .select('*, empresa:empresas(*)')
        .eq('usuario_id', user.value.id)
        .eq('activo', true)
      empresaUsuarios.value = data ?? []
      empresas.value = (data ?? []).map(eu => eu.empresa).filter(Boolean)

      // Restaurar última empresa activa del localStorage
      const savedId = localStorage.getItem('panaderia_empresa_id')
      if (savedId && empresas.value.some(e => e.id === Number(savedId))) {
        currentEmpresa.value = empresas.value.find(e => e.id === Number(savedId))
      } else if (empresas.value.length > 0) {
        currentEmpresa.value = empresas.value[0]
      }
    } catch (err) {
      console.error('[auth] Error cargando empresas:', err)
    }
  }

  async function cargarPerfil() {
    if (!user.value) return
    try {
      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.value.id)
        .single()
      perfil.value = data
    } catch (err) {
      console.error('[auth] Error cargando perfil:', err)
    }
  }

  async function seleccionarEmpresa(empresa) {
    currentEmpresa.value = empresa
    if (empresa) {
      localStorage.setItem('panaderia_empresa_id', String(empresa.id))
    } else {
      localStorage.removeItem('panaderia_empresa_id')
    }
  }

  async function initialize() {
    loading.value = true
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      session.value = currentSession
      user.value = currentSession?.user ?? null

      if (user.value) {
        await Promise.all([cargarPerfil(), cargarEmpresas()])
      }
    } catch (error) {
      console.error('[auth] Error initializing session:', error)
    } finally {
      loading.value = false
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
      if (user.value) {
        await Promise.all([cargarPerfil(), cargarEmpresas()])
      } else {
        perfil.value = null
        empresas.value = []
        currentEmpresa.value = null
        empresaUsuarios.value = []
      }
    })
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signup(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } })
    if (error) throw error
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function cargarUsuariosEmpresa() {
    if (!currentEmpresaId.value) return
    try {
      const { data } = await supabase
        .from('empresa_usuarios')
        .select('*, usuario:perfiles(*)')
        .eq('empresa_id', currentEmpresaId.value)
        .order('rol')
      empresaUsuarios.value = data ?? []
    } catch (err) {
      console.error('[auth] Error cargando usuarios:', err)
    }
  }

  return {
    user,
    session,
    loading,
    perfil,
    empresas,
    currentEmpresa,
    empresaUsuarios,
    isAuthenticated,
    userEmail,
    currentEmpresaId,
    currentRol,
    esAdmin,
    puedeEscribir,
    initialize,
    login,
    signup,
    logout,
    cargarEmpresas,
    cargarPerfil,
    seleccionarEmpresa,
    cargarUsuariosEmpresa,
  }
})
