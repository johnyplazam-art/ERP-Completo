<script setup>
import { ref, computed } from 'vue'
import { useProductosQuery, useDeleteProductoMutation } from '../composables/queries'
import { useConfirm } from 'primevue/useconfirm'
import DataState from '@/core/components/DataState.vue'

const { data: productos, isLoading, error } = useProductosQuery()
const { mutate: eliminarProducto } = useDeleteProductoMutation()
const confirm = useConfirm()
const searchQuery = ref('')

const filteredProductos = computed(() => {
  if (!productos.value) return []
  if (!searchQuery.value) return productos.value
  const q = searchQuery.value.toLowerCase()
  return productos.value.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.categoria?.nombre?.toLowerCase().includes(q)
  )
})

const confirmarDesactivar = (producto) => {
  confirm.require({
    message: `¿Desactivar el producto "${producto.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: () => eliminarProducto(producto.id),
  })
}

const formatPeso = (gr) => {
  if (!gr) return '-'
  if (gr >= 1000) return `${(gr / 1000).toFixed(2)} kg`
  return `${gr} g`
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Productos</h2>
      <router-link
        to="/panaderia/productos/nuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo Producto
      </router-link>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar productos..."
        class="touch-input block w-full max-w-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!filteredProductos.length"
      empty-icon="pi pi-tag"
      :empty-text="searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay productos registrados'"
      loading-text="Cargando productos..."
    >
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Categoría</th>
              <th class="px-4 py-3">Precio</th>
              <th class="px-4 py-3">Receta</th>
              <th class="px-4 py-3">Peso</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="producto in filteredProductos" :key="producto.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ producto.nombre }}</td>
              <td class="px-4 py-3 text-gray-600">{{ producto.categoria?.nombre }}</td>
              <td class="px-4 py-3 text-gray-900 font-medium">
                ${{ Number(producto.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
              </td>
              <td class="px-4 py-3 text-gray-600">{{ producto.receta?.nombre || '-' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ formatPeso(producto.peso_unitario_gr) }}</td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="producto.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ producto.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <router-link
                    :to="`/panaderia/productos/${producto.id}`"
                    class="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    Editar
                  </router-link>
                  <button
                    v-if="producto.activo"
                    @click="confirmarDesactivar(producto)"
                    class="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Desactivar
                  </button>
                  <span v-else class="text-gray-400 text-sm">Desactivado</span>
                </div>
              </td>
            </tr>
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
