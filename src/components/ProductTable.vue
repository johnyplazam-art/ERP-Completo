<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-gray-800">Lista de Productos</h2>
      <button 
        @click="showProductForm = true"
        class="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded transition"
      >
        Nuevo Producto
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 h-8 w-8"></div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4">
      <p>{{ error }}</p>
      <button @click="clearError" class="ml-2 text-blue-500 hover:underline">Dismiss</button>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && products.length === 0" class="text-center py-8">
      <p class="text-gray-500">No hay productos disponibles</p>
    </div>

    <!-- Product Table -->
    <PrimeVueDataTable 
      v-else
      :value="products"
      :paginator="true"
      :rows="pagination.limit"
      :totalRecords="pagination.totalItems"
      :first="((pagination.page - 1) * pagination.limit)"
      @page="onPageChange"
      class="min-w-full"
    >
      <!-- ID Column -->
      <Field column="id" header="ID" :body="row => row.id" />
      
      <!-- Code Column -->
      <Field column="codigo" header="Código" :body="row => row.codigo" />
      
      <!-- Name Column -->
      <Field column="nombre" header="Nombre" :body="row => row.nombre" />
      
      <!-- Description Column -->
      <Field column="descripcion" header="Descripción" :body="row => row.descripcion || '-'" />
      
      <!-- Category Column -->
      <Field column="categoria" header="Categoría" :body="row => row.categoria" />
      
      <!-- Unit Column -->
      <Field column="unidadMedida" header="Unidad" :body="row => row.unidadMedida" />
      
      <!-- Cost Price Column -->
      <Field 
        column="precioCosto" 
        header="Precio Costo" 
        :body="row => `$${parseFloat(row.precioCosto).toFixed(2)}`" 
        class="text-right"
      />
      
      <!-- Sale Price Column -->
      <Field 
        column="precioVenta" 
        header="Precio Venta" 
        :body="row => `$${parseFloat(row.precioVenta).toFixed(2)}`" 
        class="text-right"
      />
      
      <!-- Stock Column -->
      <Field 
        column="stockActual" 
        header="Stock" 
        :body="row => row.stockActual" 
        class="text-center"
      />
      
      <!-- Status Column -->
      <Field 
        column="activo" 
        header="Estado" 
        :body="row => row.activo ? 'Activo' : 'Inactivo'" 
        :class="row => row.activo ? 'text-green-600' : 'text-red-600'"
      />
      
      <!-- Actions Column -->
      <Field 
        header="Acciones" 
        class="text-center"
        :body="row => (
          <div class='flex justify-center space-x-2'>
            <button 
              @click="editProduct(row)"
              class="text-blue-600 hover:text-blue-800"
              title="Editar"
            >
              <i class="pi pi-pencil"></i>
            </button>
            <button 
              @click="deleteProduct(row.id)"
              class="text-red-600 hover:text-red-800"
              title="Eliminar"
            >
              <i class="pi pi-trash"></i>
            </button>
          </div>
        )" 
      />
    </PrimeVueDataTable>

    <!-- Pagination Info -->
    <div v-if="!loading && !error && products.length > 0" class="flex justify-between items-center mt-4 text-sm text-gray-500">
      <span>
        Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
        {{ Math.min(pagination.page * pagination.limit, pagination.totalItems) }} de 
        {{ pagination.totalItems }} productos
      </span>
    </div>

    <!-- Product Form Modal -->
    <ProductFormModal 
      v-model:show="showProductForm"
      :product="editingProduct"
      @save="handleSaveProduct"
      @cancel="showProductForm = false"
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { validatedProductSchema } from '@/validations/productValidation'
import { useZodForm } from '@/composables/useZodForm'

export default {
  name: 'ProductTable',
  components: {
    PrimeVueDataTable: () => Promise.resolve(window.PrimeVue.DataTable),
    Column: () => Promise.resolve(window.PrimeVue.Column),
    ProductFormModal: () => import('./ProductFormModal.vue')
  },
  setup() {
    const productStore = useProductStore()
    
    // State
    const loading = ref(false)
    const error = ref(null)
    const showProductForm = ref(false)
    const editingProduct = ref(null)
    
    // Pagination (synced with store)
    const pagination = ref({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    })
    
    // Filters
    const filters = ref({
      filtro: '',
      categoria: '',
      activo: ''
    })
    
    // Form validation
    const { form, handleSubmit, errors, resetForm } = useZodForm(validatedProductSchema)
    
    // Fetch products from store
    const fetchProducts = async () => {
      loading.value = true
      error.value = null
      
      try {
        // Update store with current filters and pagination
        productStore.setFilters(filters.value)
        productStore.setPage(pagination.value.page)
        
        // Fetch products
        await productStore.fetchProducts()
        
        // Update local state from store
        if (productStore.products.length > 0) {
          pagination.value = { ...productStore.pagination }
        }
        
        // Clear error if any
        productStore.clearError()
      } catch (err) {
        error.value = err.message || 'Error fetching products'
      } finally {
        loading.value = false
      }
    }
    
    // Handle page change
    const onPageChange = (event) => {
      pagination.value.page = event.page + 1 // PrimeVue uses 0-based index
      fetchProducts()
    }
    
    // Edit product
    const editProduct = (product) => {
      editingProduct.value = { ...product }
      showProductForm.value = true
      
      // Initialize form with product data
      form.value = { ...product }
    }
    
    // Delete product
    const deleteProduct = async (id) => {
      if (!confirm('¿Está seguro de eliminar este producto?')) return
      
      try {
        loading.value = true
        await productStore.deleteProduct(id)
        await fetchProducts() // Refresh list
      } catch (err) {
        error.value = err.message || 'Error deleting product'
      } finally {
        loading.value = false
      }
    }
    
    // Handle form submission
    const handleSaveProduct = async (productData) => {
      try {
        loading.value = true
        error.value = null
        
        let result
        if (editingProduct.value) {
          // Update existing product
          result = await productStore.updateProduct(editingProduct.value.id, productData)
        } else {
          // Create new product
          result = await productStore.createProduct(productData)
        }
        
        if (result.success) {
          showProductForm.value = false
          editingProduct.value = null
          resetForm()
          await fetchProducts() // Refresh list
        } else {
          error.value = result.error || 'Error saving product'
        }
      } catch (err) {
        error.value = err.message || 'Error saving product'
      } finally {
        loading.value = false
      }
    }
    
    // Clear error
    const clearError = () => {
      error.value = null
      productStore.clearError()
    }
    
    // Initial load
    fetchProducts()
    
    // Expose to template
    return {
      // State
      loading,
      error,
      showProductForm,
      editingProduct,
      
      // Data
      products: productStore.products,
      pagination,
      
      // Methods
      fetchProducts,
      onPageChange,
      editProduct,
      deleteProduct,
      handleSaveProduct,
      clearError,
      
      // Form
      form,
      handleSubmit,
      errors,
      resetForm
    }
  }
}
</script>

<style scoped>
/* Custom styles for PrimeVue DataTable */
.p-datatable .p-datatable-thead > tr > th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e2e8f0;
}

.p-datatable .p-datatable-tbody > tr > td {
  padding: 1rem 0.75rem;
  border-color: #f1f5f9;
}

.p-datatable .p-datatable-tbody > tr:hover > td {
  background-color: #f0f9ff;
}

.p-paginator {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}
</style>