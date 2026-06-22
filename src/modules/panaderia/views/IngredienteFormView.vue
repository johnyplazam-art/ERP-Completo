<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'
import { supabase } from '@/core/supabase'
import { ingredienteSchema } from '../validations/index'
import { getSelectValue } from '@/core/composables/useSelectValue'
import {
  useCategoriasIngredienteQuery,
  useUnidadesMedidaQuery,
  useIngredienteQuery,
  useProveedoresByIngredienteQuery,
  useCreateIngredienteMutation,
  useUpdateIngredienteMutation,
} from '../composables/queries'
import {
  createIngredienteProveedor,
  updateIngredienteProveedor,
  deleteIngredienteProveedor,
} from '../composables/database'
import { useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const { data: categorias } = useCategoriasIngredienteQuery()
const { data: unidades } = useUnidadesMedidaQuery()
const { data: ingrediente, isLoading: loadingIngrediente } = useIngredienteQuery(
  isEdit.value ? Number(route.params.id) : null
)
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

// ─── Proveedores / Precios ────────────────────────────

const { data: proveedoresIng, isLoading: loadingProv } = useProveedoresByIngredienteQuery(
  isEdit.value ? Number(route.params.id) : null
)
const provExpanded = ref(false)
const confirm = useConfirm()
const showProvModal = ref(false)
const editingProvItem = ref(null)
const provFormData = ref({})
const provSubmitPending = ref(false)
const proveedoresDisponibles = ref([])

function toggleProveedores() {
  provExpanded.value = !provExpanded.value
}

async function abrirAgregarProveedor() {
  editingProvItem.value = null
  provFormData.value = { proveedor_id: '', precio_actual: '', plazo_entrega_dias: '', es_preferido: false }

  const existingIds = new Set(
    proveedoresIng.value?.map(p => p.proveedor_id) ?? []
  )
  const { data: todos } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('activo', true)
  proveedoresDisponibles.value = (todos ?? []).filter(p => !existingIds.has(p.id))

  showProvModal.value = true
}

function abrirEditarProveedor(item) {
  editingProvItem.value = item
  provFormData.value = {
    precio_actual: item.precio_actual,
    plazo_entrega_dias: item.plazo_entrega_dias ?? '',
    es_preferido: item.es_preferido ?? false,
  }
  proveedoresDisponibles.value = []
  showProvModal.value = true
}

async function guardarProveedor() {
  provSubmitPending.value = true
  try {
    if (editingProvItem.value) {
      await updateIngredienteProveedor(editingProvItem.value.id, provFormData.value)
      toast.success('Precio actualizado')
    } else {
      await createIngredienteProveedor({
        ...provFormData.value,
        ingrediente_id: Number(route.params.id),
      })
      toast.success('Proveedor agregado')
    }
    showProvModal.value = false
    refetchProveedores()
  } catch (err) {
    toast.error(err.message || 'Error al guardar')
  } finally {
    provSubmitPending.value = false
  }
}

function confirmarEliminarProveedor(item) {
  confirm.require({
    message: `¿Quitar "${item.proveedor?.nombre}" de este ingrediente?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Quitar',
    accept: async () => {
      try {
        await deleteIngredienteProveedor(item.id)
        toast.success('Proveedor quitado')
        refetchProveedores()
      } catch (err) {
        toast.error(err.message || 'Error al eliminar')
      }
    },
  })
}

const queryClient = useQueryClient()
function refetchProveedores() {
  queryClient.invalidateQueries({ queryKey: ['proveedores_ingrediente'] })
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

    <div v-if="isEdit && loadingIngrediente" class="max-w-3xl">
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div class="animate-pulse space-y-4">
          <div class="h-4 bg-gray-200 rounded w-1/3"></div>
          <div class="h-10 bg-gray-200 rounded"></div>
          <div class="h-10 bg-gray-200 rounded"></div>
          <div class="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>

    <form v-else @submit="onSubmit" class="max-w-3xl space-y-6">
      <!-- Basic Info -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">{{ t('inventario.formSectionGeneral') }}</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.formName') }} *</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.formCategory') }} *</label>
            <select
              :value="values.categoria_id"
              @change="setFieldValue('categoria_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>{{ t('crud.selectOption') }}</option>
              <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
                {{ cat.nombre }}
              </option>
            </select>
            <p v-if="errors.categoria_id" class="mt-1 text-sm text-red-600">{{ errors.categoria_id }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.formBaseUnit') }} *</label>
            <select
              :value="values.unidad_base_id"
              @change="setFieldValue('unidad_base_id', getSelectValue($event))"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null" disabled>{{ t('crud.selectOption') }}</option>
              <option v-for="u in unidades" :key="u.id" :value="u.id">
                {{ u.nombre }} ({{ u.simbolo }})
              </option>
            </select>
            <p v-if="errors.unidad_base_id" class="mt-1 text-sm text-red-600">{{ errors.unidad_base_id }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.formMinStock') }}</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.formLocation') }}</label>
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
        <h3 class="text-lg font-semibold text-gray-900">{{ t('inventario.formStorage') }}</h3>

        <div class="flex items-center gap-2 mb-4">
          <input
            id="perecedero"
            type="checkbox"
            :checked="values.perecedero"
            @change="setFieldValue('perecedero', $event.target.checked)"
            class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label for="perecedero" class="text-sm font-medium text-gray-700">{{ t('inventario.formPerishable') }}</label>
        </div>

        <div v-if="values.perecedero" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.formShelfLife') }}</label>
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
          <label for="activo" class="text-sm font-medium text-gray-700">{{ t('inventario.formActive') }}</label>
        </div>
      </div>

      <!-- Proveedores y Precios -->
      <div v-if="isEdit" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          @click="toggleProveedores"
          class="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors text-left"
        >
          <h3 class="text-lg font-semibold text-gray-900">{{ t('inventario.formSuppliers') }}</h3>
          <i
            class="pi text-gray-400 transition-transform duration-200"
            :class="provExpanded ? 'pi-chevron-up' : 'pi-chevron-down'"
          ></i>
        </button>

        <div v-if="provExpanded" class="px-6 pb-6 border-t border-gray-100 pt-4">
          <div v-if="loadingProv" class="animate-pulse space-y-3">
            <div class="h-8 bg-gray-200 rounded"></div>
            <div class="h-8 bg-gray-200 rounded"></div>
          </div>

          <div v-else-if="!proveedoresIng?.length" class="text-sm text-gray-400 text-center py-4">
            Sin proveedores asociados
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="item in proveedoresIng"
              :key="item.id"
              class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="min-w-0 flex-1">
                <span class="text-sm font-medium text-gray-900">{{ item.proveedor?.nombre }}</span>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-sm text-gray-500 tabular-nums">
                    ${{ Number(item.precio_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
                  </span>
                  <span v-if="item.es_preferido" class="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                    Preferido
                  </span>
                  <span v-if="item.plazo_entrega_dias" class="text-xs text-gray-400">
                    {{ item.plazo_entrega_dias }} días
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 ml-3">
                <button
                  type="button"
                  @click="abrirEditarProveedor(item)"
                  class="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >{{ t('inventario.edit') }}</button>
                <button
                  type="button"
                  @click="confirmarEliminarProveedor(item)"
                  class="text-xs text-red-500 hover:text-red-700 font-medium"
                >{{ t('proveedores.remove') }}</button>
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="abrirAgregarProveedor"
            class="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1"
          >
            <i class="pi pi-plus text-xs"></i>
            Agregar proveedor
          </button>
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

    <!-- Modal Proveedores -->
    <div
      v-if="showProvModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showProvModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ editingProvItem ? 'Editar precio' : 'Agregar proveedor' }}
          </h3>
          <button @click="showProvModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="guardarProveedor" class="space-y-4">
          <div v-if="!editingProvItem">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.supplier') }} <span class="text-red-500">*</span></label>
            <select
              v-model="provFormData.proveedor_id"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>{{ t('inventario.selectSupplier') }}</option>
              <option v-for="p in proveedoresDisponibles" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.currentPrice') }} <span class="text-red-500">*</span></label>
            <input
              v-model.number="provFormData.precio_actual"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('inventario.deliveryTime') }}</label>
            <input
              v-model.number="provFormData.plazo_entrega_dias"
              type="number"
              min="0"
              placeholder="0"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              v-model="provFormData.es_preferido"
              type="checkbox"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Proveedor preferido para este ingrediente
          </label>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showProvModal = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="provSubmitPending"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <i v-if="provSubmitPending" class="pi pi-spin pi-spinner mr-2"></i>
              {{ provSubmitPending ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <ConfirmDialog />
  </Teleport>
</template>
