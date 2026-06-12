<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'
import {
  useMermasQuery,
  useCreateMermaMutation,
  useUpdateMermaMutation,
  useDeleteMermaMutation,
} from '../composables/queries'
import DataState from '@/core/components/DataState.vue'

const confirm = useConfirm()
const authStore = useAuthStore()
const puedeCrear = computed(() => authStore.tienePermiso('mermas.create'))
const puedeEliminar = computed(() => authStore.tienePermiso('mermas.delete'))

const { data: mermas, isLoading, error } = useMermasQuery()
const createMutation = useCreateMermaMutation()
const updateMutation = useUpdateMermaMutation()
const deleteMutation = useDeleteMermaMutation()

const showModal = ref(false)
const editingItem = ref(null)
const formData = ref({})
const submitPending = ref(false)
const ingredientes = ref([])
const productos = ref([])
const unidades = ref([])

const origenOptions = [
  { value: 'produccion', label: 'Producción' },
  { value: 'inventario_mp', label: 'Inventario MP' },
  { value: 'inventario_pt', label: 'Inventario PT' },
  { value: 'devolucion', label: 'Devolución' },
]

const tipoOptions = [
  { value: 'caducidad', label: 'Caducidad' },
  { value: 'rotura', label: 'Rotura' },
  { value: 'error_produccion', label: 'Error de producción' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'otro', label: 'Otro' },
]

async function cargarReferencias() {
  const [ingRes, prodRes, uniRes] = await Promise.all([
    supabase.from('ingredientes').select('id, nombre').eq('activo', true),
    supabase.from('productos').select('id, nombre').eq('activo', true),
    supabase.from('unidades_medida').select('id, nombre, simbolo').order('nombre'),
  ])
  ingredientes.value = ingRes.data ?? []
  productos.value = prodRes.data ?? []
  unidades.value = uniRes.data ?? []
}

function initForm(item = null) {
  editingItem.value = item
  formData.value = item
    ? {
        origen: item.origen,
        ingrediente_id: item.ingrediente_id ?? '',
        producto_id: item.producto_id ?? '',
        cantidad: item.cantidad,
        unidad_id: item.unidad_id ?? '',
        tipo: item.tipo,
        causa: item.causa ?? '',
      }
    : {
        origen: 'produccion',
        ingrediente_id: '',
        producto_id: '',
        cantidad: '',
        unidad_id: '',
        tipo: 'rotura',
        causa: '',
      }
  showModal.value = true
}

async function guardar() {
  submitPending.value = true
  try {
    if (editingItem.value) {
      await updateMutation.mutateAsync({ id: editingItem.value.id, values: formData.value })
      toast.success('Merma actualizada')
    } else {
      await createMutation.mutateAsync(formData.value)
      toast.success('Merma registrada')
    }
    showModal.value = false
  } catch (err) {
    toast.error(err.message || 'Error al guardar')
  } finally {
    submitPending.value = false
  }
}

function confirmarEliminar(item) {
  confirm.require({
    message: `¿Eliminar merma #${item.id}?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Eliminar',
    accept: async () => {
      try {
        await deleteMutation.mutateAsync(item.id)
        toast.success('Merma eliminada')
      } catch (err) {
        toast.error(err.message || 'Error al eliminar')
      }
    },
  })
}

const origenLabel = {
  produccion: 'Producción',
  inventario_mp: 'Inventario MP',
  inventario_pt: 'Inventario PT',
  devolucion: 'Devolución',
}

const tipoLabel = {
  caducidad: 'Caducidad',
  rotura: 'Rotura',
  error_produccion: 'Error producción',
  devolucion: 'Devolución',
  otro: 'Otro',
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Mermas</h2>
      <button
        v-if="puedeCrear"
        @click="cargarReferencias(); initForm(null)"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Registrar Merma
      </button>
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!mermas?.length"
      empty-icon="pi pi-exclamation-triangle"
      empty-text="No hay mermas registradas"
      loading-text="Cargando mermas..."
    >
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-gray-500 font-medium">
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Origen</th>
                <th class="px-4 py-3">Item</th>
                <th class="px-4 py-3">Cantidad</th>
                <th class="px-4 py-3">Tipo</th>
                <th class="px-4 py-3">Causa</th>
                <th class="px-4 py-3">Registrado por</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="m in mermas" :key="m.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-600 text-xs">
                  {{ new Date(m.fecha_registro).toLocaleDateString('es-AR') }}
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    {{ origenLabel[m.origen] || m.origen }}
                  </span>
                </td>
                <td class="px-4 py-3 font-medium text-gray-900">
                  {{ m.ingrediente?.nombre || m.producto?.nombre || '-' }}
                </td>
                <td class="px-4 py-3 text-gray-700">
                  {{ m.cantidad }} {{ m.unidad?.simbolo || '' }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="{
                      'bg-red-100 text-red-700': m.tipo === 'rotura' || m.tipo === 'caducidad',
                      'bg-yellow-100 text-yellow-700': m.tipo === 'error_produccion',
                      'bg-gray-100 text-gray-600': m.tipo === 'otro' || m.tipo === 'devolucion',
                    }"
                  >
                    {{ tipoLabel[m.tipo] || m.tipo }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 max-w-[200px] truncate">{{ m.causa || '-' }}</td>
                <td class="px-4 py-3 text-gray-500">{{ m.registrado_por?.nombre || '-' }}</td>
                <td class="px-4 py-3 text-right">
                  <button
                    @click="cargarReferencias(); initForm(m)"
                    class="text-primary-600 hover:text-primary-800 text-sm font-medium mr-3"
                  >
                    Editar
                  </button>
                  <button
                    v-if="puedeEliminar"
                    @click="confirmarEliminar(m)"
                    class="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
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
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ editingItem ? 'Editar' : 'Registrar' }} Merma
          </h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="guardar" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Origen <span class="text-red-500">*</span></label>
            <select
              v-model="formData.origen"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="o in origenOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ingrediente</label>
            <select
              v-model="formData.ingrediente_id"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccionar ingrediente...</option>
              <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <select
              v-model="formData.producto_id"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccionar producto...</option>
              <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad <span class="text-red-500">*</span></label>
              <input
                v-model.number="formData.cantidad"
                type="number"
                step="any"
                required
                placeholder="0"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select
                v-model="formData.unidad_id"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Seleccionar...</option>
                <option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nombre }} ({{ u.simbolo }})</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo <span class="text-red-500">*</span></label>
            <select
              v-model="formData.tipo"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="t in tipoOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Causa</label>
            <textarea
              v-model="formData.causa"
              rows="2"
              placeholder="Describí la causa de la merma..."
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>

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
