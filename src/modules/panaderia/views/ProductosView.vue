<script setup>
import { useProductosQuery } from '../composables/queries'

const { data: productos, isLoading, error } = useProductosQuery()

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

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando productos...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
      {{ error.message }}
    </div>

    <!-- Empty -->
    <div v-else-if="!productos?.length" class="text-center py-12 text-gray-400">
      <i class="pi pi-tag text-4xl mb-3"></i>
      <p>No hay productos registrados</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <tr v-for="producto in productos" :key="producto.id" class="hover:bg-gray-50">
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
                <router-link
                  :to="`/panaderia/productos/${producto.id}`"
                  class="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  Editar
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
