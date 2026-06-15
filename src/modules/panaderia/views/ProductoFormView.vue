<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { productoSchema } from '../validations/index'
import { getSelectValue } from '@/core/composables/useSelectValue'
import {
  useCategoriasProductoQuery,
  useProductosQuery,
  useRecetasQuery,
  useCreateProductoMutation,
  useUpdateProductoMutation,
} from '../composables/queries'
import { calcularCostoProducto } from '../composables/database'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const { data: categorias } = useCategoriasProductoQuery()
const { data: productos } = useProductosQuery()
const { data: recetas } = useRecetasQuery()
const createMutation = useCreateProductoMutation()
const updateMutation = useUpdateProductoMutation()

const { handleSubmit, values, resetForm, errors, setFieldValue } = useForm({
  validationSchema: toTypedSchema(productoSchema),
  initialValues: {
    nombre: '',
    descripcion: '',
    categoria_id: null,
    receta_id: null,
    precio_venta: 0,
    peso_unitario_gr: null,
    codigo_barras: '',
    activo: true,
  },
})



// Cargar datos existentes en modo edición
if (isEdit.value) {
  const producto = computed(() =>
    productos.value?.find(p => p.id === Number(route.params.id))
  )

  watchEffect(() => {
    const data = producto.value
    if (data) {
      resetForm({
        values: {
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          categoria_id: data.categoria_id,
          receta_id: data.receta_id ?? null,
          precio_venta: data.precio_venta ?? 0,
          peso_unitario_gr: data.peso_unitario_gr ?? null,
          codigo_barras: data.codigo_barras || '',
          activo: data.activo ?? true,
        },
      })
    }
  })
}

const recetaSeleccionada = computed(() =>
  recetas.value?.find(r => r.id === values.receta_id)
)

const precioCostoCalculado = computed(() => {
  if (!values.receta_id || !values.peso_unitario_gr) return 0
  return calcularCostoProducto(recetaSeleccionada.value, { peso_unitario_gr: values.peso_unitario_gr })
})

watch([precioCostoCalculado, () => values.precio_venta], ([costo, venta]) => {
  if (costo > 0 && (!venta || venta === 0)) {
    setFieldValue('precio_venta', Number((costo * 1.3).toFixed(2)))
  }
})

const onSubmit = handleSubmit(async (formValues) => {
  try {
    if (isEdit.value) {
      await updateMutation.mutateAsync({ id: Number(route.params.id), values: formValues })
      toast.success('Producto actualizado exitosamente')
    } else {
      await createMutation.mutateAsync(formValues)
      toast.success('Producto creado exitosamente')
    }
    router.push('/panaderia/productos')
  } catch (err) {
    toast.error(err.message || 'Error al guardar producto')
  }
})
</script>

<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/panaderia/productos" class="text-gray-400 hover:text-gray-600 mr-3">
        <i class="pi pi-arrow-left text-xl"></i>
      </router-link>
      <h2 class="text-2xl font-bold text-gray-900">
        {{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            :value="values.descripcion"
            @input="setFieldValue('descripcion', $event.target.value)"
            rows="2"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            placeholder="Descripción opcional..."
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Receta asociada</label>
            <select
              :value="values.receta_id"
              @change="setFieldValue('receta_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null">Sin receta</option>
              <option v-for="r in recetas?.filter(x => x.activa)" :key="r.id" :value="r.id">
                {{ r.nombre }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
            <input
              :value="values.codigo_barras"
              @input="setFieldValue('codigo_barras', $event.target.value)"
              type="text"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="779..."
            />
          </div>
        </div>
      </div>

      <!-- Pricing & Weight -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Precio y Peso</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                :value="values.precio_venta"
                @input="setFieldValue('precio_venta', $event.target.valueAsNumber)"
                type="number"
                min="0"
                step="0.01"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 pl-8 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <p v-if="errors.precio_venta" class="mt-1 text-sm text-red-600">{{ errors.precio_venta }}</p>
          </div>

          <div v-if="values.receta_id && values.peso_unitario_gr">
            <label class="block text-sm font-medium text-gray-700 mb-1">Precio de costo</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                :value="precioCostoCalculado"
                type="number"
                disabled
                class="touch-input block w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-500 pl-8 focus:ring-0 cursor-not-allowed"
              />
            </div>
            <p class="mt-1 text-xs text-gray-400">Calculado desde costo de receta</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Peso unitario (gramos)</label>
            <input
              :value="values.peso_unitario_gr"
              @input="setFieldValue('peso_unitario_gr', $event.target.value === '' ? null : $event.target.valueAsNumber)"
              type="number"
              min="0"
              step="1"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
              placeholder="500"
            />
            <p v-if="errors.peso_unitario_gr" class="mt-1 text-sm text-red-600">{{ errors.peso_unitario_gr }}</p>
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
          to="/panaderia/productos"
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
          {{ createMutation.isPending.value || updateMutation.isPending.value ? 'Guardando...' : 'Guardar Producto' }}
        </button>
      </div>
    </form>
  </div>
</template>
