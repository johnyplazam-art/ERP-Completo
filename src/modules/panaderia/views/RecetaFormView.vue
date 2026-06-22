<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { recetaSchema } from '../validations/index'
import { useCategoriasRecetaQuery, useUnidadesMedidaQuery, useIngredientesQuery, useRecetasQuery, useCreateRecetaMutation, useUpdateRecetaMutation, useRecalcularCostoMutation, useCategoriasIngredienteQuery, useCreateCategoriaRecetaMutation, useCreateUnidadMedidaMutation, useCreateIngredienteMutation } from '../composables/queries'
import { useQueryClient } from '@tanstack/vue-query'
import InlineAddSelect from '../components/InlineAddSelect.vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const { data: categorias } = useCategoriasRecetaQuery()
const { data: unidades } = useUnidadesMedidaQuery()
const { data: ingredientes } = useIngredientesQuery({ activo: true })
const { data: recetas, refetch: refetchRecetas } = useRecetasQuery()
const createMutation = useCreateRecetaMutation()
const updateMutation = useUpdateRecetaMutation()
const recalcularCosto = useRecalcularCostoMutation()

const queryClient = useQueryClient()
const { data: categoriasIngrediente } = useCategoriasIngredienteQuery()
const createCategoriaMutation = useCreateCategoriaRecetaMutation()
const createUnidadMutation = useCreateUnidadMedidaMutation()
const createIngredienteMutation = useCreateIngredienteMutation()

const categoriaFields = [
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
]

const unidadFields = [
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'simbolo', label: 'Símbolo', type: 'text', required: true },
]

const ingredientFields = computed(() => [
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'categoria_id', label: 'Categoría', type: 'select', options: categoriasIngrediente.value ?? [], optionLabel: 'nombre', optionValue: 'id', required: true },
  { key: 'unidad_base_id', label: 'Unidad base', type: 'select', options: unidades.value ?? [], optionLabel: 'nombre', optionValue: 'id', required: true },
  { key: 'perecedero', label: 'Perecedero', type: 'checkbox' },
  { key: 'stock_minimo', label: 'Stock mínimo', type: 'number', min: 0 },
])

async function handleRecalcular() {
  try {
    await recalcularCosto.mutateAsync(Number(route.params.id))
    toast.success(t('recetas.costRecalculated'))
  } catch (err) {
    toast.error(err.message || t('recetas.costRecalcError'))
  }
}

const recetaActual = computed(() =>
  recetas.value?.find(r => r.id === Number(route.params.id))
)

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
const loadedForm = ref(false)

if (isEdit.value) {
  const receta = computed(() =>
    recetas.value?.find(r => r.id === Number(route.params.id))
  )

  watch(receta, (data) => {
    if (data && !loadedForm.value) {
      loadedForm.value = true
      resetForm({
        values: {
          nombre: data.nombre || '',
          categoria_id: data.categoria_id || null,
          instrucciones: data.instrucciones || '',
          tiempo_preparacion_min: data.tiempo_preparacion_min || null,
          rendimiento_cantidad: data.rendimiento_cantidad || 1,
          rendimiento_unidad_id: data.rendimiento_unidad_id || null,
          activa: data.activa ?? true,
          ingredientes: (data.ingredientes || []).map((ri, i) => ({
            ingrediente_id: ri.ingrediente_id,
            cantidad: ri.cantidad,
            unidad_id: ri.unidad_id,
            es_opcional: ri.es_opcional || false,
            orden: ri.orden || i,
          })),
        },
      })
    }
  }, { immediate: true })
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

const onIngredienteChange = (index, selectedId) => {
  if (!selectedId) return
  const ing = ingredientes.value?.find(i => i.id === Number(selectedId))
  if (ing) {
    setFieldValue(`ingredientes[${index}].unidad_id`, ing.unidad_base_id)
  }
}

const onIngredienteCreate = (index, newIng) => {
  setFieldValue(`ingredientes[${index}].unidad_id`, newIng.unidad_base_id)
}

const onSubmit = handleSubmit(async (formValues) => {
  try {
    if (isEdit.value) {
      await updateMutation.mutateAsync({ id: Number(route.params.id), values: formValues })
      toast.success(t('recetas.updated'))
    } else {
      await createMutation.mutateAsync(formValues)
      toast.success(t('recetas.created'))
    }
    router.push('/panaderia/recetas')
  } catch (err) {
    toast.error(err.message || t('recetas.saveError'))
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
        {{ isEdit ? t('recetas.editTitle') : t('recetas.createTitle') }}
      </h2>
    </div>

    <form @submit="onSubmit" class="max-w-3xl space-y-6">
      <!-- Basic Info -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">{{ t('recetas.formSection') }}</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('recetas.formName') }} *</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('recetas.formCategory') }} *</label>
            <InlineAddSelect
              :model-value="values.categoria_id"
              @update:model-value="setFieldValue('categoria_id', $event)"
              :options="categorias ?? []"
              placeholder="Seleccionar..."
              :create-label="t('recetas.createCategory')"
              :fields="categoriaFields"
              :create-fn="(data) => createCategoriaMutation.mutateAsync(data)"
            />
            <p v-if="errors.categoria_id" class="mt-1 text-sm text-red-600">{{ errors.categoria_id }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('recetas.formInstructions') }}</label>
          <textarea
            :value="values.instrucciones"
            @input="setFieldValue('instrucciones', $event.target.value)"
            rows="3"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('recetas.formTime') }}</label>
            <input
              :value="values.tiempo_preparacion_min"
              @input="setFieldValue('tiempo_preparacion_min', $event.target.value === '' ? null : $event.target.valueAsNumber)"
              type="number"
              min="1"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('recetas.formYield') }} *</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('recetas.formUnit') }} *</label>
            <InlineAddSelect
              :model-value="values.rendimiento_unidad_id"
              @update:model-value="setFieldValue('rendimiento_unidad_id', $event)"
              :options="unidades ?? []"
              :format-option="u => `${u.nombre} (${u.simbolo})`"
              placeholder="Seleccionar..."
              :create-label="t('recetas.createUnit')"
              :fields="unidadFields"
              :create-fn="(data) => createUnidadMutation.mutateAsync(data)"
            />
            <p v-if="errors.rendimiento_unidad_id" class="mt-1 text-sm text-red-600">{{ errors.rendimiento_unidad_id }}</p>
          </div>
        </div>
      </div>

      <!-- Ingredients -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('recetas.formIngredients') }}</h3>
          <button
            type="button"
            @click="addIngrediente"
            class="inline-flex items-center px-3 py-2 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
          >
            <i class="pi pi-plus mr-1"></i>
            {{ t('recetas.formAddIngredient') }}
          </button>
        </div>

        <p v-if="errors.ingredientes" class="text-sm text-red-600">{{ errors.ingredientes }}</p>

        <div v-for="(ing, index) in values.ingredientes" :key="index" class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-400 w-6 mt-2">{{ index + 1 }}</span>

          <div class="flex-1">
            <InlineAddSelect
              :model-value="values.ingredientes[index].ingrediente_id"
              @update:model-value="
                setFieldValue('ingredientes[' + index + '].ingrediente_id', $event);
                onIngredienteChange(index, $event)
              "
              :options="ingredientes ?? []"
              :placeholder="t('recetas.formIngredientPlh')"
              select-class="text-sm"
              :create-label="t('recetas.createIngredient')"
              :fields="ingredientFields"
              :create-fn="(data) => createIngredienteMutation.mutateAsync(data)"
              @create="onIngredienteCreate(index, $event)"
            />
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
              :placeholder="t('recetas.formQtyPlh')"
            />
            <p v-if="errors[`ingredientes[${index}].cantidad`]" class="mt-1 text-sm text-red-600">
              {{ errors[`ingredientes[${index}].cantidad`] }}
            </p>
          </div>

          <div class="w-28">
            <InlineAddSelect
              :model-value="values.ingredientes[index].unidad_id"
              @update:model-value="setFieldValue('ingredientes[' + index + '].unidad_id', $event)"
              :options="unidades ?? []"
              :format-option="u => u.simbolo"
              :placeholder="t('recetas.formUnitPlh')"
              select-class="text-sm"
              :create-label="t('recetas.createUnit')"
              :fields="unidadFields"
              :create-fn="(data) => createUnidadMutation.mutateAsync(data)"
            />
            <p v-if="errors[`ingredientes[${index}].unidad_id`]" class="mt-1 text-sm text-red-600">
              {{ errors[`ingredientes[${index}].unidad_id`] }}
            </p>
          </div>

          <label class="flex items-center gap-1 text-xs text-gray-500 mt-2">
            <input type="checkbox" :checked="values.ingredientes[index].es_opcional" @change="setFieldValue('ingredientes[' + index + '].es_opcional', $event.target.checked)" class="rounded" />
            {{ t('recetas.formOptional') }}
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
          {{ t('recetas.noIngredients') }}
        </div>
      </div>

      <!-- Costo Estimado -->
      <div v-if="isEdit" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">{{ t('recetas.formEstimatedCost') }}</h3>
        <div class="flex items-center gap-4">
          <div class="text-2xl font-bold text-gray-900 tabular-nums">
            $ {{ Number(recetaActual?.costo_estimado || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
          <button
            type="button"
            @click="handleRecalcular"
            :disabled="recalcularCosto.isPending.value"
            class="inline-flex items-center px-3 py-2 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 disabled:opacity-50"
          >
            <i v-if="recalcularCosto.isPending.value" class="pi pi-spin pi-spinner mr-1"></i>
            <i v-else class="pi pi-refresh mr-1"></i>
            {{ t('recetas.formRecalculateCost') }}
          </button>
        </div>
        <p class="text-xs text-gray-400">{{ t('recetas.formCostTooltip') }}</p>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <router-link
          to="/panaderia/recetas"
          class="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          {{ t('crud.cancel') }}
        </router-link>
        <button
          type="submit"
          :disabled="isEdit ? updateMutation.isPending.value : createMutation.isPending.value"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <i v-if="isEdit ? updateMutation.isPending.value : createMutation.isPending.value" class="pi pi-spin pi-spinner mr-2"></i>
          {{ isEdit ? (updateMutation.isPending.value ? t('crud.saving') : t('recetas.updateRecipe')) : (createMutation.isPending.value ? t('crud.saving') : t('recetas.saveRecipe')) }}
        </button>
      </div>
    </form>
  </div>
</template>
