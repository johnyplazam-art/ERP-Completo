import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/core/supabase'
import i18n from '@/i18n'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const perfil = ref(null)
  const empresas = ref([])
  const currentEmpresa = ref(null)
  const empresaUsuarios = ref([])
  const permisos = ref([])

  const isAuthenticated = computed(() => !!user.value && !!session.value)
  const userEmail = computed(() => user.value?.email ?? '')
  const currentEmpresaId = computed(() => currentEmpresa.value?.id ?? null)

  // Backward-compatible shims (derived from permisos)
  const currentRol = computed(() => {
    if (!currentEmpresaId.value || !empresaUsuarios.value.length) return null
    // For backwards compat, derive from first user_roles-like permission group
    // Will be removed once all components use tienePermiso()
    return null
  })
  const esAdmin = computed(() => tienePermiso('usuarios.manage'))
  const puedeEscribir = computed(() =>
    ['ingredientes.create', 'recetas.create', 'ordenes.create', 'productos.create']
      .some(p => tienePermiso(p))
  )

  function tienePermiso(accion) {
    return permisos.value.includes(accion)
  }

  async function cargarPermisos(empresaId) {
    if (!user.value || !empresaId) {
      permisos.value = []
      return
    }
    try {
      const { data } = await supabase.rpc('get_user_permissions', {
        p_user_id: user.value.id,
        p_app_slug: 'panaderia',
        p_empresa_id: empresaId,
      })
      permisos.value = (data ?? []).map(p => p.action_name)
    } catch (err) {
      console.error('[auth] Error cargando permisos:', err)
      permisos.value = []
    }
  }

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

      // Cargar permisos para la empresa seleccionada
      if (currentEmpresa.value) {
        await cargarPermisos(currentEmpresa.value.id)
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

      // Restaurar idioma guardado
      if (data?.idioma) {
        i18n.global.locale.value = data.idioma
      }
    } catch (err) {
      console.error('[auth] Error cargando perfil:', err)
    }
  }

  async function seleccionarEmpresa(empresa) {
    currentEmpresa.value = empresa
    if (empresa) {
      localStorage.setItem('panaderia_empresa_id', String(empresa.id))
      await cargarPermisos(empresa.id)
    } else {
      localStorage.removeItem('panaderia_empresa_id')
      permisos.value = []
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
        permisos.value = []
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
      empresaUsuarios.value = data ?? []
    } catch (err) {
      console.error('[auth] Error cargando usuarios:', err)
    }
  }

  async function guardarIdioma(idioma) {
    if (!user.value) return
    try {
      await supabase
        .from('perfiles')
        .update({ idioma })
        .eq('id', user.value.id)
    } catch (err) {
      console.error('[auth] Error guardando idioma:', err)
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
    permisos,
    isAuthenticated,
    userEmail,
    currentEmpresaId,
    currentRol,
    esAdmin,
    puedeEscribir,
    tienePermiso,
    initialize,
    login,
    signup,
    logout,
    cargarEmpresas,
    cargarPerfil,
    seleccionarEmpresa,
    cargarUsuariosEmpresa,
    cargarPermisos,
    guardarIdioma,
  }
})
