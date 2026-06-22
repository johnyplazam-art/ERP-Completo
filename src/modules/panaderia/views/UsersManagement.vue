<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'
import { toast } from 'vue-sonner'
import { useInvite } from '@/core/composables/useInvite'

const { t } = useI18n()
const authStore = useAuthStore()
const { copiarInvitacion: copiarLink } = useInvite()
const usuarios = ref([])
const isLoading = ref(false)
const roles = ref([])
const isLoadingRoles = ref(true)

const puedeInvitar = computed(() => authStore.tienePermiso('usuarios.invite'))
const puedeGestionarRoles = computed(() => authStore.tienePermiso('usuarios.manage'))

async function cargarUsuarios() {
  const empresaId = authStore.currentEmpresaId
  if (!empresaId) return

  isLoading.value = true
  try {
    usuarios.value = await authStore.cargarUsuariosMultiEmpresa(empresaId)
  } catch (err) {
    console.error('[users] Error cargando:', err)
    toast.error(t('errors.loadUsers'))
  } finally {
    isLoading.value = false
  }
}

async function cargarRoles() {
  const appId = await authStore.getAppId(authStore.currentAppSlug)
  if (!appId) return

  isLoadingRoles.value = true
  try {
    roles.value = await authStore.cargarRolesPorApp(appId)
  } catch (err) {
    console.error('[users] Error cargando roles:', err)
  } finally {
    isLoadingRoles.value = false
  }
}

// Roles que el usuario actual puede asignar (basado en su rol)
const rolesAsignables = computed(() => {
  if (!authStore.tienePermiso('usuarios.manage')) {
    // No-admin solo puede asignar roles menores
    return roles.value.filter(r => ['ayudante_panificador', 'usuario'].includes(r.slug))
  }
  return roles.value
})

async function cambiarRol(usuarioId, nuevoRoleId) {
  const empresaId = authStore.currentEmpresaId
  const appId = await authStore.getAppId(authStore.currentAppSlug)
  if (!empresaId || !appId) return

  try {
    await authStore.cambiarRol(usuarioId, empresaId, Number(nuevoRoleId), appId)
    toast.success(t('users.roleUpdated'))
    await cargarUsuarios()
  } catch (err) {
    console.error('[users] Error cambiando rol:', err)
    toast.error(t('errors.updateRole'))
  }
}

async function toggleActivo(usuarioId, activo) {
  const empresaId = authStore.currentEmpresaId
  if (!empresaId) return
  try {
    await authStore.toggleActivo(usuarioId, empresaId, activo)
    toast.success(activo ? t('users.activate') : t('users.deactivate'))
    await cargarUsuarios()
  } catch (err) {
    console.error('[users] Error cambiando estado:', err)
    toast.error(t('errors.updateStatus'))
  }
}

async function copiarInvitacion() {
  if (!authStore.currentEmpresa) return
  await copiarLink(authStore.currentEmpresa.slug)
}

// Inicializar: cargar datos al seleccionar empresa
watch(() => authStore.currentEmpresaId, async () => {
  if (authStore.currentEmpresaId) {
    cargarUsuarios()
    cargarRoles()
  }
}, { immediate: true })
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">{{ t('users.title') }}</h2>
      <button
        v-if="puedeInvitar"
        @click="copiarInvitacion"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-link mr-2"></i>
        {{ t('users.invite') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!usuarios.length" class="text-center py-12 text-gray-400">
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
              <th class="px-4 py-3">{{ t('auth.email') }}</th>
              <th class="px-4 py-3">{{ t('users.role') }}</th>
              <th class="px-4 py-3">{{ t('users.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="eu in usuarios"
              :key="eu.usuario_id"
              class="border-t border-gray-100 hover:bg-gray-50"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {{ (eu.usuario?.nombre || '?').charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium text-gray-900">{{ eu.usuario?.nombre || 'Sin nombre' }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ eu.email }}</td>
              <td class="px-4 py-3">
                <select
                  v-if="puedeGestionarRoles && eu.usuario_id !== authStore.user?.id"
                  :value="eu.rol_actual?.role_id"
                  class="text-sm rounded border border-gray-300 px-2 py-1 text-gray-700 focus:ring-2 focus:ring-primary-500"
                  @change="cambiarRol(eu.usuario_id, $event.target.value)"
                >
                  <option
                    v-for="r in rolesAsignables"
                    :key="r.id"
                    :value="r.id"
                  >
                    {{ t('roles.' + r.slug) }}
                  </option>
                </select>
                <span v-else class="text-gray-600">
                  {{ t('roles.' + (eu.rol_actual?.role?.slug || 'usuario')) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="eu.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ eu.activo ? t('users.active') : t('users.inactive') }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button
                  v-if="eu.usuario_id !== authStore.user?.id"
                  @click="toggleActivo(eu.usuario_id, !eu.activo)"
                  class="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <i :class="eu.activo ? 'pi pi-ban' : 'pi pi-check-circle'" class="mr-1"></i>
                  {{ eu.activo ? t('users.deactivate') : t('users.activate') }}
                </button>
                <span v-else class="text-xs text-gray-400">({{ t('users.you') }})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
