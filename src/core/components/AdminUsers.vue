<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'
import { useRoute } from 'vue-router'
import { useInvite } from '@/core/composables/useInvite'
import { toast } from 'vue-sonner'
import { supabase } from '@/core/supabase'

const { t } = useI18n()

const authStore = useAuthStore()
const route = useRoute()
const { copiarInvitacion: copiarLink } = useInvite()
const usuarios = ref([])
const isLoading = ref(false)
const roles = ref([])
const isLoadingRoles = ref(false)
const loadingAction = ref(null) // key de la fila en operación: "${usuario_id}:${empresa_id}"
const empresaFiltro = ref(null) // null = todas
const searchQuery = ref('')

// ─── Edit profile modal ─────────────────────────────

const editModal = ref(null)
const editLoading = ref(false)

function abrirEditar(eu) {
  editModal.value = {
    usuario_id: eu.usuario_id,
    nombre: eu.usuario?.nombre || '',
    apellido: eu.usuario?.apellido || '',
    phone: eu.usuario?.phone || '',
    tipo_documento: eu.usuario?.tipo_documento || 'DNI',
    documento: eu.usuario?.documento || '',
    fecha_nacimiento: eu.usuario?.fecha_nacimiento || '',
    direccion: eu.usuario?.direccion || '',
    ciudad: eu.usuario?.ciudad || '',
    provincia: eu.usuario?.provincia || '',
    pais: eu.usuario?.pais || 'AR',
    puesto: eu.usuario?.puesto || '',
    idioma: eu.usuario?.idioma || 'es',
  }
}

function cerrarEditar() {
  editModal.value = null
  editLoading.value = false
}

async function guardarEditar() {
  if (!editModal.value?.nombre.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }
  editLoading.value = true
  try {
    const { error } = await supabase
      .from('perfiles')
      .update({
        nombre: editModal.value.nombre.trim(),
        apellido: editModal.value.apellido.trim(),
        phone: editModal.value.phone.trim(),
        tipo_documento: editModal.value.tipo_documento,
        documento: editModal.value.documento.trim(),
        fecha_nacimiento: editModal.value.fecha_nacimiento || null,
        direccion: editModal.value.direccion.trim(),
        ciudad: editModal.value.ciudad.trim(),
        provincia: editModal.value.provincia.trim(),
        pais: editModal.value.pais,
        puesto: editModal.value.puesto.trim(),
        idioma: editModal.value.idioma,
      })
      .eq('id', editModal.value.usuario_id)
    if (error) throw error
    toast.success('Perfil actualizado')
    cerrarEditar()
    await cargarUsuarios()
  } catch (err) {
    toast.error(err.message || 'Error al actualizar perfil')
  } finally {
    editLoading.value = false
  }
}

// ─── Reset password ─────────────────────────────────

const resetLoading = ref(false)

async function resetPassUsuario(userEmail) {
  resetLoading.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    })
    if (error) throw error
    toast.success('Correo de recuperación enviado')
  } catch (err) {
    toast.error(err.message || 'Error al enviar correo de recuperación')
  } finally {
    resetLoading.value = false
  }
}

// ─── Confirmación de remover usuario ──────────────────

const esModoGlobal = computed(() => route.name === 'admin-todos-usuarios')
const puedeInvitar = computed(() => authStore.isPlatformAdmin || authStore.tienePermiso('usuarios.invite'))
const puedeGestionarRoles = computed(() => authStore.isPlatformAdmin || authStore.tienePermiso('usuarios.manage'))

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
      (u.usuario?.apellido || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  }

  return filtered
})

const panaderiaAppId = ref(null)

async function cargarPanaderiaAppId() {
  if (panaderiaAppId.value) return
  try {
    panaderiaAppId.value = await authStore.getAppId('panaderia')
  } catch (err) {
    console.error('[admin-users] Error cargando appId:', err)
    panaderiaAppId.value = null
  }
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
    roles.value = await authStore.cargarRolesPorApp(appId)
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

  const key = `${usuarioId}:${empresaId}`
  loadingAction.value = key
  try {
    await authStore.cambiarRol(usuarioId, empresaId, nuevoRoleId, appId)
    toast.success(t('users.roleUpdated'))
    await cargarUsuarios()
  } catch (err) {
    console.error('[admin-users] Error cambiando rol:', err)
    toast.error(t('errors.updateRole'))
  } finally {
    loadingAction.value = null
  }
}

async function toggleActivo(usuarioId, empresaId, activo) {
  const key = `${usuarioId}:${empresaId}`
  loadingAction.value = key
  try {
    await authStore.toggleActivo(usuarioId, empresaId, activo)
    toast.success(activo ? t('users.activate') : t('users.deactivate'))
    await cargarUsuarios()
  } catch (err) {
    console.error('[admin-users] Error cambiando estado:', err)
    toast.error(t('errors.updateStatus'))
  } finally {
    loadingAction.value = null
  }
}

// ─── Remover usuario de la empresa (DELETE) ──────────

function confirmarRemover(eu) {
  if (eu.usuario_id === authStore.user?.id) {
    toast.error(t('users.cannotRemoveSelf'))
    return
  }
  if (eu.es_dueno) {
    toast.error(t('users.cannotRemoveOwner'))
    return
  }

  confirm.require({
    message: t('users.removeConfirm', { nombre: eu.usuario?.nombre || '?' }),
    header: t('users.removeUser'),
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: t('common.cancel'),
    acceptLabel: t('users.removeUser'),
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await authStore.removerUsuario(eu.usuario_id, eu.empresa_id, panaderiaAppId.value)
        toast.success(t('users.removeSuccess'))
        await cargarUsuarios()
      } catch (err) {
        console.error('[admin-users] Error removiendo usuario:', err)
        toast.error(t('users.removeError'))
      }
    },
  })
}

// ─── Invitación ──────────────────────────────────────

async function copiarInvitacion() {
  if (!authStore.currentEmpresa) return
  await copiarLink(authStore.currentEmpresa.slug)
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
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('common.search')"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

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
                  <div class="min-w-0">
                    <span class="font-medium text-gray-900 truncate block max-w-[160px]">
                      {{ [eu.usuario?.nombre, eu.usuario?.apellido].filter(Boolean).join(' ') || 'Sin nombre' }}
                    </span>
                    <span
                      v-if="eu.usuario_id === authStore.user?.id"
                      class="text-xs text-gray-400"
                    >
                      ({{ t('users.you') }})
                    </span>
                  </div>
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
                  class="text-sm rounded border border-gray-300 px-2 py-1 text-gray-700 focus:ring-2 focus:ring-primary-500 max-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="loadingAction === `${eu.usuario_id}:${eu.empresa_id}`"
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
                <div class="flex items-center gap-2">
                  <!-- Edit user -->
                  <button
                    v-if="puedeGestionarRoles"
                    @click="abrirEditar(eu)"
                    class="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    title="Editar perfil"
                  >
                    <i class="pi pi-pencil text-lg"></i>
                  </button>

                  <!-- Reset password -->
                  <button
                    v-if="puedeGestionarRoles && eu.usuario_id !== authStore.user?.id"
                    @click="resetPassUsuario(eu.email)"
                    class="text-sm text-gray-500 hover:text-purple-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="resetLoading"
                    title="Enviar recuperación de contraseña"
                  >
                    <i class="pi pi-key text-lg"></i>
                  </button>

                  <!-- Toggle active -->
                  <button
                    v-if="eu.usuario_id !== authStore.user?.id"
                    @click="toggleActivo(eu.usuario_id, eu.empresa_id, !eu.activo)"
                    class="text-sm text-gray-500 hover:text-amber-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="loadingAction === `${eu.usuario_id}:${eu.empresa_id}`"
                    :title="eu.activo ? 'Desactivar' : 'Activar'"
                  >
                    <i :class="eu.activo ? 'pi pi-ban' : 'pi pi-check-circle'" class="text-lg"></i>
                  </button>

                  <!-- Remove user (solo usuarios secundarios, no a sí mismo) -->
                  <button
                    v-if="!eu.es_dueno && eu.usuario_id !== authStore.user?.id && puedeGestionarRoles"
                    @click="confirmarRemover(eu)"
                    class="text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="loadingAction === `${eu.usuario_id}:${eu.empresa_id}`"
                    title="Remover usuario"
                  >
                    <i class="pi pi-trash text-lg"></i>
                  </button>

                  <span v-if="eu.usuario_id === authStore.user?.id" class="text-xs text-gray-400">—</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit user modal -->
    <Teleport to="body">
      <div
        v-if="editModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="cerrarEditar"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Editar perfil de usuario</h3>

          <form @submit.prevent="guardarEditar" class="space-y-5">
            <!-- 👤 Información personal -->
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información personal</h4>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                  <input v-model="editModal.nombre" type="text" required
                    class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input v-model="editModal.apellido" type="text"
                    class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input v-model="editModal.phone" type="text"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                <select v-model="editModal.idioma"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <hr class="border-gray-200" />

            <!-- 🪪 Documentación -->
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documentación</h4>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
                  <select v-model="editModal.tipo_documento"
                    class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm">
                    <option value="DNI">DNI</option>
                    <option value="CI">Cédula</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="CUIT">CUIT</option>
                    <option value="RUT">RUT</option>
                    <option value="NIF">NIF</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Número documento</label>
                  <input v-model="editModal.documento" type="text"
                    class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                <input v-model="editModal.fecha_nacimiento" type="date"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
            </div>

            <hr class="border-gray-200" />

            <!-- 📍 Dirección -->
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dirección</h4>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input v-model="editModal.direccion" type="text" placeholder="Calle y número"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input v-model="editModal.ciudad" type="text"
                    class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                  <input v-model="editModal.provincia" type="text"
                    class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">País</label>
                <select v-model="editModal.pais"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm">
                  <option value="AR">Argentina</option>
                  <option value="UY">Uruguay</option>
                  <option value="CL">Chile</option>
                  <option value="PY">Paraguay</option>
                  <option value="BO">Bolivia</option>
                  <option value="PE">Perú</option>
                  <option value="EC">Ecuador</option>
                  <option value="CO">Colombia</option>
                  <option value="VE">Venezuela</option>
                  <option value="MX">México</option>
                  <option value="ES">España</option>
                  <option value="US">Estados Unidos</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <hr class="border-gray-200" />

            <!-- 💼 Laboral -->
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información laboral</h4>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Puesto / Cargo</label>
                <input v-model="editModal.puesto" type="text" placeholder="Ej: Panadero, Administrador"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 px-3 py-2 text-sm" />
              </div>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button type="button" @click="cerrarEditar"
                class="flex-1 touch-input text-gray-600 font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" :disabled="editLoading"
                class="flex-1 touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <i v-if="editLoading" class="pi pi-spin pi-spinner mr-2"></i>
                {{ editLoading ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog />
  </div>
</template>
