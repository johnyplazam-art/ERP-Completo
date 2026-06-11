<script setup>
import { ref, computed } from 'vue'
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
import CrudTable from '../components/CrudTable.vue'

// ─── Tabs ─────────────────────────────────────────────

const tabs = [
  { key: 'categorias-ingrediente', label: 'Cat. Ingredientes', icon: 'pi pi-tag' },
  { key: 'categorias-receta', label: 'Cat. Recetas', icon: 'pi pi-book' },
  { key: 'categorias-producto', label: 'Cat. Productos', icon: 'pi pi-box' },
  { key: 'unidades-medida', label: 'Unidades', icon: 'pi pi-sliders-v' },
]

const activeTab = ref('categorias-ingrediente')
const tableRef = ref(null)

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

// ─── Config por tab ───────────────────────────────────

const tabConfigs = {
  'categorias-ingrediente': {
    headers: ['Nombre', 'Descripción'],
    fieldRender: (item) => [item.nombre, item.descripcion || '-'],
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Harinas y derivados' },
      { key: 'descripcion', label: 'Descripción', type: 'text', required: false, placeholder: 'Descripción opcional' },
    ],
    tableName: 'categorias_ingrediente',
  },
  'categorias-receta': {
    headers: ['Nombre', 'Descripción'],
    fieldRender: (item) => [item.nombre, item.descripcion || '-'],
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Panes artesanales' },
      { key: 'descripcion', label: 'Descripción', type: 'text', required: false, placeholder: 'Descripción opcional' },
    ],
    tableName: 'categorias_receta',
  },
  'categorias-producto': {
    headers: ['Nombre', 'Descripción'],
    fieldRender: (item) => [item.nombre, item.descripcion || '-'],
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Panes' },
      { key: 'descripcion', label: 'Descripción', type: 'text', required: false, placeholder: 'Descripción opcional' },
    ],
    tableName: 'categorias_producto',
  },
  'unidades-medida': {
    headers: ['Nombre', 'Símbolo'],
    fieldRender: (item) => [item.nombre, item.simbolo],
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Kilogramo' },
      { key: 'simbolo', label: 'Símbolo', type: 'text', required: true, placeholder: 'Ej: kg' },
    ],
    tableName: 'unidades_medida',
  },
}

const activeConfig = computed(() => tabConfigs[activeTab.value])

// ─── Handlers ─────────────────────────────────────────

function handleCreate(values) {
  return activeMutations.value.create.mutateAsync(values)
}

function handleUpdate(id, values) {
  return activeMutations.value.update.mutateAsync({ id, values })
}

function handleDelete(id) {
  return activeMutations.value.delete.mutateAsync(id)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Catálogos</h2>
      <button
        @click="tableRef?.openCreate()"
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

    <!-- CrudTable -->
    <CrudTable
      ref="tableRef"
      :key="activeTab"
      :fields="activeConfig.fields"
      :headers="activeConfig.headers"
      :field-render="activeConfig.fieldRender"
      :data="activeQuery.data?.value || []"
      :is-loading="activeQuery.isLoading?.value"
      :error="activeQuery.error?.value"
      :table-name="activeConfig.tableName"
      :on-create="handleCreate"
      :on-update="handleUpdate"
      :on-delete="handleDelete"
    />

    <Teleport to="body">
      <ConfirmDialog />
    </Teleport>
  </div>
</template>
