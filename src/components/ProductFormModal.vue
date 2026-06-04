<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <div class="flex justify-between items-start mb-4">
        <h2 class="text-xl font-bold text-gray-800">
          {{ editingProduct ? 'Editar Producto' : 'Nuevo Producto' }}
        </h2>
        <button 
          @click="onCancel"
          class="text-gray-500 hover:text-gray-700"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Form -->
      <form 
        @submit.prevent="onSubmit"
        class="space-y-4"
      >
        <!-- Basic Info Section -->
        <div>
          <h3 class="font-semibold text-gray-700 mb-2">Información Básica</h3>
          
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- Código -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                v-model="form.codigo"
                :class="{
                  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                  'border-red-500': errors.codigo
                }"
                placeholder="Ingrese el código del producto"
              >
              <p v-if="errors.codigo" class="mt-1 text-sm text-red-600">
                {{ errors.codigo }}
              </p>
            </div>
            
            <!-- Nombre -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                v-model="form.nombre"
                :class="{
                  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                  'border-red-500': errors.nombre
                }"
                placeholder="Ingrese el nombre del producto"
              >
              <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">
                {{ errors.nombre }}
              </p>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            v-model="form.descripcion"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Ingrese una descripción (opcional)"
          ></textarea>
        </div>

        <!-- Classification -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <input
              type="text"
              v-model="form.categoria"
              :class="{
                'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                'border-red-500': errors.categoria
              }"
              placeholder="Ingrese la categoría"
            >
            <p v-if="errors.categoria" class="mt-1 text-sm text-red-600">
              {{ errors.categoria }}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Subcategoría
            </label>
            <input
              type="text"
              v-model="form.subcategoria"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ingrese la subcategoría (opcional)"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Unidad de Medida *
            </label>
            <input
              type="text"
              v-model="form.unidadMedida"
              :class="{
                'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                'border-red-500': errors.unidadMedida
              }"
              placeholder="Ej: kg, unidades, litros"
            >
            <p v-if="errors.unidadMedida" class="mt-1 text-sm text-red-600">
              {{ errors.unidadMedida }}
            </p>
          </div>
        </div>

        <!-- Pricing -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Precio de Costo *
            </label>
            <input
              type="number"
              v-model.number="form.precioCosto"
              min="0"
              step="0.01"
              :class="{
                'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                'border-red-500': errors.precioCosto
              }"
              placeholder="0.00"
            >
            <p v-if="errors.precioCosto" class="mt-1 text-sm text-red-600">
              {{ errors.precioCosto }}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Precio de Venta *
            </label>
            <input
              type="number"
              v-model.number="form.precioVenta"
              min="0"
              step="0.01"
              :class="{
                'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                'border-red-500': errors.precioVenta
              }"
              placeholder="0.00"
            >
            <p v-if="errors.precioVenta" class="mt-1 text-sm text-red-600">
              {{ errors.precioVenta }}
            </p>
          </div>
        </div>

        <!-- Stock -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Stock Actual
            </label>
            <input
              type="number"
              v-model.number="form.stockActual"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Stock Mínimo
            </label>
            <input
              type="number"
              v-model.number="form.stockMinimo"
              min="0"
              :class="{
                'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                'border-red-500': errors.stockMinimo
              }"
              placeholder="0"
            >
            <p v-if="errors.stockMinimo" class="mt-1 text-sm text-red-600">
              {{ errors.stockMinimo }}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Stock Máximo
            </label>
            <input
              type="number"
              v-model.number="form.stockMaximo"
              min="0"
              :class="{
                'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500': true,
                'border-red-500': errors.stockMaximo
              }"
              placeholder="0"
            >
            <p v-if="errors.stockMaximo" class="mt-1 text-sm text-red-600">
              {{ errors.stockMaximo }}
            </p>
          </div>
        </div>

        <!-- Status -->
        <div class="flex items-center mb-4">
          <input
            type="checkbox"
            v-model="form.activo"
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          >
          <span class="ml-2 text-sm font-medium text-gray-700">
            Producto Activo
          </span>
        </div>
      </form>

      <!-- Form Actions -->
      <div class="flex justify-end pt-4 space-x-3">
        <button
          @click="onCancel"
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition disabled:opacity-50"
        >
          {{ submitting ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { validatedProductSchema } from '@/validations/productValidation'
import { useZodForm } from '@/composables/useZodForm'

export default {
  name: 'ProductFormModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    product: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'save', 'cancel'],
  setup(props, { emit }) {
    const productStore = useProductStore()
    
    // State
    const show = ref(props.modelValue)
    const submitting = ref(false)
    const editingProduct = ref(props.product || null)
    
    // Form validation
    const { form, handleSubmit, errors, resetForm } = useZodForm(validatedProductSchema)
    
    // Watch for prop changes
    const watchShow = () => {
      show.value = props.modelValue
      if (show.value && props.product) {
        // Initialize form with product data when editing
        form.value = { ...props.product }
      } else if (show.value && !props.product) {
        // Reset form when creating new product
        resetForm()
      }
    }
    
    // Initial watch
    watchShow()
    
    // Watch for changes to props
    // Note: In a real app, we'd use watch() but for simplicity we'll handle it in the template
    
    // Handle form submission
    const onSubmit = handleSubmit(async (validData) => {
      submitting.value = true
      try {
        let result
        if (editingProduct.value) {
          // Update existing product
          result = await productStore.updateProduct(editingProduct.value.id, validData)
        } else {
          // Create new product
          result = await productStore.createProduct(validData)
        }
        
        if (result.success) {
          emit('save', validData)
          emit('update:modelValue', false)
          submitting.value = false
        } else {
          // Handle form errors from API
          // For now, we'll show a general error
          alert(result.error || 'Error al guardar el producto')
          submitting.value = false
        }
      } catch (err) {
        alert('Error de red: ' + err.message)
        submitting.value = false
      }
    })
    
    // Handle cancel
    const onCancel = () => {
      emit('update:modelValue', false)
      emit('cancel')
      resetForm()
    }
    
    // Update show when prop changes
    // In a real implementation, we would use watch() here
    
    return {
      show,
      submitting,
      editingProduct,
      form,
      errors,
      onSubmit,
      onCancel,
      handleSubmit,
      resetForm
    }
  }
}
</script>

<style scoped>
/input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>