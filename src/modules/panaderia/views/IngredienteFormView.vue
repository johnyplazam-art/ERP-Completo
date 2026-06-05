<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { ingredienteSchema } from '../validations/index'
import {
  useCategoriasIngredienteQuery,
  useUnidadesMedidaQuery,
  useIngredientesQuery,
  useCreateIngredienteMutation,
  useUpdateIngredienteMutation,
} from '../composables/queries'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const { data: categorias } = useCategoriasIngredienteQuery()
const { data: unidades } = useUnidadesMedidaQuery()
const { data: ingredientes } = useIngredientesQuery()
const createMutation = useCreateIngredienteMutation()
const updateMutation = useUpdateIngredienteMutation()

const { handleSubmit, values, resetForm, errors, setFieldValue } = useForm({
  validationSchema: toTypedSchema(ingredienteSchema),
  initialValues: {
    nombre: '',
    categoria_id: null,
    unidad_base_id: null,
    stock_minimo: 0,
    ubicacion: '',
    perecedero: false,
    vida_util_dias: null,
    activo: true,
  },
})

// Helper: extrae el valor real de un <select> (Vue guarda el valor real en option._value)
const getSelectValue = (event) => {
  const option = event.target.options[event.target.selectedIndex]
  return option ? option._value : null
}

// Cargar datos existentes en modo edición
if (isEdit.value) {
  const ingrediente = computed(() =>
    ingredientes.value?.find(i => i.id === Number(route.params.id))
  )

  watchEffect(() => {
    const data = ingrediente.value
    if (data) {
      resetForm({
        values: {
          nombre: data.nombre || '',
          categoria_id: data.categoria_id,
          unidad_base_id: data.unidad_base_id,
          stock_minimo: data.stock_minimo ?? 0,
          ubicacion: data.ubicacion || '',
          perecedero: data.perecedero ?? false,
          vida_util_dias: data.vida_util_dias ?? null,
          activo: data.activo ?? true,
        },
      })
    }
  })
}

const onSubmit = handleSubmit(async (formValues) => {
  try {
    if (isEdit.value) {
      await updateMutation.mutateAsync({ id: Number(route.params.id), values: formValues })
      toast.success('Ingrediente actualizado exitosamente')
    } else {
      await createMutation.mutateAsync(formValues)
      toast.success('Ingrediente creado exitosamente')
    }
    router.push('/panaderia/inventario')
  } catch (err) {
    toast.error(err.message || 'Error al guardar ingrediente')
  }
})
</script>

<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/panaderia/inventario" class="text-gray-400 hover:text-gray-600 mr-3">
        <i class="pi pi-arrow-left text-xl"></i>
      </router-link>
      <h2 class="text-2xl font-bold text-gray-900">
        {{ isEdit ? 'Editar Ingrediente' : 'Nuevo Ingrediente' }}
      </h2>
    </div>

    <form @submit="onSubmit" class="max-w-3xl space-y-6">
      <!-- Basic Info -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Información General</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              :value="values.nombre"
              @input="setFieldValue('nombre', $event.target.value)"
              type="text"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Harina 000"
            />
            <p v-if="errors.nombre" class="mt-1 text-sm text-red-600">{{ errors.nombre }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select
              :value="values.categoria_id"
              @change="setFieldValue('categoria_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>Seleccionar...</option>
              <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
                {{ cat.nombre }}
              </option>
            </select>
            <p v-if="errors.categoria_id" class="mt-1 text-sm text-red-600">{{ errors.categoria_id }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Unidad base *</label>
            <select
              :value="values.unidad_base_id"
              @change="setFieldValue('unidad_base_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>Seleccionar...</option>
              <option v-for="u in unidades" :key="u.id" :value="u.id">
                {{ u.nombre }} ({{ u.simbolo }})
              </option>
            </select>
            <p v-if="errors.unidad_base_id" class="mt-1 text-sm text-red-600">{{ errors.unidad_base_id }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
            <input
              :value="values.stock_minimo"
              @input="setFieldValue('stock_minimo', $event.target.valueAsNumber)"
              type="number"
              min="0"
              step="0.01"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input
              :value="values.ubicacion"
              @input="setFieldValue('ubicacion', $event.target.value)"
              type="text"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Estante A3"
            />
          </div>
        </div>
      </div>

      <!-- Storage & Shelf Life -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Almacenamiento</h3>

        <div class="flex items-center gap-2 mb-4">
          <input
            id="perecedero"
            type="checkbox"
            :checked="values.perecedero"
            @change="setFieldValue('perecedero', $event.target.checked)"
            class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label for="perecedero" class="text-sm font-medium text-gray-700">Es perecedero</label>
        </div>

        <div v-if="values.perecedero" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vida útil (días)</label>
            <input
              :value="values.vida_util_dias"
              @input="setFieldValue('vida_util_dias', $event.target.value === '' ? null : $event.target.valueAsNumber)"
              type="number"
              min="1"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="30"
            />
            <p v-if="errors.vida_util_dias" class="mt-1 text-sm text-red-600">{{ errors.vida_util_dias }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="activo"
            type="checkbox"
            :checked="values.activo"
            @change="setFieldValue('activo', $event.target.checked)"
            class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label for="activo" class="text-sm font-medium text-gray-700">Activo</label>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <router-link
          to="/panaderia/inventario"
          class="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </router-link>
        <button
          type="submit"
          :disabled="createMutation.isPending.value || updateMutation.isPending.value"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <i
            v-if="createMutation.isPending.value || updateMutation.isPending.value"
            class="pi pi-spin pi-spinner mr-2"
          ></i>
          {{ createMutation.isPending.value || updateMutation.isPending.value ? 'Guardando...' : 'Guardar Ingrediente' }}
        </button>
      </div>
    </form>
  </div>
</template>
