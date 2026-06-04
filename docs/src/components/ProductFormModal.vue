<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center sm:justify-center">
      <div class="fixed inset-0 transition-opacity" :class="{ 'bg-black/50': show }" @click="onCancelClick"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div 
        class="fixed left-0 right-0 bottom-0 overflow-y-auto border-0 p-4 w-full max-w-md transform transition-all" 
        :class="{
          'opacity-100': show,
          'opacity-0': !show
        }"
      >
        <div class="bg-white rounded-lg shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="bg-indigo-600 px-6 py-4">
            <h3 class="text-lg font-medium text-white">
              {{ isEdit ? 'Editar Producto' : 'Crear Nuevo Producto' }}
            </h3>
          </div>
          
          <!-- Body -->
          <div class="px-6 py-6 space-y-6">
            <!-- Form -->
            <form @submit.prevent="onSubmit" class="space-y-6">
              <!-- Código -->
              <div>
                <label for="codigo" class="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  v-model="form.codigo"
                  id="codigo"
                  type="text"
                  required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                <p v-if="errors.codigo" class="mt-1 text-sm text-red-600">{{ errors.codigo }}</p>
              </div>
              
              <!-- Nombre -->
              <div>
                <label for="nombre" class="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  v-model="form.nombre"
                  id="nombre"
                  type="text"
                  required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">{{ errors.nombre }}</p>
              </div>
              
              <!-- Descripción -->
              <div>
                <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  v-model="form.descripcion"
                  id="descripcion"
                  rows="3"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                </textarea>
              </div>
              
              <!-- Categoría -->
              <div>
                <label for="categoria" class="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <input
                  v-model="form.categoria"
                  id="categoria"
                  type="text"
                  required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                <p v-if="errors.categoria" class="mt-1 text-sm text-red-600">{{ errors.categoria }}</p>
              </div>
              
              <!-- Subcategoría -->
              <div>
                <label for="subcategoria" class="block text-sm font-medium text-gray-700 mb-1">
                  Subcategoría
                </label>
                <input
                  v-model="form.subcategoria"
                  id="subcategoria"
                  type="text"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
              </div>
              
              <!-- Unidad de Medida -->
              <div>
                <label for="unidadMedida" class="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Medida *
                </label>
                <input
                  v-model="form.unidadMedida"
                  id="unidadMedida"
                  type="text"
                  required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                <p v-if="errors.unidadMedida" class="mt-1 text-sm text-red-600">{{ errors.unidadMedida }}</p>
              </div>
              
              <!-- Precio Costo -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="precioCosto" class="block text-sm font-medium text-gray-700 mb-1">
                    Precio Costo *
                  </label>
                  <input
                    v-model.number="form.precioCosto"
                    id="precioCosto"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                  <p v-if="errors.precioCosto" class="mt-1 text-sm text-red-600">{{ errors.precioCosto }}</p>
                </div>
                
                <!-- Precio Venta -->
                <div>
                  <label for="precioVenta" class="block text-sm font-medium text-gray-700 mb-1">
                    Precio Venta *
                  </label>
                  <input
                    v-model.number="form.precioVenta"
                    id="precioVenta"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                  <p v-if="errors.precioVenta" class="mt-1 text-sm text-red-600">{{ errors.precioVenta }}</p>
                </div>
              </div>
              
              <!-- Stock Actual -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="stockActual" class="block text-sm font-medium text-gray-700 mb-1">
                    Stock Actual *
                  </label>
                  <input
                    v-model.number="form.stockActual"
                    id="stockActual"
                    type="number"
                    min="0"
                    required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                  <p v-if="errors.stockActual" class="mt-1 text-sm text-red-600">{{ errors.stockActual }}</p>
                </div>
                
                <!-- Stock Mínimo -->
                <div>
                  <label for="stockMinimo" class="block text-sm font-medium text-gray-700 mb-1">
                    Stock Mínimo *
                  </label>
                  <input
                    v-model.number="form.stockMinimo"
                    id="stockMinimo"
                    type="number"
                    min="0"
                    required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                  <p v-if="errors.stockMinimo" class="mt-1 text-sm text-red-600">{{ errors.stockMinimo }}</p>
                </div>
                
                <!-- Stock Máximo -->
                <div>
                  <label for="stockMaximo" class="block text-sm font-medium text-gray-700 mb-1">
                    Stock Máximo *
                  </label>
                  <input
                    v-model.number="form.stockMaximo"
                    id="stockMaximo"
                    type="number"
                    min="0"
                    required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                  <p v-if="errors.stockMaximo" class="mt-1 text-sm text-red-600">{{ errors.stockMaximo }}</p>
                </div>
              </div>
              
              <!-- Activo -->
              <div class="flex items-center">
                <input
                  id="activo"
                  v-model="form.activo"
                  type="checkbox"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                >
                <label for="activo" class="ml-2 block text-sm font-medium text-gray-900">
                  Activo
                </label>
              </div>
            </form>
          </div>
          
          <!-- Footer -->
          <div class="bg-indigo-50 px-6 py-4 text-right space-x-3">
            <button 
              @click="onCancelClick" 
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button 
              @click="onSubmit" 
              :disabled="isSubmitting"
              type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {{ isSubmitting ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, watch } from 'https://unpkg.com/vue@3.5.0/dist/vue.esm-browser.prod.js'
import { useProductStore } from '@/stores/productStore.js'
import { validateProduct } from '@/validations/productValidation.js'

export default {
  name: 'ProductFormModal',
  props: {
    /**
     * If provided, the modal will be in edit mode for this product ID
     * If null/undefined, the modal will be in create mode
     */
    productId: {
      type: [String, Number],
      default: null
    }
  },
  emits: ['update:show', 'saved'],
  setup(props, { emit }) {
    const productStore = useProductStore()
    const show = ref(false)
    const isSubmitting = ref(false)
    const errors = ref({})
    
    // Form data
    const form = ref({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      subcategoria: '',
      unidadMedida: '',
      precioCosto: 0,
      precioVenta: 0,
      stockActual: 0,
      stockMinimo: 0,
      stockMaximo: 0,
      activo: true
    })
    
    // Determine if we're in edit mode
    const isEdit = ref(!!props.productId)
    
    // Load product data when in edit mode
    const loadProductData = async () => {
      if (!props.productId) return
      
      try {
        // We'll need to fetch the product by ID
        // For now, we'll use a simple approach - in a real app, you'd have a getProduct endpoint
        // Since we have handleGetProduct in our backend, we could use that
        const response = await axios.post('', {
          action: 'getProducts',
          payload: {
            filtro: '', // We'll need to implement proper ID lookup
            limit: 1
          }
        })
        
        if (response.data.success && response.data.data.items.length > 0) {
          const product = response.data.data.items[0]
          form.value = {
            codigo: product.codigo || '',
            nombre: product.nombre || '',
            descripcion: product.descripcion || '',
            categoria: product.categoria || '',
            subcategoria: product.subcategoria || '',
            unidadMedida: product.unidadMedida || '',
            precioCosto: Number(product.precioCosto) || 0,
            precioVenta: Number(product.precioVenta) || 0,
            stockActual: Number(product.stockActual) || 0,
            stockMinimo: Number(product.stockMinimo) || 0,
            stockMaximo: Number(product.stockMaximo) || 0,
            activo: product.activo === 'true' || product.activo === true
          }
        }
      } catch (err) {
        console.error('Error loading product data:', err)
        // In a real app, show error notification
      }
    }
    
    // Initialize form data based on mode
    const initForm = () => {
      // Reset form
      form.value = {
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        subcategoria: '',
        unidadMedida: '',
        precioCosto: 0,
        precioVenta: 0,
        stockActual: 0,
        stockMinimo: 0,
        stockMaximo: 0,
        activo: true
      }
      errors.value = {}
      
      // If editing, load product data
      if (isEdit.value) {
        loadProductData()
      }
    }
    
    // Watch for prop changes
    watch(() => props.productId, (newId) => {
      isEdit.value = !!newId
      initForm()
    })
    
    // Initial load
    initForm()
    
    // Handle form submission
    const onSubmit = async () => {
      // Validate form
      const validation = validateProduct(form.value)
      if (!validation.valid) {
        errors.value = validation.errors || {}
        return
      }
      
      isSubmitting.value = true
      errors.value = {}
      
      try {
        let response
        if (isEdit.value) {
          // Update existing product
          response = await productStore.updateProduct(props.productId, form.value)
        } else {
          // Create new product
          response = await productStore.createProduct(form.value)
        }
        
        if (response.data.success) {
          // Emit saved event to parent
          emit('saved')
          // Close modal
          emit('update:show', false)
          
          // Reset form for next use
          form.value = {
            codigo: '',
            nombre: '',
            descripcion: '',
            categoria: '',
            subcategoria: '',
            unidadMedida: '',
            precioCosto: 0,
            precioVenta: 0,
            stockActual: 0,
            stockMinimo: 0,
            stockMaximo: 0,
            activo: true
          }
        } else {
          throw new Error(response.data.error || 'Operation failed')
        }
      } catch (err) {
        // Handle error - in a real app, you might show a toast
        console.error('Error saving product:', err)
        // For now, we'll just set a generic error
        errors.value = { _form: err.message || 'An error occurred' }
      } finally {
        isSubmitting.value = false
      }
    }
    
    // Handle cancel
    const onCancelClick = () => {
      emit('update:show', false)
      // Reset form
      initForm()
    }
    
    return {
      show,
      isSubmitting,
      errors,
      form,
      isEdit,
      onSubmit,
      onCancelClick
    }
  }
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>