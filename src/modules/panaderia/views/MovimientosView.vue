<script setup>
import { ref, computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import DataState from '@/core/components/DataState.vue'
import {
  useMovimientosMpPaginated,
  useMovimientosPtPaginated,
} from '../composables/queries'
import {
  crearMovimientoMp,
  crearMovimientoPt,
  fetchPrecioIngrediente,
  fetchPrecioCostoProducto,
} from '../composables/database'
import PaginatorBar from '../components/PaginatorBar.vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const authStore = useAuthStore()
const empresaId = computed(() => authStore.currentEmpresaId)

const activeTab = ref('mp')
const showModal = ref(false)
const submitPending = ref(false)

// ─── Filters ──────────────────────────────────────────

const filterIngredienteId = ref(null)
const filterProductoId = ref(null)
const filterTipo = ref('')

const ingredientes = ref([])
const productos = ref([])

async function loadAuxData() {
  const [ingRes, prodRes] = await Promise.all([
    supabase.from('ingredientes').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre').eq('activo', true).order('nombre'),
  ])
  if (!ingRes.error) ingredientes.value = ingRes.data
  if (!prodRes.error) productos.value = prodRes.data
}
loadAuxData()

// ─── Queries ──────────────────────────────────────────

const {
  data: movimientosMp,
  isLoading: mpLoading,
  error: mpError,
  page: mpPage,
  total: mpTotal,
  setPage: setMpPage,
} = useMovimientosMpPaginated(filterIngredienteId.value ?? undefined)

const {
  data: movimientosPt,
  isLoading: ptLoading,
  error: ptError,
  page: ptPage,
  total: ptTotal,
  setPage: setPtPage,
} = useMovimientosPtPaginated(filterProductoId.value ?? undefined)

const filteredMp = computed(() => {
  if (!movimientosMp.value) return []
  let list = movimientosMp.value
  if (filterTipo.value) list = list.filter(m => m.tipo === filterTipo.value)
  return list
})

const filteredPt = computed(() => {
  if (!movimientosPt.value) return []
  let list = movimientosPt.value
  if (filterTipo.value) list = list.filter(m => m.tipo === filterTipo.value)
  return list
})

// ─── Create modal ─────────────────────────────────────

const newForm = ref({
  tipo: 'ingreso',
  cantidad: '',
  nota: '',
  ingrediente_id: null,
  producto_id: null,
  precio_unitario: 0,
})

async function abrirNuevo() {
  newForm.value = {
    tipo: 'ingreso',
    cantidad: '',
    nota: '',
    ingrediente_id: null,
    producto_id: null,
    precio_unitario: 0,
    unidad_id: null,
  }
  showModal.value = true
}

async function onIngredienteSelected() {
  if (!newForm.value.ingrediente_id) return
  const precio = await fetchPrecioIngrediente(newForm.value.ingrediente_id)
  newForm.value.precio_unitario = precio
}

async function onProductoSelected() {
  if (!newForm.value.producto_id) return
  const precioCosto = await fetchPrecioCostoProducto(newForm.value.producto_id)
  newForm.value.precio_unitario = precioCosto
}

async function guardarMovimiento() {
  submitPending.value = true
  try {
    if (activeTab.value === 'mp') {
      let unidadId = newForm.value.unidad_id
      if (!unidadId && newForm.value.ingrediente_id) {
        const { data: ing } = await supabase
          .from('ingredientes')
          .select('unidad_base_id')
          .eq('id', newForm.value.ingrediente_id)
          .single()
        unidadId = ing?.unidad_base_id
      }
      await crearMovimientoMp({
        ...newForm.value,
        cantidad: Number(newForm.value.cantidad),
        precio_unitario: Number(newForm.value.precio_unitario || 0),
        unidad_id: unidadId,
        empresa_id: empresaId.value,
        creado_por: authStore.user?.id,
      })
    } else {
      await crearMovimientoPt({
        producto_id: Number(newForm.value.producto_id),
        tipo: newForm.value.tipo,
        cantidad: Number(newForm.value.cantidad),
        precio_unitario: Number(newForm.value.precio_unitario || 0),
        nota: newForm.value.nota || '',
        empresa_id: empresaId.value,
        creado_por: authStore.user?.id,
      })
    }
    toast.success('Movimiento registrado')
    showModal.value = false
    queryClient.invalidateQueries({ queryKey: ['movimientos_mp'] })
    queryClient.invalidateQueries({ queryKey: ['movimientos_pt'] })
  } catch (err) {
    toast.error(err.message || 'Error al guardar')
  } finally {
    submitPending.value = false
  }
}

// ─── Helpers ──────────────────────────────────────────

const tipoClass = (tipo) => {
  const map = { ingreso: 'text-green-700 bg-green-100', egreso: 'text-red-700 bg-red-100', ajuste: 'text-blue-700 bg-blue-100', merma: 'text-yellow-700 bg-yellow-100' }
  return map[tipo] || 'text-gray-700 bg-gray-100'
}

const formatCantidad = (val, unit) => {
  const num = Number(val)
  if (num >= 0) return `+${num.toFixed(2)} ${unit ?? ''}`
  return `${num.toFixed(2)} ${unit ?? ''}`
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">{{ t('movimientos.title') }}</h2>
      <button
        @click="abrirNuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        {{ t('movimientos.modalTitle') }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-4 border-b border-gray-200">
      <button
        v-for="tab in [{ key: 'mp', label: 'Materia Prima' }, { key: 'pt', label: 'Producto Terminado' }]"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
        :class="activeTab === tab.key ? 'text-primary-700 bg-white border-x border-t border-gray-200 -mb-px' : 'text-gray-500 hover:text-gray-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <select
        v-if="activeTab === 'mp'"
        v-model="filterIngredienteId"
        class="touch-input rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 text-sm"
      >
        <option :value="null">{{ t('movimientos.filterAllIngredients') }}</option>
        <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
      </select>
      <select
        v-if="activeTab === 'pt'"
        v-model="filterProductoId"
        class="touch-input rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 text-sm"
      >
        <option :value="null">{{ t('movimientos.filterAllProducts') }}</option>
        <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
      </select>
      <select
        v-model="filterTipo"
        class="touch-input rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 text-sm"
      >
        <option value="">{{ t('movimientos.filterAllTypes') }}</option>
        <option value="ingreso">{{ t('movimientos.labelIngreso') }}</option>
        <option value="egreso">{{ t('movimientos.labelEgreso') }}</option>
        <option value="ajuste">{{ t('movimientos.labelAjuste') }}</option>
        <option value="merma">{{ t('movimientos.labelMerma') }}</option>
      </select>
    </div>

    <!-- MP Table -->
    <DataState
      v-if="activeTab === 'mp'"
      :loading="mpLoading"
      :error="mpError"
      :empty="!filteredMp.length"
      empty-icon="pi pi-warehouse"
      empty-text="Sin movimientos de materia prima"
    >
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-gray-500 font-medium">
                <th class="px-4 py-3">{{ t('movimientos.date') }}</th>
                <th class="px-4 py-3">{{ t('movimientos.ingredient') }}</th>
                <th class="px-4 py-3">{{ t('movimientos.type') }}</th>
                <th class="px-4 py-3">{{ t('movimientos.quantity') }}</th>
                <th class="px-4 py-3">{{ t('movimientos.unit') }}</th>
                <th class="px-4 py-3 text-right">{{ t('movimientos.price') }}</th>
                <th class="px-4 py-3 text-right">{{ t('movimientos.value') }}</th>
                <th class="px-4 py-3">{{ t('movimientos.note') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="m in filteredMp" :key="m.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {{ new Date(m.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) }}
                </td>
                <td class="px-4 py-3 font-medium text-gray-900">{{ m.ingrediente?.nombre || '-' }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full capitalize" :class="tipoClass(m.tipo)">{{ m.tipo }}</span>
                </td>
                <td class="px-4 py-3 tabular-nums font-mono text-sm" :class="Number(m.cantidad) >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ formatCantidad(m.cantidad, '') }}
                </td>
                <td class="px-4 py-3 text-gray-500">{{ m.unidad?.simbolo || '-' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-600">
                  {{ m.precio_unitario ? `$${Number(m.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-' }}
                </td>
                <td class="px-4 py-3 text-right tabular-nums font-medium text-gray-800">
                  {{ m.precio_unitario ? `$${(Math.abs(Number(m.cantidad)) * Number(m.precio_unitario)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-' }}
                </td>
                <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate">{{ m.nota || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      <PaginatorBar
        v-if="mpTotal > 0"
        :page="mpPage"
        :page-size="25"
        :total="mpTotal"
        @update:page="setMpPage"
      />
      </div>
    </DataState>

    <!-- PT Table -->
    <DataState
      v-if="activeTab === 'pt'"
      :loading="ptLoading"
      :error="ptError"
      :empty="!filteredPt.length"
      empty-icon="pi pi-warehouse"
      empty-text="Sin movimientos de producto terminado"
      ></DataState>

    <!-- PT table (inline) -->
    <div
      v-if="activeTab === 'pt' && !ptLoading && !ptError && filteredPt.length"
      class="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">{{ t('movimientos.date') }}</th>
              <th class="px-4 py-3">{{ t('movimientos.product') }}</th>
              <th class="px-4 py-3">{{ t('movimientos.type') }}</th>
              <th class="px-4 py-3">{{ t('movimientos.quantity') }}</th>
              <th class="px-4 py-3 text-right">{{ t('movimientos.price') }}</th>
              <th class="px-4 py-3 text-right">{{ t('movimientos.value') }}</th>
              <th class="px-4 py-3">{{ t('movimientos.note') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="m in filteredPt" :key="m.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ new Date(m.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) }}
              </td>
              <td class="px-4 py-3 font-medium text-gray-900">{{ m.producto?.nombre || '-' }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs font-medium rounded-full capitalize" :class="tipoClass(m.tipo)">{{ m.tipo }}</span>
              </td>
              <td class="px-4 py-3 tabular-nums font-mono text-sm" :class="Number(m.cantidad) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCantidad(m.cantidad, '') }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-gray-600">
                {{ m.precio_unitario ? `$${Number(m.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-' }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums font-medium text-gray-800">
                {{ m.precio_unitario ? `$${(Math.abs(Number(m.cantidad)) * Number(m.precio_unitario)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-' }}
              </td>
              <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate">{{ m.nota || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginatorBar
        v-if="ptTotal > 0"
        :page="ptPage"
        :page-size="25"
        :total="ptTotal"
        @update:page="setPtPage"
      />
    </div>

    <!-- New Movement Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('movimientos.modalTitle') }}</h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="guardarMovimiento" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('movimientos.type') }} <span class="text-red-500">*</span></label>
            <select
              v-model="newForm.tipo"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="ingreso">{{ t('movimientos.labelIngreso') }}</option>
              <option value="egreso">{{ t('movimientos.labelEgreso') }}</option>
              <option value="ajuste">{{ t('movimientos.labelAjuste') }}</option>
              <option value="merma">{{ t('movimientos.labelMerma') }}</option>
            </select>
          </div>

          <div v-if="activeTab === 'mp'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('movimientos.ingredient') }} <span class="text-red-500">*</span></label>
            <select
              v-model="newForm.ingrediente_id"
              @change="onIngredienteSelected"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>{{ t('movimientos.selectIngredient') }}</option>
              <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
            </select>
          </div>

          <div v-if="activeTab === 'pt'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('movimientos.product') }} <span class="text-red-500">*</span></label>
            <select
              v-model="newForm.producto_id"
              @change="onProductoSelected"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>{{ t('movimientos.selectProduct') }}</option>
              <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('movimientos.quantity') }} <span class="text-red-500">*</span></label>
            <input
              v-model.number="newForm.cantidad"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('movimientos.unitPrice') }}</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                v-model.number="newForm.precio_unitario"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 pl-8 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('movimientos.note') }}</label>
            <input
              v-model="newForm.nota"
              type="text"
              placeholder="Opcional"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="submitPending"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <i v-if="submitPending" class="pi pi-spin pi-spinner mr-2"></i>
              {{ submitPending ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
