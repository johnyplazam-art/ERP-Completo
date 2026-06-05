import { ref, computed } from 'vue'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'

/**
 * usePermissions — verifica permisos del usuario actual
 *
 * Uso:
 *   const { can, hasRole, isAdmin } = usePermissions()
 *   if (can('ordenes.create')) { ... }
 *   if (hasRole('produccion')) { ... }
 */
export function usePermissions() {
  const authStore = useAuthStore()
  const permissions = ref([])
  const roles = ref([])
  const loaded = ref(false)
  const loading = ref(false)

  async function loadPermissions() {
    if (!authStore.user) return
    if (loaded.value) return

    loading.value = true
    try {
      // Obtener roles del usuario
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role_id, roles!inner(name, slug), application_id')
        .eq('user_id', authStore.user.id)

      roles.value =
        userRoles?.map((ur) => ({
          id: ur.role_id,
          name: ur.roles.name,
          slug: ur.roles.slug,
        })) || []

      // Obtener permisos via RPC
      const { data: perms } = await supabase.rpc('get_user_permissions', {
        p_user_id: authStore.user.id,
        p_app_slug: 'panaderia',
      })

      permissions.value = perms?.map((p) => p.action_name) || []
      loaded.value = true
    } catch (err) {
      console.error('[usePermissions] Error loading permissions:', err)
    } finally {
      loading.value = false
    }
  }

  /** Verifica si el usuario tiene un permiso específico */
  function can(action) {
    // Admin puede todo
    if (roles.value.some((r) => r.slug === 'admin')) return true
    return permissions.value.includes(action)
  }

  /** Verifica si el usuario tiene un rol específico */
  function hasRole(slug) {
    return roles.value.some((r) => r.slug === slug)
  }

  const isAdmin = computed(() => hasRole('admin'))
  const isProduccion = computed(() => hasRole('produccion'))
  const isVentas = computed(() => hasRole('ventas'))

  return {
    permissions,
    roles,
    loading,
    loaded,
    loadPermissions,
    can,
    hasRole,
    isAdmin,
    isProduccion,
    isVentas,
  }
}
