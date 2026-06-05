import { ref } from 'https://cdn.jsdelivr.net/npm/vue@3.4.27/dist/vue.esm-browser.prod.js'
import { useProductStore } from '../stores/productStore.js'
import ProductFormModal from './ProductFormModal.js'

export default {
  name: 'ProductTable',
  components: { ProductFormModal },
  template: `
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <!-- Toolbar -->
      <div class="px-6 py-4 bg-gray-50 border-b">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold text-gray-800">Gesti\u00f3n de Productos</h2>
          <div class="flex space-x-3">
            <button 
              @click="showCreateModal = true" 
              class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Nuevo Producto
            </button>
            <button 
              @click="exportToCsv" 
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Cargando productos...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-4 bg-red-50 border-l-4 border-red-500 text-red-700">
        {{ error }}
        <button @click="clearError" class="ml-2 text-indigo-600 hover:text-indigo-800 underline">Descartar</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="products.length === 0 && !loading && !error" class="py-8 text-center">
        <p class="text-gray-500">No hay productos registrados</p>
        <button 
          @click="showCreateModal = true" 
          class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Agregar primero
        </button>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">C\u00f3digo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categor\u00eda</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Venta</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.id }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.codigo }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.nombre }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.categoria }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">\${{ Number(product.precioVenta).toFixed(2) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ product.stockActual }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span v-if="product.activo" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Activo</span>
                <span v-else class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Inactivo</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                <button @click="editProduct(product.id)" class="px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-900">Editar</button>
                <button @click="deleteProduct(product.id)" class="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-900">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && !error && pagination.totalItems > 0" class="px-6 py-4 bg-gray-50 border-t">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">
            Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
            {{ Math.min(pagination.page * pagination.limit, pagination.totalItems) }} de 
            {{ pagination.totalItems }} productos
          </span>
          <div class="flex space-x-2">
            <button :disabled="!pagination.hasPrev" @click="previousPage"
              class="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >Anterior</button>
            <button :disabled="!pagination.hasNext" @click="nextPage"
              class="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >Siguiente</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <ProductFormModal 
      v-model:show="showCreateModal" 
      :product-id="editProductId"
      @saved="handleProductSaved"
    />
  `,
  setup() {
    const productStore = useProductStore()
    const loading = ref(false)
    const error = ref(null)
    const showCreateModal = ref(false)
    const editProductId = ref(null)

    const loadProducts = async () => {
      try {
        await productStore.fetchProducts()
      } catch (err) {
        error.value = err.message
      }
    }

    const handleProductSaved = () => {
      showCreateModal.value = false
      editProductId.value = null
      loadProducts()
    }

    const deleteProduct = async (id) => {
      if (!confirm('\u00bfEst\u00e1 seguro de eliminar este producto? Esta acci\u00f3n no se puede deshacer.')) {
        return
      }
      try {
        await productStore.deleteProduct(id)
      } catch (err) {
        error.value = err.message
      }
    }

    const editProduct = (id) => {
      editProductId.value = id
      showCreateModal.value = true
    }

    const exportToCsv = () => {
      const headers = ['ID', 'C\u00f3digo', 'Nombre', 'Descripci\u00f3n', 'Categor\u00eda', 'Unidad Medida', 'Precio Costo', 'Precio Venta', 'Stock Actual', 'Stock M\u00ednimo', 'Stock M\u00e1ximo', 'Activo']
      const rows = productStore.products.map(p => [
        p.id, p.codigo, p.nombre, (p.descripcion || ''), p.categoria,
        p.unidadMedida, p.precioCosto, p.precioVenta, p.stockActual,
        p.stockMinimo, p.stockMaximo, p.activo ? 'S\u00ed' : 'No'
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'productos_sias.csv'
      a.click()
      URL.revokeObjectURL(url)
    }

    const previousPage = () => {
      if (productStore.pagination.hasPrev) {
        productStore.fetchProducts({ 
          page: productStore.pagination.page - 1,
          limit: productStore.pagination.limit
        })
      }
    }

    const nextPage = () => {
      if (productStore.pagination.hasNext) {
        productStore.fetchProducts({ 
          page: productStore.pagination.page + 1,
          limit: productStore.pagination.limit
        })
      }
    }

    const clearError = () => {
      error.value = null
    }

    loadProducts()

    return {
      loading, error, products: productStore.products,
      pagination: productStore.pagination,
      showCreateModal, editProductId,
      handleProductSaved, deleteProduct, editProduct,
      exportToCsv, previousPage, nextPage, clearError
    }
  }
}
