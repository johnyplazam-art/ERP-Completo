<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { formatCurrency } from '@/core/composables/useCurrency'

const queryClient = useQueryClient()
const { t } = useI18n()

const SUSCRIPCIONES_KEY = ['suscripciones']
const PLANES_KEY = ['planes']
const EMPRESAS_KEY = ['admin-empresas-select']

const isSaving = ref(false)
const editando = ref(null)
const searchQuery = ref('')

const form = ref({
  empresa_id: null,
  plan_id: null,
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: null,
  renovacion_automatica: true,
})

// ─── Delete ───────────────────────────────────────────
const showDeleteConfirm = ref(false)
const susAEliminar = ref(null)
const isDeleting = ref(false)

// ─── Queries ──────────────────────────────────────────

const { data: suscripciones, isLoading } = useQuery({
  queryKey: SUSCRIPCIONES_KEY,
  queryFn: () =>
    supabase
      .from('suscripciones')
      .select('*, plan:planes(*), empresa:empresas(nombre, slug, config)')
      .order('created_at', { ascending: false })
      .then(r => { if (r.error) throw r.error; return r.data ?? [] }),
})

const { data: planes } = useQuery({
  queryKey: PLANES_KEY,
  queryFn: () =>
    supabase.from('planes').select('*').order('precio').then(r => r.data ?? []),
})

const { data: empresas } = useQuery({
  queryKey: EMPRESAS_KEY,
  queryFn: () =>
    supabase.from('empresas').select('id, nombre, slug').order('nombre').then(r => r.data ?? []),
})

// ─── Computed ─────────────────────────────────────────

const suscripcionesFiltradas = computed(() => {
  if (!searchQuery.value) return suscripciones.value ?? []
  const q = searchQuery.value.toLowerCase()
  return (suscripciones.value ?? []).filter(s =>
    (s.empresa?.nombre || '').toLowerCase().includes(q) ||
    (s.plan?.nombre || '').toLowerCase().includes(q)
  )
})

const stats = computed(() => {
  const list = suscripciones.value ?? []
  const activas = list.filter(s => s.estado === 'activa')
  const expiradas = list.filter(s => s.estado === 'expirada' || s.estado === 'cancelada')
  const ingresosEst = activas.reduce((sum, s) => {
    const precio = s.plan?.precio ?? 0
    if (s.plan?.periodo === 'mensual') return sum + Number(precio)
    if (s.plan?.periodo === 'anual') return sum + Number(precio) / 12
    if (s.plan?.periodo === 'diario') return sum + Number(precio) * 30
    return sum + Number(precio)
  }, 0)
  return { total: list.length, activas: activas.length, expiradas: expiradas.length, ingresosEst }
})

// ─── Mutations ────────────────────────────────────────

const createSusMutation = useMutation({
  mutationFn: (payload) =>
    supabase.from('suscripciones').insert(payload).then(r => { if (r.error) throw r.error }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: SUSCRIPCIONES_KEY })
    toast.success(t('subscriptions.created'))
  },
})

const updateSusMutation = useMutation({
  mutationFn: ({ id, payload }) =>
    supabase.from('suscripciones').update(payload).eq('id', id).then(r => { if (r.error) throw r.error }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: SUSCRIPCIONES_KEY })
    toast.success(t('subscriptions.updated'))
  },
})

const changeEstadoMutation = useMutation({
  mutationFn: ({ id, estado }) =>
    supabase.from('suscripciones').update({ estado }).eq('id', id).then(r => { if (r.error) throw r.error }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: SUSCRIPCIONES_KEY }),
})

const deleteSusMutation = useMutation({
  mutationFn: (id) =>
    supabase.from('suscripciones').delete().eq('id', id).then(r => { if (r.error) throw r.error }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: SUSCRIPCIONES_KEY })
    toast.success(t('subscriptions.deleted'))
  },
})

// ─── UI Handlers ──────────────────────────────────────

function nuevaSuscripcion() {
  editando.value = 'nueva'
  form.value = {
    empresa_id: null,
    plan_id: null,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: null,
    renovacion_automatica: true,
  }
}

function editarSus(sus) {
  editando.value = sus.id
  form.value = {
    empresa_id: sus.empresa_id,
    plan_id: sus.plan_id,
    fecha_inicio: sus.fecha_inicio?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    fecha_fin: sus.fecha_fin?.split('T')[0] ?? null,
    renovacion_automatica: sus.renovacion_automatica,
  }
}

function cancelar() {
  editando.value = null
}

async function guardar() {
  if (!form.value.empresa_id || !form.value.plan_id) {
    toast.error(t('subscriptions.requiredCompanyPlan'))
    return
  }

  isSaving.value = true
  try {
    const payload = {
      empresa_id: Number(form.value.empresa_id),
      plan_id: Number(form.value.plan_id),
      fecha_inicio: form.value.fecha_inicio || null,
      fecha_fin: form.value.fecha_fin || null,
      renovacion_automatica: form.value.renovacion_automatica,
      estado: 'activa',
    }

    if (editando.value === 'nueva') {
      await createSusMutation.mutateAsync(payload)
    } else {
      await updateSusMutation.mutateAsync({ id: editando.value, payload })
    }

    editando.value = null
  } catch (err) {
    toast.error(err.message || t('subscriptions.saveError'))
  } finally {
    isSaving.value = false
  }
}

function cambiarEstado(sus, nuevoEstado) {
  changeEstadoMutation.mutate(
    { id: sus.id, estado: nuevoEstado },
    { onSuccess: () => toast.success(t('subscriptions.stateChanged', { estado: nuevoEstado })) },
  )
}

function confirmarEliminar(sus) {
  susAEliminar.value = sus
  showDeleteConfirm.value = true
}

async function eliminarSuscripcion() {
  if (!susAEliminar.value) return
  isDeleting.value = true
  try {
    await deleteSusMutation.mutateAsync(susAEliminar.value.id)
    showDeleteConfirm.value = false
    susAEliminar.value = null
  } catch (err) {
    toast.error(err.message || t('subscriptions.deleteError'))
  } finally {
    isDeleting.value = false
  }
}

function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-AR')
}

function formatPrecio(p, currency = 'USD') {
  if (p === 0 || p === '0') return 'Gratis'
  return formatCurrency(p, currency)
}

const estadoClass = (estado) => {
  const map = {
    activa: 'bg-green-100 text-green-800',
    expirada: 'bg-red-100 text-red-800',
    cancelada: 'bg-gray-100 text-gray-500',
    pendiente: 'bg-amber-100 text-amber-800',
  }
  return map[estado] || 'bg-gray-100 text-gray-500'
}

function formatIngresos(n) {
  return formatCurrency(n)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{{ t('subscriptions.title') }}</h2>
        <p class="text-sm text-gray-500 mt-1">{{ t('subscriptions.subtitle') }}</p>
      </div>
      <button
        @click="nuevaSuscripcion"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
      >
        <i class="pi pi-plus mr-2"></i>
        {{ t('subscriptions.newSubscription') }}
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ t('companies.total') }}</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.total }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ t('companies.activeCount') }}</p>
        <p class="text-2xl font-bold text-green-600 mt-1">{{ stats.activas }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ t('subscriptions.expiredCancelled') }}</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.expiradas }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">{{ t('subscriptions.estimatedRevenue') }}</p>
        <p class="text-2xl font-bold text-primary-600 mt-1">{{ formatIngresos(stats.ingresosEst) }}</p>
      </div>
    </div>

    <!-- Search -->
    <div v-if="!isLoading && suscripciones?.length" class="relative mb-4">
      <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('subscriptions.searchPlaceholder')"
        class="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500 w-72"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>{{ t('subscriptions.loading') }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!suscripciones?.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-credit-card text-4xl mb-3"></i>
      <p>{{ t('subscriptions.noSubscriptions') }}</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">{{ t('admin.company') }}</th>
              <th class="px-4 py-3">{{ t('subscriptions.selectPlan') }}</th>
              <th class="px-4 py-3">{{ t('subscriptions.startDate') }}</th>
              <th class="px-4 py-3">{{ t('subscriptions.endDate') }}</th>
              <th class="px-4 py-3">{{ t('subscriptions.autoRenew') }}</th>
              <th class="px-4 py-3">{{ t('subscriptions.autoRenew') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="sus in suscripcionesFiltradas"
              :key="sus.id"
              class="border-t border-gray-100 hover:bg-gray-50"
            >
              <td class="px-4 py-3 font-medium text-gray-900">{{ sus.empresa?.nombre || '—' }}</td>
              <td class="px-4 py-3">
                <span class="text-gray-700">{{ sus.plan?.nombre }}</span>
                <span class="text-xs text-gray-400 ml-1">
                  ({{ formatPrecio(sus.plan?.precio, sus.empresa?.config?.moneda) }}/{{ sus.plan?.periodo }})
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ formatFecha(sus.fecha_inicio) }}</td>
              <td class="px-4 py-3 text-gray-600">{{ formatFecha(sus.fecha_fin) }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="estadoClass(sus.estado)">
                  {{ sus.estado }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600">
                <i :class="sus.renovacion_automatica ? 'pi pi-check text-green-600' : 'pi pi-times text-gray-300'"></i>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    @click="editarSus(sus)"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                    :title="t('common.edit')"
                  >
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button
                    v-if="sus.estado === 'activa'"
                    @click="cambiarEstado(sus, 'cancelada')"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50"
                    :title="t('common.cancel')"
                  >
                    <i class="pi pi-ban"></i>
                  </button>
                  <button
                    v-if="sus.estado === 'cancelada'"
                    @click="cambiarEstado(sus, 'activa')"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"
                    :title="t('admin.reactivate')"
                  >
                    <i class="pi pi-refresh"></i>
                  </button>
                  <button
                    @click="confirmarEliminar(sus)"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    :title="t('common.delete')"
                  >
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="editando !== null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="cancelar"
      >
        <div class="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-lg w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">
            {{ editando === 'nueva' ? t('subscriptions.newSubscription') : t('subscriptions.editSubscription') }}
          </h3>

          <form @submit.prevent="guardar" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.company') }} *</label>
              <select
                v-model="form.empresa_id"
                required
                :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option :value="null" disabled>{{ t('subscriptions.selectCompany') }}</option>
                <option v-for="emp in empresas" :key="emp.id" :value="emp.id">
                  {{ emp.nombre }} ({{ emp.slug }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('subscriptions.selectPlan') }} *</label>
              <select
                v-model="form.plan_id"
                required
                :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option :value="null" disabled>{{ t('subscriptions.selectPlan') }}</option>
                <option v-for="plan in planes" :key="plan.id" :value="plan.id">
                  {{ plan.nombre }} (${{ Number(plan.precio).toLocaleString('es-AR') }}/{{ plan.periodo }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('subscriptions.startDate') }}</label>
                <input
                  v-model="form.fecha_inicio"
                  type="date"
                  :disabled="isSaving"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('subscriptions.endDate') }}</label>
                <input
                  v-model="form.fecha_fin"
                  type="date"
                  :disabled="isSaving"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
                <p class="mt-1 text-xs text-gray-400">{{ t('subscriptions.noExpiry') }}</p>
              </div>
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.renovacion_automatica"
                type="checkbox"
                :disabled="isSaving"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700">{{ t('subscriptions.autoRenewLabel') }}</span>
            </label>

            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                :disabled="isSaving"
                @click="cancelar"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >{{ t('common.cancel') }}</button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <i :class="isSaving ? 'pi pi-spin pi-spinner mr-1' : 'pi pi-check mr-1'"></i>
                {{ isSaving ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4" @click.stop>
          <h3 class="text-lg font-semibold text-gray-900">{{ t('subscriptions.deleteTitle') }}</h3>
          <p class="text-sm text-gray-600">
            {{ t('subscriptions.deleteConfirm', { nombre: susAEliminar?.empresa?.nombre }) }}
          </p>
          <div class="flex justify-end gap-3">
            <button
                @click="showDeleteConfirm = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >{{ t('common.cancel') }}</button>
            <button
              @click="eliminarSuscripcion"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              <i v-if="isDeleting" class="pi pi-spin pi-spinner mr-1"></i>
              {{ t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
