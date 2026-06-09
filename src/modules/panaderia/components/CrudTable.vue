<script setup>
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'
import PaginatorBar from './PaginatorBar.vue'

const props = defineProps({
  fields: { type: Array, required: true },
  headers: { type: Array, required: true },
  fieldRender: { type: Function, required: true },
  data: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  error: { type: [Error, null], default: null },
  tableName: { type: String, default: 'registro' },
  onCreate: { type: Function, default: null },
  onUpdate: { type: Function, default: null },
  onDelete: { type: Function, default: null },
  // Paginación opcional
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 25 },
  total: { type: Number, default: 0 },
})

const emit = defineEmits(['created', 'updated', 'deleted', 'update:page'])

const confirm = useConfirm()
const showModal = ref(false)
const editingItem = ref(null)
const formData = ref({})
const submitPending = ref(false)

// ─── Inicializar formulario ──────────────────────────

function initForm(item = null) {
  editingItem.value = item
  if (item) {
    formData.value = { ...item }
  } else {
    formData.value = Object.fromEntries(props.fields.map(f => [f.key, '']))
  }
}

function openCreate() {
  initForm(null)
  showModal.value = true
}

function openEdit(item) {
  initForm(item)
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
  formData.value = {}
}

// ─── Guardar ─────────────────────────────────────────

async function save() {
  // Validación básica
  for (const field of props.fields) {
    if (field.required && !formData.value[field.key]?.toString().trim()) {
      toast.error(`"${field.label}" es requerido`)
      return
    }
  }

  submitPending.value = true
  try {
    const values = Object.fromEntries(
      props.fields.map(f => [f.key, formData.value[f.key]?.trim() || ''])
    )

    if (editingItem.value) {
      if (props.onUpdate) {
        await props.onUpdate(editingItem.value.id, values)
        toast.success(`${props.tableName} actualizado`)
        emit('updated', { id: editingItem.value.id, values })
      }
    } else {
      if (props.onCreate) {
        await props.onCreate(values)
        toast.success(`${props.tableName} creado`)
        emit('created', values)
      }
    }
    closeModal()
  } catch (err) {
    toast.error(err.message || 'Error al guardar')
  } finally {
    submitPending.value = false
  }
}

// ─── Eliminar ────────────────────────────────────────

function remove(item) {
  const label = item.nombre || item.simbolo || `#${item.id}`
  confirm.require({
    message: `¿Eliminar "${label}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Eliminar',
    accept: async () => {
      try {
        if (props.onDelete) {
          await props.onDelete(item.id)
          toast.success(`"${label}" eliminado`)
          emit('deleted', item.id)
        }
      } catch (err) {
        toast.error(err.message || 'Error al eliminar')
      }
    },
  })
}

// ─── Exponer métodos para el padre ───────────────────

defineExpose({ openCreate })
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
      {{ error.message }}
    </div>

    <!-- Empty -->
    <div v-else-if="!data.length && !total" class="text-center py-12 text-gray-400">
      <i class="pi pi-inbox text-4xl mb-3"></i>
      <p>Sin registros en {{ tableName }}</p>
    </div>

    <!-- Empty with pagination (page beyond range) -->
    <div v-else-if="!data.length" class="bg-white rounded-xl border border-gray-200">
      <div class="text-center py-12 text-gray-400">
        <p>No hay datos en esta página</p>
      </div>
      <PaginatorBar
        :page="page"
        :page-size="pageSize"
        :total="total"
        @update:page="(p) => emit('update:page', p)"
      />
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3 w-10">#</th>
              <th v-for="header in headers" :key="header" class="px-4 py-3">
                {{ header }}
              </th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(item, i) in data" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-400 text-xs">{{ i + 1 }}</td>
              <td
                v-for="(val, j) in fieldRender(item)"
                :key="j"
                class="px-4 py-3"
                :class="j === 0 ? 'font-medium text-gray-900' : 'text-gray-600'"
              >
                {{ val }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  @click="openEdit(item)"
                  class="text-primary-600 hover:text-primary-800 text-sm font-medium mr-3"
                >
                  Editar
                </button>
                <button
                  @click="remove(item)"
                  class="text-red-500 hover:text-red-700 text-sm font-medium"
                  v-if="onDelete"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginatorBar
        :page="page"
        :page-size="pageSize"
        :total="total"
        @update:page="(p) => emit('update:page', p)"
      />
    </div>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ editingItem ? 'Editar' : 'Nuevo' }} {{ tableName }}
          </h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="save" class="space-y-4">
          <div v-for="field in fields" :key="field.key">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }} <span v-if="field.required" class="text-red-500">*</span>
            </label>
            <input
              v-model="formData[field.key]"
              :type="field.type"
              :required="field.required"
              :placeholder="field.placeholder"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
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
</template>
