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

  async function cargarAppsDisponibles() {
    if (!currentEmpresaId.value || !user.value) return []
    try {
      const { data: apps } = await supabase
        .from('applications')
        .select('id, slug, name, description, is_active')
        .order('id')

      // Filtrar apps donde el usuario tenga al menos un rol
      const { data: roles } = await supabase
        .from('user_roles')
        .select('application_id')
        .eq('user_id', user.value.id)
        .eq('empresa_id', currentEmpresaId.value)

      const appsConRoles = new Set(roles?.map(r => r.application_id) ?? [])
      return (apps ?? []).map(app => ({
        ...app,
        disponible: appsConRoles.has(app.id),
      }))
    } catch (err) {
      console.error('[auth] Error cargando apps:', err)
      return []
    }
  }

  async function cargarUsuariosMultiEmpresa(empresaId = null) {
    if (!user.value) return []
    try {
      // Base: empresa_usuarios + perfiles
      let query = supabase
        .from('empresa_usuarios')
        .select(`
          *,
          usuario:perfiles!inner(*),
          empresa:empresas!inner(nombre, slug)
        `)

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      const { data: memberships } = await query
      if (!memberships?.length) return []

      const empresaIds = [...new Set(memberships.map(m => m.empresa_id))]
      const userIds = [...new Set(memberships.map(m => m.usuario_id))]

      // Roles actuales desde user_roles
      const appId = await getAppId('panaderia')
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, empresa_id, role_id, role:roles(slug, name)')
        .in('user_id', userIds)
        .in('empresa_id', empresaIds)
        .eq('application_id', appId)

      // Emails via RPC multi-empresa
      const { data: emails } = await supabase
        .rpc('get_usuarios_email_all', { p_empresa_ids: empresaIds })
      const emailMap = new Map(emails?.map(e => [e.usuario_id, e.email]) ?? [])

      // Index roles por (user_id, empresa_id)
      const rolesMap = new Map()
      for (const ur of userRoles ?? []) {
        rolesMap.set(`${ur.user_id}:${ur.empresa_id}`, ur)
      }

      return memberships.map(m => ({
        ...m,
        email: emailMap.get(m.usuario_id) ?? '—',
        rol_actual: rolesMap.get(`${m.usuario_id}:${m.empresa_id}`) ?? null,
      }))
    } catch (err) {
      console.error('[auth] Error cargando usuarios multi-empresa:', err)
      return []
    }
  }

  // Cache simple para app IDs
  const _appIdCache = new Map()
  async function getAppId(slug) {
    if (_appIdCache.has(slug)) return _appIdCache.get(slug)
    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('slug', slug)
      .single()
    if (data?.id) _appIdCache.set(slug, data.id)
    return data?.id ?? null
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
    cargarAppsDisponibles,
    cargarUsuariosMultiEmpresa,
    getAppId,
  }
})
