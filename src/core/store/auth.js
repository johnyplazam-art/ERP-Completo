import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/core/supabase'
import i18n from '@/i18n'

const SESSION_KEY = 'panaderia_session'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const perfil = ref(null)
  const empresas = ref([])
  const currentEmpresa = ref(null)
  const currentIndustria = ref(null)
  const empresaUsuarios = ref([])
  const permisos = ref([])
  const rolActual = ref(null)

  const isAuthenticated = computed(() => !!user.value && !!session.value)
  const userEmail = computed(() => user.value?.email ?? '')
  const currentEmpresaId = computed(() => currentEmpresa.value?.id ?? null)
  const industriaSlug = computed(() => currentIndustria.value?.slug ?? null)

  const currentRol = computed(() => rolActual.value)
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

  async function cargarRolActual() {
    if (!user.value || !currentEmpresaId.value) {
      rolActual.value = null
      return
    }
    try {
      const appId = await getAppId('panaderia')
      if (!appId) return
      const { data } = await supabase
        .from('user_roles')
        .select('role:role_id(slug)')
        .eq('user_id', user.value.id)
        .eq('empresa_id', currentEmpresaId.value)
        .eq('application_id', appId)
        .maybeSingle()
      rolActual.value = data?.role?.slug ?? null
    } catch (err) {
      console.error('[auth] Error cargando rol actual:', err)
      rolActual.value = null
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
        const emp = empresas.value.find(e => e.id === Number(savedId))
        currentEmpresa.value = emp
        currentIndustria.value = emp.industria_principal
      } else if (empresas.value.length > 0) {
        const emp = empresas.value[0]
        currentEmpresa.value = emp
        currentIndustria.value = emp.industria_principal
      }

      // Cargar permisos para la empresa seleccionada
      if (currentEmpresa.value) {
        await cargarPermisos(currentEmpresa.value.id)
        await cargarRolActual()
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
      currentIndustria.value = empresa.industria_principal
      await cargarPermisos(empresa.id)
      await cargarRolActual()
    } else {
      localStorage.removeItem('panaderia_empresa_id')
      permisos.value = []
      rolActual.value = null
      currentIndustria.value = null
    }
  }

  async function initialize() {
    loading.value = true
    let _initializing = true

    try {
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'INITIAL_SESSION') return

        session.value = newSession
        user.value = newSession?.user ?? null

        if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(SESSION_KEY)
        }

        // Durante initialize() el loading de datos lo hace el código
        // posterior a setSession(), para evitar cargas duplicadas.
        if (_initializing) return

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

      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.refresh_token) {
            const { data, error } = await Promise.race([
              supabase.auth.setSession(parsed),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout setSession')), 5000))
            ])
            if (!error && data?.session) {
              session.value = data.session
              user.value = data.session.user
              localStorage.setItem(SESSION_KEY, JSON.stringify(data.session))
              await Promise.all([cargarPerfil(), cargarEmpresas()])
            } else {
              localStorage.removeItem(SESSION_KEY)
            }
          }
        } catch {
          localStorage.removeItem(SESSION_KEY)
        }
      }
    } catch (error) {
      console.error('[auth] Error initializing session:', error)
    } finally {
      _initializing = false
      loading.value = false
    }
  }

  async function login(email, password) {
    const result = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor')), 10000))
    ])
    if (result.error) throw result.error
    localStorage.setItem(SESSION_KEY, JSON.stringify(result.data.session))
    return result.data
  }

  async function signup(email, password, metadata = {}) {
    const result = await Promise.race([
      supabase.auth.signUp({ email, password, options: { data: metadata } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor')), 10000))
    ])
    if (result.error) throw result.error
    if (result.data.session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(result.data.session))
    }
    return result.data
  }

  async function logout() {
    localStorage.removeItem(SESSION_KEY)
    const result = await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor')), 10000))
    ])
    if (result?.error) throw result.error
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
      // 1. Obtener apps incluidas en el plan activo de la suscripción
      const { data: appsPorPlan } = await supabase
        .rpc('get_apps_por_suscripcion', { p_empresa_id: Number(currentEmpresaId.value) })

      // 2. Obtener apps donde el usuario tenga al menos un rol
      const { data: roles } = await supabase
        .from('user_roles')
        .select('application_id')
        .eq('user_id', user.value.id)
        .eq('empresa_id', currentEmpresaId.value)

      const appsConRoles = new Set(roles?.map(r => r.application_id) ?? [])
      const appsDelPlan = new Set(appsPorPlan?.map(a => a.id) ?? [])

      // 3. Retornar solo apps que estén en AMBOS: plan + tiene rol
      return (appsPorPlan ?? []).map(app => ({
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

  async function guardarPerfil(datos) {
    if (!user.value) return
    const { error } = await supabase
      .from('perfiles')
      .update(datos)
      .eq('id', user.value.id)
    if (error) throw error
    // Actualizar ref local
    if (datos.nombre !== undefined) perfil.value.nombre = datos.nombre
    if (datos.avatar_url !== undefined) perfil.value.avatar_url = datos.avatar_url
    if (datos.phone !== undefined) perfil.value.phone = datos.phone
    if (datos.idioma !== undefined) {
      perfil.value.idioma = datos.idioma
      i18n.global.locale.value = datos.idioma
    }
  }

  // ─── Admin users ──────────────────────────────────

  async function cargarRolesPorApp(appId) {
    if (!appId) return []
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, slug, description')
      .eq('application_id', appId)
      .order('id')
    if (error) throw error
    return data ?? []
  }

  async function cambiarRol(usuarioId, empresaId, roleId, appId) {
    const { error } = await supabase
      .from('user_roles')
      .update({ role_id: Number(roleId) })
      .eq('user_id', usuarioId)
      .eq('empresa_id', empresaId)
      .eq('application_id', appId)
    if (error) throw error
  }

  async function toggleActivo(usuarioId, empresaId, activo) {
    const { error } = await supabase
      .from('empresa_usuarios')
      .update({ activo })
      .eq('empresa_id', empresaId)
      .eq('usuario_id', usuarioId)
    if (error) throw error
  }

  async function removerUsuario(usuarioId, empresaId, appId) {
    if (appId) {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', usuarioId)
        .eq('empresa_id', empresaId)
        .eq('application_id', appId)
    }
    const { error } = await supabase
      .from('empresa_usuarios')
      .delete()
      .eq('empresa_id', empresaId)
      .eq('usuario_id', usuarioId)
    if (error) throw error
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
    rolActual,
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
    guardarPerfil,
    cargarAppsDisponibles,
    cargarUsuariosMultiEmpresa,
    getAppId,
    cargarRolesPorApp,
    cambiarRol,
    toggleActivo,
    removerUsuario,
  }
})
