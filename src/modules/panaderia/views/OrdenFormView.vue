<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useProductosQuery, useRecetasQuery, useCreateOrdenMutation, useCalculoIngredientesQuery } from '../composables/queries'
import { getSelectValue } from '@/core/composables/useSelectValue'
import { ordenProduccionCrearSchema } from '../validations/index'

const router = useRouter()

const { data: productos } = useProductosQuery()
const { data: recetas } = useRecetasQuery()
const createMutation = useCreateOrdenMutation()

// Cálculo automático de ingredientes
const detallesValidos = computed(() =>
  values.detalles?.filter(d => d.producto_id && d.receta_id && d.cantidad_programada > 0) || []
)
const { data: ingredientesCalculados, isFetching: calculandoIng } = useCalculoIngredientesQuery(detallesValidos)

// ── Form ──────────────────────────────────────────
const { handleSubmit, values, errors, setFieldValue } = useForm({
  validationSchema: toTypedSchema(ordenProduccionCrearSchema),
  initialValues: {
    fecha_programada: new Date().toISOString().split('T')[0],
    nota: '',
    detalles: [{ producto_id: null, receta_id: null, cantidad_programada: 1, lote: '' }],
  },
})


const addDetalle = () => {
  setFieldValue('detalles', [
    ...values.detalles,
    { producto_id: null, receta_id: null, cantidad_programada: 1, lote: '' },
  ])
}

const removeDetalle = (index) => {
  const next = values.detalles.filter((_, i) => i !== index)
  setFieldValue('detalles', next)
}

const recetasDeProducto = (productoId) => {
  if (!recetas.value || !productoId) return []
  const prod = productos.value?.find(p => p.id === productoId)
  if (prod?.receta_id) {
    return recetas.value.filter(r => r.id === prod.receta_id)
  }
  return recetas.value?.filter(r => r.activa) ?? []
}

const onSubmit = handleSubmit(async (formValues) => {
  try {
    await createMutation.mutateAsync(formValues)
    toast.success('Orden creada exitosamente')
    router.push('/panaderia/produccion')
  } catch (err) {
    toast.error(err.message || 'Error al crear orden')
  }
})
</script>

<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/panaderia/produccion" class="text-gray-400 hover:text-gray-600 mr-3">
        <i class="pi pi-arrow-left text-xl"></i>
      </router-link>
      <h2 class="text-2xl font-bold text-gray-900">Nueva Orden de Producción</h2>
    </div>

    <form @submit="onSubmit" class="max-w-3xl space-y-6">
      <!-- Info -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Información</h3>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha programada *</label>
          <input
            :value="values.fecha_programada"
            @input="setFieldValue('fecha_programada', $event.target.value)"
            type="date"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          />
          <p v-if="errors.fecha_programada" class="mt-1 text-sm text-red-600">{{ errors.fecha_programada }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nota</label>
          <textarea
            :value="values.nota"
            @input="setFieldValue('nota', $event.target.value)"
            rows="2"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            placeholder="Nota opcional..."
          ></textarea>
        </div>
      </div>

      <!-- Detalles -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Productos a producir</h3>
          <button
            type="button"
            @click="addDetalle"
            class="inline-flex items-center px-3 py-2 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
          >
            <i class="pi pi-plus mr-1"></i>
            Agregar
          </button>
        </div>

        <p v-if="errors.detalles" class="text-sm text-red-600">{{ errors.detalles }}</p>

        <div
          v-for="(det, index) in values.detalles"
          :key="index"
          class="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <span class="text-sm text-gray-400 w-6 mt-2">{{ index + 1 }}</span>

          <div class="flex-1">
            <select
              :value="values.detalles[index].producto_id"
              @change="setFieldValue('detalles[' + index + '].producto_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>Producto...</option>
              <option v-for="p in productos?.filter(x => x.activo)" :key="p.id" :value="p.id">
                {{ p.nombre }}
              </option>
            </select>
            <p v-if="errors[`detalles[${index}].producto_id`]" class="mt-1 text-sm text-red-600">
              {{ errors[`detalles[${index}].producto_id`] }}
            </p>
          </div>

          <div class="flex-1">
            <select
              :value="values.detalles[index].receta_id"
              @change="setFieldValue('detalles[' + index + '].receta_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>Receta...</option>
              <option v-for="r in recetasDeProducto(det.producto_id)" :key="r.id" :value="r.id">
                {{ r.nombre }}
              </option>
            </select>
            <p v-if="errors[`detalles[${index}].receta_id`]" class="mt-1 text-sm text-red-600">
              {{ errors[`detalles[${index}].receta_id`] }}
            </p>
          </div>

          <div class="w-24">
            <input
              :value="values.detalles[index].cantidad_programada"
              @input="setFieldValue('detalles[' + index + '].cantidad_programada', $event.target.valueAsNumber)"
              type="number"
              min="1"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm text-center focus:ring-2 focus:ring-primary-500"
            />
            <p v-if="errors[`detalles[${index}].cantidad_programada`]" class="mt-1 text-sm text-red-600">
              {{ errors[`detalles[${index}].cantidad_programada`] }}
            </p>
          </div>

          <button
            type="button"
            @click="removeDetalle(index)"
            class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            :disabled="values.detalles.length <= 1"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>

      <!-- Materia prima calculada -->
      <div
        v-if="detallesValidos.length && ingredientesCalculados?.length"
        class="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Materia prima necesaria</h3>
        <div v-if="calculandoIng" class="text-sm text-gray-400">
          <i class="pi pi-spin pi-spinner mr-1"></i> Calculando...
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 font-medium">
                <th class="pb-2 pr-4">Ingrediente</th>
                <th class="pb-2 text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="ing in ingredientesCalculados" :key="ing.ingrediente_id">
                <td class="py-1.5 pr-4 text-gray-700">{{ ing.nombre }}</td>
                <td class="py-1.5 text-right text-gray-900 font-medium tabular-nums">
                  {{ Number(ing.cantidad_total).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  {{ ing.simbolo_unidad }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <router-link
          to="/panaderia/produccion"
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
          {{ createMutation.isPending.value ? 'Creando...' : 'Crear Orden' }}
        </button>
      </div>
    </form>
  </div>
</template>
