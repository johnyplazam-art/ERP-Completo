<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const authStore = useAuthStore()
const usuarios = ref([])
const isLoading = ref(false)
const roles = ref([])
const isLoadingRoles = ref(false)
const empresaFiltro = ref(null) // null = todas
const searchQuery = ref('')

const puedeInvitar = computed(() => authStore.tienePermiso('usuarios.invite'))
const puedeGestionarRoles = computed(() => authStore.tienePermiso('usuarios.manage'))

// Empresas disponibles para el filtro
const empresasUnicas = computed(() => {
  const map = new Map()
  for (const u of usuarios.value) {
    if (u.empresa && !map.has(u.empresa.id)) {
      map.set(u.empresa.id, u.empresa)
    }
  }
  return [...map.values()]
})

// Usuarios filtrados
const usuariosFiltrados = computed(() => {
  let filtered = usuarios.value

  if (empresaFiltro.value) {
    filtered = filtered.filter(u => u.empresa_id === empresaFiltro.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(u =>
      (u.usuario?.nombre || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  }

  return filtered
})

const panaderiaAppId = ref(null)

async function cargarPanaderiaAppId() {
  if (panaderiaAppId.value) return
  panaderiaAppId.value = await authStore.getAppId('panaderia')
}

async function cargarUsuarios() {
  if (!authStore.user) return

  isLoading.value = true
  try {
    const resultado = await authStore.cargarUsuariosMultiEmpresa()
    usuarios.value = resultado
  } catch (err) {
    console.error('[admin-users] Error cargando usuarios:', err)
    toast.error(t('errors.loadUsers'))
  } finally {
    isLoading.value = false
  }
}

async function cargarRoles() {
  const appId = panaderiaAppId.value
  if (!appId) return

  isLoadingRoles.value = true
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, slug, description')
      .eq('application_id', appId)
      .order('id')
    if (error) throw error
    roles.value = data ?? []
  } catch (err) {
    console.error('[admin-users] Error cargando roles:', err)
  } finally {
    isLoadingRoles.value = false
  }
}

const rolesAsignables = computed(() => {
  if (!puedeGestionarRoles.value) {
    return roles.value.filter(r => ['ayudante_panificador', 'usuario'].includes(r.slug))
  }
  return roles.value
})

async function cambiarRol(usuarioId, empresaId, nuevoRoleId) {
  const appId = panaderiaAppId.value
  if (!appId) return

  try {
    const { error } = await supabase
      .from('user_roles')
      .update({ role_id: Number(nuevoRoleId) })
      .eq('user_id', usuarioId)
      .eq('empresa_id', empresaId)
      .eq('application_id', appId)
    if (error) throw error
    toast.success(t('users.roleUpdated'))
    await cargarUsuarios()
  } catch (err) {
    console.error('[admin-users] Error cambiando rol:', err)
    toast.error(t('errors.updateRole'))
  }
}

async function toggleActivo(usuarioId, empresaId, activo) {
  try {
    const { error } = await supabase
      .from('empresa_usuarios')
      .update({ activo })
      .eq('empresa_id', empresaId)
      .eq('usuario_id', usuarioId)
    if (error) throw error
    toast.success(activo ? t('users.activate') : t('users.deactivate'))
    await cargarUsuarios()
  } catch (err) {
    console.error('[admin-users] Error cambiando estado:', err)
    toast.error(t('errors.updateStatus'))
  }
}

async function copiarInvitacion() {
  // Usa la empresa actual del auth store por defecto
  if (!authStore.currentEmpresa) return
  const link = `${window.location.origin}/signup?invitacion=${authStore.currentEmpresa.slug}`
  try {
    await navigator.clipboard.writeText(link)
    toast.success(t('users.linkCopied'))
  } catch {
    toast.error(t('errors.generic'))
  }
}

// Init
watch(() => authStore.user, async () => {
  if (authStore.user) {
    await cargarPanaderiaAppId()
    cargarUsuarios()
    cargarRoles()
  }
}, { immediate: true })
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">{{ t('admin.usersTitle') }}</h2>
      <button
        v-if="puedeInvitar"
        @click="copiarInvitacion"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-link mr-2"></i>
        {{ t('users.invite') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('common.search')"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <!-- Filter by empresa -->
      <select
        v-model="empresaFiltro"
        class="text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:ring-2 focus:ring-primary-500"
      >
        <option :value="null">{{ t('admin.allCompanies') }}</option>
        <option
          v-for="emp in empresasUnicas"
          :key="emp.id"
          :value="emp.id"
        >
          {{ emp.nombre }}
        </option>
      </select>

      <span class="text-sm text-gray-400">
        {{ usuariosFiltrados.length }} {{ t('admin.usersCount') }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!usuariosFiltrados.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-users text-4xl mb-3"></i>
      <p>{{ t('users.noUsers') }}</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">{{ t('users.title') }}</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">{{ t('admin.company') }}</th>
              <th class="px-4 py-3">{{ t('admin.type') }}</th>
              <th class="px-4 py-3">{{ t('users.role') }}</th>
              <th class="px-4 py-3">{{ t('users.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="eu in usuariosFiltrados"
              :key="`${eu.usuario_id}:${eu.empresa_id}`"
              class="border-t border-gray-100 hover:bg-gray-50"
            >
              <!-- User name + avatar -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
                    :class="eu.es_dueno
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary-100 text-primary-700'"
                  >
                    {{ (eu.usuario?.nombre || '?').charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium text-gray-900 truncate max-w-[160px]">
                    {{ eu.usuario?.nombre || 'Sin nombre' }}
                  </span>
                  <span
                    v-if="eu.usuario_id === authStore.user?.id"
                    class="text-xs text-gray-400 shrink-0"
                  >
                    ({{ t('users.you') }})
                  </span>
                </div>
              </td>

              <!-- Email -->
              <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                {{ eu.email }}
              </td>

              <!-- Empresa -->
              <td class="px-4 py-3">
                <span class="text-gray-700">{{ eu.empresa?.nombre || '—' }}</span>
              </td>

              <!-- Primary / Secondary -->
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="eu.es_dueno
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-blue-50 text-blue-700'"
                >
                  <i
                    :class="eu.es_dueno ? 'pi pi-star-fill mr-1' : 'pi pi-user mr-1'"
                    class="text-xs"
                  ></i>
                  {{ eu.es_dueno ? t('admin.primary') : t('admin.secondary') }}
                </span>
              </td>

              <!-- Role -->
              <td class="px-4 py-3">
                <select
                  v-if="puedeGestionarRoles && eu.usuario_id !== authStore.user?.id"
                  :value="eu.rol_actual?.role_id"
                  class="text-sm rounded border border-gray-300 px-2 py-1 text-gray-700 focus:ring-2 focus:ring-primary-500 max-w-[140px]"
                  @change="cambiarRol(eu.usuario_id, eu.empresa_id, $event.target.value)"
                >
                  <option
                    v-for="r in rolesAsignables"
                    :key="r.id"
                    :value="r.id"
                  >
                    {{ t('roles.' + r.slug) }}
                  </option>
                </select>
                <span v-else class="text-gray-600 text-sm">
                  {{ t('roles.' + (eu.rol_actual?.role?.slug || 'usuario')) }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="eu.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ eu.activo ? t('users.active') : t('users.inactive') }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3">
                <button
                  v-if="eu.usuario_id !== authStore.user?.id"
                  @click="toggleActivo(eu.usuario_id, eu.empresa_id, !eu.activo)"
                  class="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <i :class="eu.activo ? 'pi pi-ban' : 'pi pi-check-circle'" class="mr-1"></i>
                  {{ eu.activo ? t('users.deactivate') : t('users.activate') }}
                </button>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
