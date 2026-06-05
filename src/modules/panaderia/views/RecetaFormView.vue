<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useForm, useFieldArray } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { recetaSchema } from '../validations/index'
import { useCategoriasRecetaQuery, useUnidadesMedidaQuery, useIngredientesQuery, useRecetasQuery, useCreateRecetaMutation } from '../composables/queries'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const { data: categorias } = useCategoriasRecetaQuery()
const { data: unidades } = useUnidadesMedidaQuery()
const { data: ingredientes } = useIngredientesQuery({ activo: true })
const { data: recetas } = useRecetasQuery()
const createMutation = useCreateRecetaMutation()

const { handleSubmit, values, setFieldValue, resetForm, errors } = useForm({
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

const { push, remove, fields } = useFieldArray('ingredientes')

const addIngrediente = () => {
  push({
    ingrediente_id: null,
    cantidad: 0,
    unidad_id: null,
    es_opcional: false,
    orden: fields.value.length,
  })
}

const onSubmit = handleSubmit(async (formValues) => {
  try {
    await createMutation.mutateAsync(formValues)
    toast.success('Receta creada exitosamente')
    router.push('/panaderia/recetas')
  } catch (err) {
    toast.error(err.message || 'Error al crear receta')
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
              v-model="values.nombre"
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
              v-model="values.categoria_id"
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
            v-model="values.instrucciones"
            rows="3"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tiempo (min)</label>
            <input
              v-model.number="values.tiempo_preparacion_min"
              type="number"
              min="1"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rendimiento *</label>
            <input
              v-model.number="values.rendimiento_cantidad"
              type="number"
              min="0.01"
              step="0.01"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
            <select
              v-model="values.rendimiento_unidad_id"
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

        <div v-for="(field, index) in fields" :key="field.key" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-400 w-6">{{ index + 1 }}</span>

          <div class="flex-1">
            <select
              v-model="field.value.ingrediente_id"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
              @change="
                const ing = ingredientes?.find(i => i.id === Number($event.target.value));
                if (ing) {
                  setFieldValue(`ingredientes.${index}.unidad_id`, ing.unidad_base_id);
                }
              "
            >
              <option :value="null" disabled>Ingrediente...</option>
              <option v-for="ing in ingredientes" :key="ing.id" :value="ing.id">
                {{ ing.nombre }}
              </option>
            </select>
          </div>

          <div class="w-24">
            <input
              v-model.number="field.value.cantidad"
              type="number"
              min="0.01"
              step="0.01"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm text-center focus:ring-2 focus:ring-primary-500"
              placeholder="Cant."
            />
          </div>

          <div class="w-28">
            <select
              v-model="field.value.unidad_id"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>Unidad</option>
              <option v-for="u in unidades" :key="u.id" :value="u.id">
                {{ u.simbolo }}
              </option>
            </select>
          </div>

          <label class="flex items-center gap-1 text-xs text-gray-500">
            <input type="checkbox" v-model="field.value.es_opcional" class="rounded" />
            Opc.
          </label>

          <button
            type="button"
            @click="remove(index)"
            class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>

        <div v-if="!fields.length" class="text-center py-6 text-gray-400 text-sm">
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
          :disabled="createMutation.isPending.value"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <i v-if="createMutation.isPending.value" class="pi pi-spin pi-spinner mr-2"></i>
          {{ createMutation.isPending.value ? 'Guardando...' : 'Guardar Receta' }}
        </button>
      </div>
    </form>
  </div>
</template>
