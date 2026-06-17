<script setup>
import { useRecetasQuery, useDeleteRecetaMutation, useUpdateRecetaMutation } from '../composables/queries'
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'
import DataState from '@/core/components/DataState.vue'

const { data: recetas, isLoading, error } = useRecetasQuery()
const { mutate: eliminarReceta } = useDeleteRecetaMutation()
const updateMutation = useUpdateRecetaMutation()
const expandedRow = ref('')
const confirm = useConfirm()
const searchQuery = ref('')
const mostrarInactivos = ref(false)

const filteredRecetas = computed(() => {
  if (!recetas.value) return []
  let list = recetas.value

  if (!mostrarInactivos.value) {
    list = list.filter(r => r.activa)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.categoria?.nombre?.toLowerCase().includes(q)
    )
  }

  return list
})

function toggleInactivos() {
  mostrarInactivos.value = !mostrarInactivos.value
}

const toggleRow = (id) => {
  expandedRow.value = expandedRow.value === id ? '' : id
}

const confirmarDesactivar = (receta) => {
  confirm.require({
    message: `¿Desactivar la receta "${receta.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: () => eliminarReceta(receta.id),
  })
}

function reactivar(receta) {
  confirm.require({
    message: `¿Reactivar la receta "${receta.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: async () => {
      try {
        await updateMutation.mutateAsync({ id: receta.id, values: { activa: true } })
        toast.success(`"${receta.nombre}" reactivada`)
      } catch (err) {
        toast.error(err.message || 'Error al reactivar receta')
      }
    },
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Recetas</h2>
      <router-link
        to="/panaderia/recetas/nueva"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nueva Receta
      </router-link>
    </div>

    <!-- Search -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar recetas..."
        class="touch-input block w-full sm:max-w-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
      />
      <div class="flex items-center">
        <button
          @click="toggleInactivos"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
          :class="mostrarInactivos
            ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
            : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
        >
          <i class="pi pi-eye-slash text-xs"></i>
          Inactivos
        </button>
      </div>
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!filteredRecetas.length"
      empty-icon="pi pi-book"
      :empty-text="mostrarInactivos ? 'Sin recetas inactivas' : (searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay recetas registradas')"
      loading-text="Cargando recetas..."
    >
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Categoría</th>
              <th class="px-4 py-3">Rendimiento</th>
              <th class="px-4 py-3">Costo est.</th>
              <th class="px-4 py-3">Tiempo</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="receta in filteredRecetas" :key="receta.id">
              <tr
                @click="toggleRow(receta.id)"
                class="hover:bg-gray-50 cursor-pointer"
                :class="{ 'bg-primary-50': expandedRow === receta.id }"
              >
                <td class="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                  <i
                    class="pi text-xs transition-transform duration-200"
                    :class="expandedRow === receta.id ? 'pi-chevron-down' : 'pi-chevron-right'"
                  ></i>
                  {{ receta.nombre }}
                  <span
                    v-if="receta.ingredientes?.length"
                    class="text-xs text-gray-400 font-normal"
                  >
                    ({{ receta.ingredientes.length }} ingredientes)
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ receta.categoria?.nombre }}</td>
                <td class="px-4 py-3 text-gray-600">
                  {{ receta.rendimiento_cantidad }} {{ receta.unidad?.simbolo }}
                </td>
                <td class="px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                  <template v-if="receta.costo_estimado != null">
                    ${{ receta.costo_estimado.toFixed(2) }}
                  </template>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 text-gray-600">
                  {{ receta.tiempo_preparacion_min ? `${receta.tiempo_preparacion_min} min` : '-' }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="receta.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ receta.activa ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="px-4 py-3" @click.stop>
                  <div class="flex items-center gap-3">
                    <router-link
                      :to="`/panaderia/recetas/${receta.id}`"
                      class="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Editar
                    </router-link>
                    <button
                      v-if="receta.activa"
                      @click="confirmarDesactivar(receta)"
                      class="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Desactivar
                    </button>
                    <button
                      v-else
                      @click="reactivar(receta)"
                      class="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Reactivar
                    </button>
                  </div>
                </td>
              </tr>
              <!-- Expanded detail row -->
              <tr v-if="expandedRow === receta.id" :key="`${receta.id}-detail`">
                <td colspan="7" class="px-4 py-0 bg-gray-50">
                  <div class="py-3 animate-fadeIn">
                    <div v-if="!receta.ingredientes?.length" class="text-sm text-gray-400 text-center py-2">
                      Sin ingredientes
                    </div>
                    <div v-else class="max-w-lg">
                      <div
                        v-for="ing in receta.ingredientes"
                        :key="ing.id"
                        class="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span class="text-gray-700 font-medium">
                          {{ ing.ingrediente?.nombre }}
                        </span>
                        <span class="text-gray-500">
                          {{ ing.cantidad }} {{ ing.unidad?.simbolo }}
                          <span
                            v-if="ing.es_opcional"
                            class="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded"
                          >Opcional</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    </DataState>
  </div>

  <Teleport to="body">
    <ConfirmDialog />
  </Teleport>
</template>
