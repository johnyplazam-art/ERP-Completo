import { ref, watch, computed } from 'https://cdn.jsdelivr.net/npm/vue@3.4.27/dist/vue.esm-browser.prod.js'
import { useProductStore } from '../stores/productStore.js'
import { validateProduct } from '../validations/productValidation.js'

export default {
  name: 'ProductFormModal',
  props: {
    productId: { type: [String, Number], default: null }
  },
  emits: ['update:show', 'saved'],
  template: `
    <Teleport to="body">
      <div v-if="show" class="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center sm:justify-center">
        <div class="fixed inset-0 transition-opacity bg-black/50" @click="onCancelClick"></div>
        <div class="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-md mx-4 z-10">
          <!-- Header -->
          <div class="bg-indigo-600 px-6 py-4">
            <h3 class="text-lg font-medium text-white">
              {{ isEdit ? 'Editar Producto' : 'Crear Nuevo Producto' }}
            </h3>
          </div>
          <!-- Body -->
          <div class="px-6 py-6 space-y-6">
            <!-- Error message -->
            <div v-if="formError" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 text-sm">
              {{ formError }}
            </div>
            <form @submit.prevent="onSubmit" class="space-y-6">
              <div>
                <label for="codigo" class="block text-sm font-medium text-gray-700 mb-1">C\u00f3digo *</label>
                <input v-model="form.codigo" id="codigo" type="text" required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                <p v-if="errors.codigo" class="mt-1 text-sm text-red-600">{{ errors.codigo }}</p>
              </div>
              <div>
                <label for="nombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input v-model="form.nombre" id="nombre" type="text" required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">{{ errors.nombre }}</p>
              </div>
              <div>
                <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-1">Descripci\u00f3n</label>
                <textarea v-model="form.descripcion" id="descripcion" rows="3"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                </textarea>
              </div>
              <div>
                <label for="categoria" class="block text-sm font-medium text-gray-700 mb-1">Categor\u00eda *</label>
                <input v-model="form.categoria" id="categoria" type="text" required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                <p v-if="errors.categoria" class="mt-1 text-sm text-red-600">{{ errors.categoria }}</p>
              </div>
              <div>
                <label for="subcategoria" class="block text-sm font-medium text-gray-700 mb-1">Subcategor\u00eda</label>
                <input v-model="form.subcategoria" id="subcategoria" type="text"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
              </div>
              <div>
                <label for="unidadMedida" class="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida *</label>
                <input v-model="form.unidadMedida" id="unidadMedida" type="text" required
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                <p v-if="errors.unidadMedida" class="mt-1 text-sm text-red-600">{{ errors.unidadMedida }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="precioCosto" class="block text-sm font-medium text-gray-700 mb-1">Precio Costo *</label>
                  <input v-model.number="form.precioCosto" id="precioCosto" type="number" min="0" step="0.01" required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <p v-if="errors.precioCosto" class="mt-1 text-sm text-red-600">{{ errors.precioCosto }}</p>
                </div>
                <div>
                  <label for="precioVenta" class="block text-sm font-medium text-gray-700 mb-1">Precio Venta *</label>
                  <input v-model.number="form.precioVenta" id="precioVenta" type="number" min="0" step="0.01" required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <p v-if="errors.precioVenta" class="mt-1 text-sm text-red-600">{{ errors.precioVenta }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="stockActual" class="block text-sm font-medium text-gray-700 mb-1">Stock Actual *</label>
                  <input v-model.number="form.stockActual" id="stockActual" type="number" min="0" required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <p v-if="errors.stockActual" class="mt-1 text-sm text-red-600">{{ errors.stockActual }}</p>
                </div>
                <div>
                  <label for="stockMinimo" class="block text-sm font-medium text-gray-700 mb-1">Stock M\u00ednimo *</label>
                  <input v-model.number="form.stockMinimo" id="stockMinimo" type="number" min="0" required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <p v-if="errors.stockMinimo" class="mt-1 text-sm text-red-600">{{ errors.stockMinimo }}</p>
                </div>
                <div>
                  <label for="stockMaximo" class="block text-sm font-medium text-gray-700 mb-1">Stock M\u00e1ximo *</label>
                  <input v-model.number="form.stockMaximo" id="stockMaximo" type="number" min="0" required
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <p v-if="errors.stockMaximo" class="mt-1 text-sm text-red-600">{{ errors.stockMaximo }}</p>
                </div>
              </div>
              <div class="flex items-center">
                <input id="activo" v-model="form.activo" type="checkbox"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                <label for="activo" class="ml-2 block text-sm font-medium text-gray-900">Activo</label>
              </div>
            </form>
          </div>
          <!-- Footer -->
          <div class="bg-indigo-50 px-6 py-4 text-right space-x-3">
            <button @click="onCancelClick" type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancelar</button>
            <button @click="onSubmit" :disabled="isSubmitting" type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {{ isSubmitting ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  `,
  setup(props, { emit }) {
    const productStore = useProductStore()
    const show = ref(false)
    const isSubmitting = ref(false)
    const errors = ref({})
    const formError = ref('')
    
    const defaultForm = () => ({
      codigo: '', nombre: '', descripcion: '', categoria: '',
      subcategoria: '', unidadMedida: '',
      precioCosto: 0, precioVenta: 0,
      stockActual: 0, stockMinimo: 0, stockMaximo: 0, activo: true
    })
    
    const form = ref(defaultForm())
    const isEdit = computed(() => !!props.productId)
    
    const loadProductData = () => {
      if (!props.productId) return
      const product = productStore.products.find(p => p.id == props.productId)
      if (product) {
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
          activo: product.activo === true || product.activo === 'true'
        }
      }
    }
    
    const initForm = () => {
      form.value = defaultForm()
      errors.value = {}
      formError.value = ''
      if (isEdit.value) loadProductData()
    }
    
    watch(() => props.productId, () => initForm())
    initForm()
    
    const onSubmit = async () => {
      const validation = validateProduct(form.value)
      if (!validation.valid) {
        errors.value = validation.errors || {}
        return
      }
      
      isSubmitting.value = true
      errors.value = {}
      formError.value = ''
      
      try {
        let response
        if (isEdit.value) {
          response = await productStore.updateProduct(props.productId, form.value)
        } else {
          response = await productStore.createProduct(form.value)
        }
        
        if (response.success) {
          emit('saved')
          emit('update:show', false)
          form.value = defaultForm()
        } else {
          formError.value = response.error || 'Error al guardar'
        }
      } catch (err) {
        formError.value = err.message || 'Error al conectar con el servidor'
      } finally {
        isSubmitting.value = false
      }
    }
    
    const onCancelClick = () => {
      emit('update:show', false)
      initForm()
    }
    
    return { show, isSubmitting, errors, formError, form, isEdit, onSubmit, onCancelClick }
  }
}
