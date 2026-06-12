<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/core/store/auth'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import DataState from '@/core/components/DataState.vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useMutation } from '@tanstack/vue-query'
import {
  fetchMovimientosMp,
  crearMovimientoMp,
} from '../composables/database'

const authStore = useAuthStore()
const queryClient = useQueryClient()
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

const mpQueryKey = computed(() => ['movimientos_mp_mini', filterIngredienteId.value, filterTipo.value])
const ptQueryKey = computed(() => ['movimientos_pt_mini', filterProductoId.value, filterTipo.value])

const { data: movimientosMp, isLoading: mpLoading, error: mpError } = useQuery({
  queryKey: mpQueryKey,
  queryFn: () => fetchMovimientosMp(filterIngredienteId.value ?? undefined),
})

const { data: movimientosPt, isLoading: ptLoading, error: ptError } = useQuery({
  queryKey: ptQueryKey,
  queryFn: () => {
    let query = supabase
      .from('movimientos_inventario_pt')
      .select(`*, producto:producto_id(nombre)`)
      .order('fecha', { ascending: false })
      .limit(50)
    if (filterProductoId.value) query = query.eq('producto_id', filterProductoId.value)
    if (filterTipo.value) query = query.eq('tipo', filterTipo.value)
    return query.then(r => { if (r.error) throw r.error; return r.data })
  },
})

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
})

function abrirNuevo() {
  newForm.value = {
    tipo: 'ingreso',
    cantidad: '',
    nota: '',
    ingrediente_id: null,
    producto_id: null,
    unidad_id: null,
  }
  showModal.value = true
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
        unidad_id: unidadId,
        empresa_id: empresaId.value,
        creado_por: authStore.user?.id,
      })
    } else {
      const { data } = await supabase.from('movimientos_inventario_pt').insert({
        producto_id: Number(newForm.value.producto_id),
        tipo: newForm.value.tipo,
        cantidad: Number(newForm.value.cantidad),
        nota: newForm.value.nota || '',
        empresa_id: empresaId.value,
        creado_por: authStore.user?.id,
      }).select().single()
      if (!data) throw new Error('Error al crear movimiento')
    }
    toast.success('Movimiento registrado')
    showModal.value = false
    queryClient.invalidateQueries({ queryKey: ['movimientos_mp_mini'] })
    queryClient.invalidateQueries({ queryKey: ['movimientos_pt_mini'] })
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
      <h2 class="text-2xl font-bold text-gray-900">Movimientos de Inventario</h2>
      <button
        @click="abrirNuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo Movimiento
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
        <option :value="null">Todos los ingredientes</option>
        <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
      </select>
      <select
        v-if="activeTab === 'pt'"
        v-model="filterProductoId"
        class="touch-input rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 text-sm"
      >
        <option :value="null">Todos los productos</option>
        <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
      </select>
      <select
        v-model="filterTipo"
        class="touch-input rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 text-sm"
      >
        <option value="">Todos los tipos</option>
        <option value="ingreso">Ingreso</option>
        <option value="egreso">Egreso</option>
        <option value="ajuste">Ajuste</option>
        <option value="merma">Merma</option>
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
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Ingrediente</th>
                <th class="px-4 py-3">Tipo</th>
                <th class="px-4 py-3">Cantidad</th>
                <th class="px-4 py-3">Unidad</th>
                <th class="px-4 py-3">Nota</th>
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
                <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate">{{ m.nota || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Producto</th>
              <th class="px-4 py-3">Tipo</th>
              <th class="px-4 py-3">Cantidad</th>
              <th class="px-4 py-3">Nota</th>
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
              <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate">{{ m.nota || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Movement Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Nuevo Movimiento</h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="guardarMovimiento" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo <span class="text-red-500">*</span></label>
            <select
              v-model="newForm.tipo"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="ajuste">Ajuste</option>
              <option value="merma">Merma</option>
            </select>
          </div>

          <div v-if="activeTab === 'mp'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Ingrediente <span class="text-red-500">*</span></label>
            <select
              v-model="newForm.ingrediente_id"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>Seleccionar ingrediente...</option>
              <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
            </select>
          </div>

          <div v-if="activeTab === 'pt'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Producto <span class="text-red-500">*</span></label>
            <select
              v-model="newForm.producto_id"
              required
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>Seleccionar producto...</option>
              <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad <span class="text-red-500">*</span></label>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Nota</label>
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
