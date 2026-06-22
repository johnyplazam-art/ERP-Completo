<script setup>
import { useProveedoresQuery, useDeleteProveedorMutation, useUpdateProveedorMutation } from '../composables/queries'
import { ref, computed } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import DataState from '@/core/components/DataState.vue'
import { useI18n } from 'vue-i18n'
import {
  createIngredienteProveedor,
  updateIngredienteProveedor,
  deleteIngredienteProveedor,
} from '../composables/database'
const { t } = useI18n()

const { data: proveedores, isLoading, error, refetch } = useProveedoresQuery()
const { mutate: eliminarProveedor } = useDeleteProveedorMutation()
const updateMutation = useUpdateProveedorMutation()
const expandedRow = ref('')
const confirm = useConfirm()
const searchQuery = ref('')
const mostrarInactivos = ref(false)

const showModal = ref(false)
const editingProvId = ref(null)
const editingItem = ref(null)
const formData = ref({})
const submitPending = ref(false)
const ingredientesDisponibles = ref([])

const filteredProveedores = computed(() => {
  if (!proveedores.value) return []
  let list = proveedores.value

  if (!mostrarInactivos.value) {
    list = list.filter(p => p.activo)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.contacto?.toLowerCase().includes(q)
    )
  }

  return list
})

function toggleInactivos() {
  mostrarInactivos.value = !mostrarInactivos.value
}

function toggleRow(id) {
  expandedRow.value = expandedRow.value === id ? '' : id
}

const confirmarDesactivar = (prov) => {
  confirm.require({
    message: `¿Desactivar el proveedor "${prov.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: () => eliminarProveedor(prov.id),
  })
}

function reactivar(prov) {
  confirm.require({
    message: `¿Reactivar el proveedor "${prov.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: async () => {
      try {
        await updateMutation.mutateAsync({ id: prov.id, values: { activo: true } })
        toast.success(`"${prov.nombre}" reactivado`)
      } catch (err) {
        toast.error(err.message || 'Error al reactivar proveedor')
      }
    },
  })
}

async function abrirAgregarIngrediente(proveedorId) {
  editingProvId.value = proveedorId
  editingItem.value = null
  formData.value = { ingrediente_id: '', precio_actual: '', plazo_entrega_dias: '', es_preferido: false }

  const existingIds = new Set(
    proveedores.value?.find(p => p.id === proveedorId)?.ingredientes?.map(i => i.ingrediente_id) ?? []
  )
  const { data: todos } = await supabase.from('ingredientes').select('id, nombre').eq('activo', true)
  ingredientesDisponibles.value = (todos ?? []).filter(i => !existingIds.has(i.id))

  showModal.value = true
}

function abrirEditarIngrediente(item) {
  editingProvId.value = item.proveedor_id
  editingItem.value = item
  formData.value = {
    precio_actual: item.precio_actual,
    plazo_entrega_dias: item.plazo_entrega_dias ?? '',
    es_preferido: item.es_preferido ?? false,
  }
  ingredientesDisponibles.value = []
  showModal.value = true
}

async function guardarIngrediente() {
  submitPending.value = true
  try {
    if (editingItem.value) {
      await updateIngredienteProveedor(editingItem.value.id, formData.value)
      toast.success('Precio actualizado')
    } else {
      await createIngredienteProveedor({
        ...formData.value,
        proveedor_id: editingProvId.value,
      })
      toast.success('Ingrediente agregado al proveedor')
    }
    showModal.value = false
    refetch()
  } catch (err) {
    toast.error(err.message || 'Error al guardar')
  } finally {
    submitPending.value = false
  }
}

function confirmarEliminarIngrediente(item, provNombre) {
  confirm.require({
    message: `¿Quitar "${item.ingrediente?.nombre}" de ${provNombre}?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Quitar',
    accept: async () => {
      try {
        await deleteIngredienteProveedor(item.id)
        toast.success('Ingrediente quitado del proveedor')
        refetch()
      } catch (err) {
        toast.error(err.message || 'Error al eliminar')
      }
    },
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">{{ t('proveedores.title') }}</h2>
      <router-link
        to="/panaderia/proveedores/nuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo Proveedor
      </router-link>
    </div>

    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar proveedores..."
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
      :empty="!filteredProveedores.length"
      empty-icon="pi pi-truck"
      :empty-text="mostrarInactivos ? 'Sin proveedores inactivos' : (searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay proveedores registrados')"
      loading-text="Cargando proveedores..."
    >
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">{{ t('proveedores.name') }}</th>
              <th class="px-4 py-3">{{ t('proveedores.contact') }}</th>
              <th class="px-4 py-3">{{ t('proveedores.phone') }}</th>
              <th class="px-4 py-3">{{ t('proveedores.email') }}</th>
              <th class="px-4 py-3">{{ t('proveedores.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="prov in filteredProveedores" :key="prov.id">
              <tr
                @click="toggleRow(prov.id)"
                class="hover:bg-gray-50 cursor-pointer"
                :class="{ 'bg-primary-50': expandedRow === prov.id }"
              >
                <td class="px-4 py-3 font-medium text-gray-900">
                  <i
                    class="pi text-xs mr-1 transition-transform duration-200"
                    :class="expandedRow === prov.id ? 'pi-chevron-down' : 'pi-chevron-right'"
                  ></i>
                  {{ prov.nombre }}
                </td>
                <td class="px-4 py-3 text-gray-600">{{ prov.contacto || '-' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ prov.telefono || '-' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ prov.email || '-' }}</td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="prov.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ prov.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3" @click.stop>
                  <div class="flex items-center gap-3">
                    <router-link
                      :to="`/panaderia/proveedores/${prov.id}`"
                      class="text-primary-600 hover:text-primary-800 text-sm font-medium"
>
                       {{ t('proveedores.edit') }}
                     </router-link>
                    <button
                      v-if="prov.activo"
                      @click="confirmarDesactivar(prov)"
                      class="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Desactivar
                    </button>
                    <button
                      v-else
                      @click="reactivar(prov)"
                      class="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Reactivar
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedRow === prov.id" :key="`${prov.id}-detail`">
                <td colspan="6" class="px-4 py-0 bg-gray-50">
                  <div class="py-3 animate-fadeIn">
                    <div class="flex items-center justify-between mb-2 px-2">
                      <span class="text-sm font-semibold text-gray-700">{{ t('proveedores.ingredientsAndPrices') }}</span>
                      <button
                        @click.stop="abrirAgregarIngrediente(prov.id)"
                        class="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        <i class="pi pi-plus mr-1"></i>Agregar
                      </button>
                    </div>
                    <div v-if="!prov.ingredientes?.length" class="text-sm text-gray-400 text-center py-2">
                      Sin ingredientes asociados
                    </div>
                    <div v-else class="max-w-lg space-y-1">
                      <div
                        v-for="item in prov.ingredientes"
                        :key="item.id"
                        class="flex items-center justify-between py-1.5 px-2 text-sm rounded hover:bg-white transition-colors"
                      >
                        <span class="text-gray-700 font-medium min-w-0 flex-1">
                          {{ item.ingrediente?.nombre }}
                        </span>
                        <div class="flex items-center gap-3 shrink-0">
                          <span class="text-gray-500 tabular-nums">
                            ${{ Number(item.precio_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
                          </span>
                          <span
                            v-if="item.es_preferido"
                            class="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium"
                          >{{ t('proveedores.preferred') }}</span>
                          <span v-if="item.plazo_entrega_dias" class="text-xs text-gray-400">
                            {{ item.plazo_entrega_dias }} {{ t('proveedores.days') }}
                          </span>
                          <div class="flex gap-2">
                            <button
                              @click.stop="abrirEditarIngrediente(item)"
                              class="text-primary-600 hover:text-primary-800 text-xs font-medium"
                            >{{ t('proveedores.edit') }}</button>
                            <button
                              @click.stop="confirmarEliminarIngrediente(item, prov.nombre)"
                              class="text-red-500 hover:text-red-700 text-xs font-medium"
                            >{{ t('proveedores.remove') }}</button>
                          </div>
                        </div>
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

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ editingItem ? 'Editar precio' : 'Agregar ingrediente' }}
          </h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="guardarIngrediente" class="space-y-4">
          <div v-if="!editingItem">
            <label class="block text-sm font-medium text-gray-700 mb-1">Ingrediente <span class="text-red-500">*</span></label>
            <select
              v-model="formData.ingrediente_id"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>Seleccionar ingrediente...</option>
              <option v-for="i in ingredientesDisponibles" :key="i.id" :value="i.id">{{ i.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Precio actual <span class="text-red-500">*</span></label>
            <input
              v-model.number="formData.precio_actual"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Plazo de entrega (días)</label>
            <input
              v-model.number="formData.plazo_entrega_dias"
              type="number"
              min="0"
              placeholder="0"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              v-model="formData.es_preferido"
              type="checkbox"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Proveedor preferido para este ingrediente
          </label>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="submitPending"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <i v-if="submitPending" class="pi pi-spin pi-spinner mr-2"></i>
              {{ submitPending ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <ConfirmDialog />
  </Teleport>
</template>
