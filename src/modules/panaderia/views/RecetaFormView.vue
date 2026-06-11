<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { recetaSchema } from '../validations/index'
import { getSelectValue } from '@/core/composables/useSelectValue'
import { useCategoriasRecetaQuery, useUnidadesMedidaQuery, useIngredientesQuery, useRecetasQuery, useCreateRecetaMutation, useUpdateRecetaMutation } from '../composables/queries'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const { data: categorias } = useCategoriasRecetaQuery()
const { data: unidades } = useUnidadesMedidaQuery()
const { data: ingredientes } = useIngredientesQuery({ activo: true })
const { data: recetas } = useRecetasQuery()
const createMutation = useCreateRecetaMutation()
const updateMutation = useUpdateRecetaMutation()

const { handleSubmit, values, setFieldValue, errors, resetForm } = useForm({
  validationSchema: toTypedSchema(recetaSchema),
  initialValues: {
    nombre: '',
    categoria_id: null,
    instrucciones: '',
    tiempo_preparacion_min: null,
    rendimiento_cantidad: 1,
    rendimiento_unidad_id: null,
    activa: true,
    ingredientes: [],
  },
})

// Cargar datos existentes si estamos en modo edición
if (isEdit.value) {
  const receta = computed(() =>
    recetas.value?.find(r => r.id === Number(route.params.id))
  )

  watchEffect(() => {
    const data = receta.value
    if (data) {
      resetForm({
        values: {
          nombre: data.nombre || '',
          categoria_id: data.categoria_id || null,
          instrucciones: data.instrucciones || '',
          tiempo_preparacion_min: data.tiempo_preparacion_min || null,
          rendimiento_cantidad: data.rendimiento_cantidad || 1,
          rendimiento_unidad_id: data.rendimiento_unidad_id || null,
          activa: data.activa ?? true,
          ingredientes: (data.receta_ingredientes || []).map((ri, i) => ({
            ingrediente_id: ri.ingrediente_id,
            cantidad: ri.cantidad,
            unidad_id: ri.unidad_id,
            es_opcional: ri.es_opcional || false,
            orden: ri.orden || i,
          })),
        },
      })
    }
  })
}


const addIngrediente = () => {
  setFieldValue('ingredientes', [
    ...values.ingredientes,
    { ingrediente_id: null, cantidad: 0, unidad_id: null, es_opcional: false, orden: values.ingredientes.length },
  ])
}

const removeIngrediente = (index) => {
  const next = values.ingredientes.filter((_, i) => i !== index)
  setFieldValue('ingredientes', next)
}

const onIngredienteChange = (index, event) => {
  const selectedId = getSelectValue(event)
  if (!selectedId) return
  const ing = ingredientes.value?.find(i => i.id === selectedId)
  if (ing) {
    setFieldValue(`ingredientes[${index}].unidad_id`, ing.unidad_base_id)
  }
}

const onSubmit = handleSubmit(async (formValues) => {
  try {
    if (isEdit) {
      await updateMutation.mutateAsync({ id: Number(route.params.id), values: formValues })
      toast.success('Receta actualizada exitosamente')
    } else {
      await createMutation.mutateAsync(formValues)
      toast.success('Receta creada exitosamente')
    }
    router.push('/panaderia/recetas')
  } catch (err) {
    toast.error(err.message || `Error al ${isEdit ? 'actualizar' : 'crear'} receta`)
  }
})
</script>

<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/panaderia/recetas" class="text-gray-400 hover:text-gray-600 mr-3">
        <i class="pi pi-arrow-left text-xl"></i>
      </router-link>
      <h2 class="text-2xl font-bold text-gray-900">
        {{ isEdit ? 'Editar Receta' : 'Nueva Receta' }}
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
              placeholder="Pan francés"
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

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
          <textarea
            :value="values.instrucciones"
            @input="setFieldValue('instrucciones', $event.target.value)"
            rows="3"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tiempo (min)</label>
            <input
              :value="values.tiempo_preparacion_min"
              @input="setFieldValue('tiempo_preparacion_min', $event.target.value === '' ? null : $event.target.valueAsNumber)"
              type="number"
              min="1"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rendimiento *</label>
            <input
              :value="values.rendimiento_cantidad"
              @input="setFieldValue('rendimiento_cantidad', $event.target.valueAsNumber)"
              type="number"
              min="0.01"
              step="0.01"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
            <select
              :value="values.rendimiento_unidad_id"
              @change="setFieldValue('rendimiento_unidad_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>Seleccionar...</option>
              <option v-for="u in unidades" :key="u.id" :value="u.id">
                {{ u.nombre }} ({{ u.simbolo }})
              </option>
            </select>
            <p v-if="errors.rendimiento_unidad_id" class="mt-1 text-sm text-red-600">{{ errors.rendimiento_unidad_id }}</p>
          </div>
        </div>
      </div>

      <!-- Ingredients -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Ingredientes</h3>
          <button
            type="button"
            @click="addIngrediente"
            class="inline-flex items-center px-3 py-2 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
          >
            <i class="pi pi-plus mr-1"></i>
            Agregar
          </button>
        </div>

        <p v-if="errors.ingredientes" class="text-sm text-red-600">{{ errors.ingredientes }}</p>

        <div v-for="(ing, index) in values.ingredientes" :key="index" class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-400 w-6 mt-2">{{ index + 1 }}</span>

          <div class="flex-1">
            <select
              :value="values.ingredientes[index].ingrediente_id"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
              @change="setFieldValue('ingredientes[' + index + '].ingrediente_id', getSelectValue($event)); onIngredienteChange(index, $event)"
            >
              <option :value="null" disabled>Ingrediente...</option>
              <option v-for="item in ingredientes" :key="item.id" :value="item.id">
                {{ item.nombre }}
              </option>
            </select>
            <p v-if="errors[`ingredientes[${index}].ingrediente_id`]" class="mt-1 text-sm text-red-600">
              {{ errors[`ingredientes[${index}].ingrediente_id`] }}
            </p>
          </div>

          <div class="w-24">
            <input
              :value="values.ingredientes[index].cantidad"
              @input="setFieldValue('ingredientes[' + index + '].cantidad', $event.target.valueAsNumber)"
              type="number"
              min="0.01"
              step="0.01"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm text-center focus:ring-2 focus:ring-primary-500"
              placeholder="Cant."
            />
            <p v-if="errors[`ingredientes[${index}].cantidad`]" class="mt-1 text-sm text-red-600">
              {{ errors[`ingredientes[${index}].cantidad`] }}
            </p>
          </div>

          <div class="w-28">
            <select
              :value="values.ingredientes[index].unidad_id"
              @change="setFieldValue('ingredientes[' + index + '].unidad_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>Unidad</option>
              <option v-for="u in unidades" :key="u.id" :value="u.id">
                {{ u.simbolo }}
              </option>
            </select>
            <p v-if="errors[`ingredientes[${index}].unidad_id`]" class="mt-1 text-sm text-red-600">
              {{ errors[`ingredientes[${index}].unidad_id`] }}
            </p>
          </div>

          <label class="flex items-center gap-1 text-xs text-gray-500 mt-2">
            <input type="checkbox" :checked="values.ingredientes[index].es_opcional" @change="setFieldValue('ingredientes[' + index + '].es_opcional', $event.target.checked)" class="rounded" />
            Opc.
          </label>

          <button
            type="button"
            @click="removeIngrediente(index)"
            class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg mt-2"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>

        <div v-if="!values.ingredientes.length" class="text-center py-6 text-gray-400 text-sm">
          No hay ingredientes. Agregá al menos uno.
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <router-link
          to="/panaderia/recetas"
          class="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </router-link>
        <button
          type="submit"
          :disabled="isEdit ? updateMutation.isPending.value : createMutation.isPending.value"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <i v-if="isEdit ? updateMutation.isPending.value : createMutation.isPending.value" class="pi pi-spin pi-spinner mr-2"></i>
          {{ isEdit ? (updateMutation.isPending.value ? 'Guardando...' : 'Actualizar Receta') : (createMutation.isPending.value ? 'Guardando...' : 'Guardar Receta') }}
        </button>
      </div>
    </form>
  </div>
</template>
