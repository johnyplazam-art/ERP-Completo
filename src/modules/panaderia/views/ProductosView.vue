<script setup>
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useProductosQuery, useDeleteProductoMutation, useUpdateProductoMutation, useGenerarProductosFaltantesMutation } from '../composables/queries'
import { useConfirm } from 'primevue/useconfirm'
import DataState from '@/core/components/DataState.vue'

const { data: productos, isLoading, error } = useProductosQuery()
const { mutate: eliminarProducto } = useDeleteProductoMutation()
const updateMutation = useUpdateProductoMutation()
const confirm = useConfirm()
const searchQuery = ref('')
const mostrarInactivos = ref(false)

const filteredProductos = computed(() => {
  if (!productos.value) return []
  let list = productos.value

  if (!mostrarInactivos.value) {
    list = list.filter(p => p.activo)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.categoria?.nombre?.toLowerCase().includes(q)
    )
  }

  return list
})

function toggleInactivos() {
  mostrarInactivos.value = !mostrarInactivos.value
}

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

function reactivar(producto) {
  confirm.require({
    message: `¿Reactivar el producto "${producto.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: async () => {
      try {
        await updateMutation.mutateAsync({ id: producto.id, values: { activo: true } })
        toast.success(`"${producto.nombre}" reactivado`)
      } catch (err) {
        toast.error(err.message || 'Error al reactivar producto')
      }
    },
  })
}

const generarMutation = useGenerarProductosFaltantesMutation()

async function generarFaltantes() {
  confirm.require({
    message: '¿Generar productos inactivos para todas las recetas que aún no tienen producto asociado?',
    header: 'Generar productos faltantes',
    icon: 'pi pi-refresh',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Generar',
    accept: async () => {
      try {
        const result = await generarMutation.mutateAsync()
        toast.success(`Se crearon ${result.creados} producto(s) de ${result.total} receta(s) pendiente(s)`)
      } catch (err) {
        toast.error(err.message || 'Error al generar productos')
      }
    },
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
      <div class="flex items-center gap-2">
        <button
          @click="generarFaltantes"
          :disabled="generarMutation.isPending.value"
          class="inline-flex items-center px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
        >
          <i
            :class="generarMutation.isPending.value ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
            class="mr-2 text-sm"
          ></i>
          Generar desde recetas
        </button>
        <router-link
          to="/panaderia/productos/nuevo"
          class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <i class="pi pi-plus mr-2"></i>
          Nuevo Producto
        </router-link>
      </div>
    </div>

    <!-- Search -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar productos..."
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
      :empty="!filteredProductos.length"
      empty-icon="pi pi-tag"
      :empty-text="mostrarInactivos ? 'Sin productos inactivos' : (searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay productos registrados')"
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
                  <button
                    v-else
                    @click="reactivar(producto)"
                    class="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    Reactivar
                  </button>
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
