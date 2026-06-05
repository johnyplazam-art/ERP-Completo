<script setup>
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import {
  useCategoriasIngredienteQuery,
  useCreateCategoriaIngredienteMutation,
  useUpdateCategoriaIngredienteMutation,
  useDeleteCategoriaIngredienteMutation,
  useCategoriasRecetaQuery,
  useCreateCategoriaRecetaMutation,
  useUpdateCategoriaRecetaMutation,
  useDeleteCategoriaRecetaMutation,
  useCategoriasProductoQuery,
  useCreateCategoriaProductoMutation,
  useUpdateCategoriaProductoMutation,
  useDeleteCategoriaProductoMutation,
  useUnidadesMedidaQuery,
  useCreateUnidadMedidaMutation,
  useUpdateUnidadMedidaMutation,
  useDeleteUnidadMedidaMutation,
} from '../composables/queries'

// ─── Tabs ─────────────────────────────────────────────

const tabs = [
  { key: 'categorias-ingrediente', label: 'Cat. Ingredientes', icon: 'pi pi-tag' },
  { key: 'categorias-receta', label: 'Cat. Recetas', icon: 'pi pi-book' },
  { key: 'categorias-producto', label: 'Cat. Productos', icon: 'pi pi-box' },
  { key: 'unidades-medida', label: 'Unidades', icon: 'pi pi-sliders-v' },
]

const activeTab = ref('categorias-ingrediente')

// ─── Queries ──────────────────────────────────────────

const queries = {
  'categorias-ingrediente': useCategoriasIngredienteQuery(),
  'categorias-receta': useCategoriasRecetaQuery(),
  'categorias-producto': useCategoriasProductoQuery(),
  'unidades-medida': useUnidadesMedidaQuery(),
}

const activeQuery = computed(() => queries[activeTab.value])

// ─── Mutations ────────────────────────────────────────

const mutations = {
  'categorias-ingrediente': {
    create: useCreateCategoriaIngredienteMutation(),
    update: useUpdateCategoriaIngredienteMutation(),
    delete: useDeleteCategoriaIngredienteMutation(),
  },
  'categorias-receta': {
    create: useCreateCategoriaRecetaMutation(),
    update: useUpdateCategoriaRecetaMutation(),
    delete: useDeleteCategoriaRecetaMutation(),
  },
  'categorias-producto': {
    create: useCreateCategoriaProductoMutation(),
    update: useUpdateCategoriaProductoMutation(),
    delete: useDeleteCategoriaProductoMutation(),
  },
  'unidades-medida': {
    create: useCreateUnidadMedidaMutation(),
    update: useUpdateUnidadMedidaMutation(),
    delete: useDeleteUnidadMedidaMutation(),
  },
}

const activeMutations = computed(() => mutations[activeTab.value])

// ─── Fields config ────────────────────────────────────

const tabFieldConfig = {
  'categorias-ingrediente': {
    tableHeaders: ['Nombre', 'Descripción'],
    tableFields: (item) => [item.nombre, item.descripcion || '-'],
    formFields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Harinas y derivados' },
      { key: 'descripcion', label: 'Descripción', type: 'text', required: false, placeholder: 'Descripción opcional' },
    ],
    tableName: 'categorias_ingrediente',
  },
  'categorias-receta': {
    tableHeaders: ['Nombre', 'Descripción'],
    tableFields: (item) => [item.nombre, item.descripcion || '-'],
    formFields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Panes artesanales' },
      { key: 'descripcion', label: 'Descripción', type: 'text', required: false, placeholder: 'Descripción opcional' },
    ],
    tableName: 'categorias_receta',
  },
  'categorias-producto': {
    tableHeaders: ['Nombre', 'Descripción'],
    tableFields: (item) => [item.nombre, item.descripcion || '-'],
    formFields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Panes' },
      { key: 'descripcion', label: 'Descripción', type: 'text', required: false, placeholder: 'Descripción opcional' },
    ],
    tableName: 'categorias_producto',
  },
  'unidades-medida': {
    tableHeaders: ['Nombre', 'Símbolo'],
    tableFields: (item) => [item.nombre, item.simbolo],
    formFields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Kilogramo' },
      { key: 'simbolo', label: 'Símbolo', type: 'text', required: true, placeholder: 'Ej: kg' },
    ],
    tableName: 'unidades_medida',
  },
}

const activeConfig = computed(() => tabFieldConfig[activeTab.value])

// ─── Modal state ──────────────────────────────────────

const showModal = ref(false)
const editingItem = ref(null) // null = create new, object = edit existing
const formData = ref({})

function openCreate() {
  editingItem.value = null
  const fields = activeConfig.value.formFields
  formData.value = Object.fromEntries(fields.map(f => [f.key, '']))
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  formData.value = { ...item }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
  formData.value = {}
}

async function save() {
  const config = activeConfig.value
  const muts = activeMutations.value

  // Validación básica
  for (const field of config.formFields) {
    if (field.required && !formData.value[field.key]?.toString().trim()) {
      toast.error(`"${field.label}" es requerido`)
      return
    }
  }

  try {
    const values = Object.fromEntries(
      config.formFields.map(f => [f.key, formData.value[f.key]?.trim() || ''])
    )

    if (editingItem.value) {
      await muts.update.mutateAsync({ id: editingItem.value.id, values })
      toast.success(`${config.tableName} actualizado`)
    } else {
      await muts.create.mutateAsync(values)
      toast.success(`${config.tableName} creado`)
    }
    closeModal()
  } catch (err) {
    toast.error(err.message || 'Error al guardar')
  }
}

async function remove(item) {
  const config = activeConfig.value
  const muts = activeMutations.value
  const label = item.nombre || item.simbolo

  // Confirmación simple
  if (!confirm(`¿Eliminar "${label}"?`)) return

  try {
    await muts.delete.mutateAsync(item.id)
    toast.success(`"${label}" eliminado`)
  } catch (err) {
    toast.error(err.message || 'Error al eliminar')
  }
}

// ─── Loading / Error helpers ──────────────────────────

const isLoading = computed(() => activeQuery.value.isLoading.value)
const queryError = computed(() => activeQuery.value.error.value)
const data = computed(() => activeQuery.value.data.value || [])
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Catálogos</h2>
      <button
        @click="openCreate"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-gray-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab.key
          ? 'border-primary-600 text-primary-700'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
      >
        <i :class="tab.icon"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando...</p>
    </div>

    <!-- Error -->
    <div v-else-if="queryError" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
      {{ queryError.message }}
    </div>

    <!-- Empty -->
    <div v-else-if="!data.length" class="text-center py-12 text-gray-400">
      <i class="pi pi-inbox text-4xl mb-3"></i>
      <p>Sin registros en {{ activeConfig.tableName }}</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3 w-10">#</th>
              <th v-for="header in activeConfig.tableHeaders" :key="header" class="px-4 py-3">
                {{ header }}
              </th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(item, i) in data" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-400 text-xs">{{ i + 1 }}</td>
              <td
                v-for="(val, j) in activeConfig.tableFields(item)"
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
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
            {{ editingItem ? 'Editar' : 'Nuevo' }} {{ activeConfig.tableName }}
          </h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="save" class="space-y-4">
          <div v-for="field in activeConfig.formFields" :key="field.key">
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
              :disabled="
                (editingItem ? activeMutations.update.isPending : activeMutations.create.isPending).value
              "
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <i
                v-if="(editingItem ? activeMutations.update.isPending : activeMutations.create.isPending).value"
                class="pi pi-spin pi-spinner mr-2"
              ></i>
              {{ (editingItem ? activeMutations.update.isPending : activeMutations.create.isPending).value ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
