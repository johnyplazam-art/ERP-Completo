<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const usuarios = ref([])
const isLoading = ref(false)

const rolesDisponibles = [
  { value: 'admin', label: 'Admin', desc: 'Acceso completo' },
  { value: 'produccion', label: 'Producción', desc: 'Gestiona órdenes, crea recetas' },
  { value: 'usuario', label: 'Usuario', desc: 'Solo lectura' },
]

async function cargarUsuarios() {
  if (!authStore.currentEmpresaId) return
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('empresa_usuarios')
      .select('*, usuario:perfiles!inner(*)')
      .eq('empresa_id', authStore.currentEmpresaId)
      .order('rol')
    if (error) throw error
    usuarios.value = data ?? []
  } catch (err) {
    console.error('[users] Error cargando:', err)
    toast.error('Error al cargar usuarios')
  } finally {
    isLoading.value = false
  }
}

// Recargar cuando cambie la empresa
watch(() => authStore.currentEmpresaId, () => {
  if (authStore.currentEmpresaId) cargarUsuarios()
}, { immediate: true })

async function cambiarRol(usuarioId, nuevoRol) {
  if (!authStore.currentEmpresaId) return
  try {
    const { error } = await supabase
      .from('empresa_usuarios')
      .update({ rol: nuevoRol })
      .eq('empresa_id', authStore.currentEmpresaId)
      .eq('usuario_id', usuarioId)
    if (error) throw error
    toast.success('Rol actualizado')
    await cargarUsuarios()
  } catch (err) {
    console.error('[users] Error cambiando rol:', err)
    toast.error('Error al cambiar rol')
  }
}

async function toggleActivo(usuarioId, activo) {
  if (!authStore.currentEmpresaId) return
  try {
    const { error } = await supabase
      .from('empresa_usuarios')
      .update({ activo })
      .eq('empresa_id', authStore.currentEmpresaId)
      .eq('usuario_id', usuarioId)
    if (error) throw error
    toast.success(activo ? 'Usuario activado' : 'Usuario desactivado')
    await cargarUsuarios()
  } catch (err) {
    console.error('[users] Error cambiando estado:', err)
    toast.error('Error al cambiar estado')
  }
}

async function copiarInvitacion() {
  if (!authStore.currentEmpresa) return
  const link = `${window.location.origin}/signup?invitacion=${authStore.currentEmpresa.slug}`
  try {
    await navigator.clipboard.writeText(link)
    toast.success('Enlace de invitación copiado')
  } catch {
    toast.error('No se pudo copiar el enlace')
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Usuarios</h2>
      <button
        @click="copiarInvitacion"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-link mr-2"></i>
        Invitar usuario
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando usuarios...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!usuarios.length" class="text-center py-12 text-gray-400">
      <i class="pi pi-users text-4xl mb-3"></i>
      <p>No hay usuarios en esta empresa</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">Usuario</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Rol</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
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
              <td class="px-4 py-3 text-gray-500">{{ eu.usuario?.email || '—' }}</td>
              <td class="px-4 py-3">
                <select
                  :value="eu.rol"
                  :disabled="eu.usuario_id === authStore.user?.id"
                  class="text-sm rounded border border-gray-300 px-2 py-1 text-gray-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  @change="cambiarRol(eu.usuario_id, $event.target.value)"
                >
                  <option
                    v-for="r in rolesDisponibles"
                    :key="r.value"
                    :value="r.value"
                  >
                    {{ r.label }}
                  </option>
                </select>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="eu.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ eu.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button
                  v-if="eu.usuario_id !== authStore.user?.id"
                  @click="toggleActivo(eu.usuario_id, !eu.activo)"
                  class="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <i :class="eu.activo ? 'pi pi-ban' : 'pi pi-check-circle'" class="mr-1"></i>
                  {{ eu.activo ? 'Desactivar' : 'Activar' }}
                </button>
                <span v-else class="text-xs text-gray-400">(vos)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
