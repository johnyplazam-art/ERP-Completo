<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'

const { t } = useI18n()
const confirm = useConfirm()

const planes = ref([])
const apps = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const loadingPlan = ref(null)
const editando = ref(null)

const form = ref({
  nombre: '',
  slug: '',
  descripcion: '',
  precio: 0,
  periodo: 'mensual',
  apps_seleccionadas: [],
  max_usuarios: null,
  max_empresas: 1,
  activo: true,
})

const PERIODOS = ['diario', 'mensual', 'anual']

async function cargarPlanes() {
  isLoading.value = true
  try {
    const { data } = await supabase
      .from('planes')
      .select('*')
      .order('precio')
    planes.value = data ?? []
  } catch (err) {
    console.error('[admin-planes] Error:', err)
    toast.error(t('errors.loadData'))
  } finally {
    isLoading.value = false
  }
}

async function cargarApps() {
  const { data } = await supabase
    .from('applications')
    .select('id, slug, name')
    .order('name')
  apps.value = data ?? []
}

function nuevoPlan() {
  editando.value = 'nueva'
  form.value = {
    nombre: '',
    slug: '',
    descripcion: '',
    precio: 0,
    periodo: 'mensual',
    apps_seleccionadas: [],
    max_usuarios: null,
    max_empresas: 1,
    activo: true,
  }
}

function editarPlan(plan) {
  editando.value = plan.id
  form.value = {
    nombre: plan.nombre,
    slug: plan.slug,
    descripcion: plan.descripcion || '',
    precio: Number(plan.precio),
    periodo: plan.periodo,
    apps_seleccionadas: plan.features?.apps ?? [],
    max_usuarios: plan.features?.max_usuarios ?? null,
    max_empresas: plan.features?.max_empresas ?? 1,
    activo: plan.activo,
  }
}

function cancelar() {
  editando.value = null
}

async function guardar() {
  if (!form.value.nombre.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }
  if (!form.value.slug.trim()) {
    toast.error('El slug es obligatorio')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      nombre: form.value.nombre.trim(),
      slug: form.value.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      descripcion: form.value.descripcion.trim(),
      precio: form.value.precio,
      periodo: form.value.periodo,
      features: {
        apps: form.value.apps_seleccionadas,
        max_usuarios: form.value.max_usuarios,
        max_empresas: form.value.max_empresas,
      },
      activo: form.value.activo,
    }

    if (editando.value === 'nueva') {
      const { error } = await supabase.from('planes').insert(payload)
      if (error) throw error
      toast.success('Plan creado exitosamente')
    } else {
      const { error } = await supabase.from('planes').update(payload).eq('id', editando.value)
      if (error) throw error
      toast.success('Plan actualizado exitosamente')
    }

    editando.value = null
    await cargarPlanes()
  } catch (err) {
    toast.error(err.message || 'Error al guardar plan')
  } finally {
    isSaving.value = false
  }
}

async function toggleActivo(plan) {
  loadingPlan.value = plan.id
  try {
    await supabase.from('planes').update({ activo: !plan.activo }).eq('id', plan.id)
    await cargarPlanes()
  } catch (err) {
    toast.error(err.message || 'Error al cambiar estado')
  } finally {
    loadingPlan.value = null
  }
}

function eliminarPlan(plan) {
  confirm.require({
    message: `¿Eliminar el plan "${plan.nombre}"? Las suscripciones activas se quedarán sin referencia.`,
    header: 'Eliminar plan',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: t('common.cancel'),
    acceptLabel: 'Eliminar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      loadingPlan.value = plan.id
      try {
        const { error } = await supabase.from('planes').delete().eq('id', plan.id)
        if (error) throw error
        toast.success(`Plan "${plan.nombre}" eliminado`)
        await cargarPlanes()
      } catch (err) {
        toast.error(err.message || 'Error al eliminar plan')
      } finally {
        loadingPlan.value = null
      }
    },
  })
}

function formatPrecio(precio) {
  return Number(precio).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatPeriodo(p) {
  const map = { diario: '/día', mensual: '/mes', anual: '/año' }
  return map[p] || p
}

onMounted(() => {
  cargarPlanes()
  cargarApps()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Planes de Suscripción</h2>
        <p class="text-sm text-gray-500 mt-1">Definí los planes disponibles y qué apps incluye cada uno</p>
      </div>
      <button
        @click="nuevoPlan"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo Plan
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="!planes.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-credit-card text-4xl mb-3"></i>
      <p>No hay planes creados</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="plan in planes"
        :key="plan.id"
        class="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
        :class="{ 'ring-2 ring-primary-500': plan.slug === 'gratuito' }"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-gray-900 text-lg">{{ plan.nombre }}</h3>
            <span class="text-xs text-gray-400">/{{ plan.slug }}</span>
          </div>
          <span
            class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
            :class="plan.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
          >
            {{ plan.activo ? 'Activo' : 'Inactivo' }}
          </span>
        </div>

        <div class="text-2xl font-bold text-gray-900 mb-1">
          {{ plan.precio === 0 ? 'Gratis' : formatPrecio(plan.precio) }}
          <span class="text-sm font-normal text-gray-400">{{ formatPeriodo(plan.periodo) }}</span>
        </div>

        <p v-if="plan.descripcion" class="text-sm text-gray-500 mb-4 line-clamp-2">{{ plan.descripcion }}</p>

        <div class="flex flex-wrap gap-1.5 mb-4">
          <span
            v-for="appSlug in (plan.features?.apps ?? [])"
            :key="appSlug"
            class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
          >
            {{ appSlug }}
          </span>
        </div>

        <div class="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
          <div class="text-xs text-gray-400 space-y-0.5">
            <div v-if="plan.features?.max_usuarios">Hasta {{ plan.features.max_usuarios }} usuarios</div>
            <div v-if="plan.features?.max_empresas">{{ plan.features.max_empresas }} empresa(s)</div>
            <div v-else>Sin límite</div>
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="toggleActivo(plan)"
              class="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30"
              :disabled="loadingPlan === plan.id"
              :title="plan.activo ? 'Desactivar' : 'Activar'"
            >
              <i :class="plan.activo ? 'pi pi-eye-slash' : 'pi pi-eye'" class="text-lg"></i>
            </button>
            <button
              @click="editarPlan(plan)"
              class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-30"
              :disabled="isSaving || loadingPlan !== null"
              :title="t('common.edit')"
            >
              <i class="pi pi-pencil text-lg"></i>
            </button>
            <button
              v-if="plan.slug !== 'gratuito'"
              @click="eliminarPlan(plan)"
              class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
              :disabled="loadingPlan === plan.id"
              :title="t('common.delete')"
            >
              <i class="pi pi-trash text-lg"></i>
            </button>
          </div>
        </div>
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
            {{ editando === 'nueva' ? 'Nuevo Plan' : 'Editar Plan' }}
          </h3>

          <form @submit.prevent="guardar" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  v-model="form.nombre"
                  type="text"
                  required
                  :disabled="isSaving"
                  placeholder="Ej: Profesional"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  v-model="form.slug"
                  type="text"
                  required
                  :disabled="isSaving"
                  placeholder="Ej: profesional"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                v-model="form.descripcion"
                rows="2"
                :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 resize-none disabled:opacity-50"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <input
                  v-model.number="form.precio"
                  type="number"
                  min="0"
                  step="0.01"
                  :disabled="isSaving"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select
                  v-model="form.periodo"
                  :disabled="isSaving"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <option v-for="p in PERIODOS" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Apps incluidas</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="app in apps"
                  :key="app.id"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                  :class="form.apps_seleccionadas.includes(app.slug)
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
                  :disabled="isSaving"
                >
                  <input
                    type="checkbox"
                    :value="app.slug"
                    v-model="form.apps_seleccionadas"
                    :disabled="isSaving"
                    class="sr-only"
                  />
                  <i v-if="form.apps_seleccionadas.includes(app.slug)" class="pi pi-check-circle text-primary-500"></i>
                  <i v-else class="pi pi-circle text-gray-300"></i>
                  <span class="text-sm">{{ app.name }} ({{ app.slug }})</span>
                </label>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Máx. usuarios</label>
                <input
                  v-model.number="form.max_usuarios"
                  type="number"
                  min="0"
                  :disabled="isSaving"
                  placeholder="0 = ilimitado"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Máx. empresas</label>
                <input
                  v-model.number="form.max_empresas"
                  type="number"
                  min="0"
                  :disabled="isSaving"
                  placeholder="0 = ilimitado"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input
                v-model="form.activo"
                type="checkbox"
                :disabled="isSaving"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700">Plan activo</span>
            </div>

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
