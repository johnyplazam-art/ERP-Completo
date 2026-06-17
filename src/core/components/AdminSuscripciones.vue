<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'

const { t } = useI18n()
const confirm = useConfirm()

const suscripciones = ref([])
const planes = ref([])
const empresas = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const editando = ref(null)

const form = ref({
  empresa_id: null,
  plan_id: null,
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: null,
  renovacion_automatica: true,
})

const suscripcionesFiltradas = computed(() => suscripciones.value)

async function cargarDatos() {
  isLoading.value = true
  try {
    const [suscRes, planesRes, empRes] = await Promise.all([
      supabase
        .from('suscripciones')
        .select('*, plan:planes(*), empresa:empresas(nombre, slug)')
        .order('created_at', { ascending: false }),
      supabase.from('planes').select('*').order('precio'),
      supabase.from('empresas').select('id, nombre, slug').order('nombre'),
    ])
    suscripciones.value = suscRes.data ?? []
    planes.value = planesRes.data ?? []
    empresas.value = empRes.data ?? []
  } catch (err) {
    console.error('[admin-suscripciones] Error:', err)
    toast.error(t('errors.loadData'))
  } finally {
    isLoading.value = false
  }
}

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
    toast.error('Empresa y plan son obligatorios')
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
      const { error } = await supabase.from('suscripciones').insert(payload)
      if (error) throw error
      toast.success('Suscripción creada')
    } else {
      const { error } = await supabase
        .from('suscripciones')
        .update(payload)
        .eq('id', editando.value)
      if (error) throw error
      toast.success('Suscripción actualizada')
    }

    editando.value = null
    await cargarDatos()
  } catch (err) {
    toast.error(err.message || 'Error al guardar suscripción')
  } finally {
    isSaving.value = false
  }
}

async function cambiarEstado(sus, nuevoEstado) {
  try {
    await supabase
      .from('suscripciones')
      .update({ estado: nuevoEstado })
      .eq('id', sus.id)

    if (nuevoEstado === 'cancelada') {
      // Opcional: reactivar usuarios y empresa al cancelar?
    }

    toast.success(`Suscripción ${nuevoEstado}`)
    await cargarDatos()
  } catch (err) {
    toast.error(err.message || 'Error al cambiar estado')
  }
}

function confirmarCancelar(sus) {
  confirm.require({
    message: `¿Cancelar la suscripción de "${sus.empresa?.nombre}"? Los usuarios perderán acceso.`,
    header: 'Cancelar suscripción',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: t('common.cancel'),
    acceptLabel: 'Cancelar suscripción',
    acceptClass: 'p-button-danger',
    accept: () => cambiarEstado(sus, 'cancelada'),
  })
}

function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-AR')
}

function formatPrecio(p) {
  if (p === 0 || p === '0') return 'Gratis'
  return Number(p).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
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

onMounted(cargarDatos)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Suscripciones</h2>
        <p class="text-sm text-gray-500 mt-1">Gestioná las suscripciones de cada empresa</p>
      </div>
      <button
        @click="nuevaSuscripcion"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nueva Suscripción
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="!suscripciones.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-credit-card text-4xl mb-3"></i>
      <p>No hay suscripciones registradas</p>
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">Empresa</th>
              <th class="px-4 py-3">Plan</th>
              <th class="px-4 py-3">Inicio</th>
              <th class="px-4 py-3">Fin</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Auto-renovación</th>
              <th class="px-4 py-3">Acciones</th>
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
                  ({{ formatPrecio(sus.plan?.precio) }}/{{ sus.plan?.periodo }})
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
                    class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Editar"
                  >
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button
                    v-if="sus.estado === 'activa'"
                    @click="confirmarCancelar(sus)"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Cancelar"
                  >
                    <i class="pi pi-ban"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfirmDialog />

    <Teleport to="body">
      <div
        v-if="editando !== null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="cancelar"
      >
        <div class="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-lg w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">
            {{ editando === 'nueva' ? 'Nueva Suscripción' : 'Editar Suscripción' }}
          </h3>

          <form @submit.prevent="guardar" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
              <select
                v-model="form.empresa_id"
                required
                :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option :value="null" disabled>Seleccionar empresa...</option>
                <option v-for="emp in empresas" :key="emp.id" :value="emp.id">
                  {{ emp.nombre }} ({{ emp.slug }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Plan *</label>
              <select
                v-model="form.plan_id"
                required
                :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option :value="null" disabled>Seleccionar plan...</option>
                <option v-for="plan in planes" :key="plan.id" :value="plan.id">
                  {{ plan.nombre }} (${{ Number(plan.precio).toLocaleString('es-AR') }}/{{ plan.periodo }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                <input
                  v-model="form.fecha_inicio"
                  type="date"
                  :disabled="isSaving"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                <input
                  v-model="form.fecha_fin"
                  type="date"
                  :disabled="isSaving"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
                <p class="mt-1 text-xs text-gray-400">Dejar vacío = sin vencimiento</p>
              </div>
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.renovacion_automatica"
                type="checkbox"
                :disabled="isSaving"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700">Renovación automática</span>
            </label>

            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                :disabled="isSaving"
                @click="cancelar"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <i :class="isSaving ? 'pi pi-spin pi-spinner mr-1' : 'pi pi-check mr-1'"></i>
                {{ t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
