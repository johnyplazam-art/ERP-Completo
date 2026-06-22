<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/core/supabase'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { formatCurrency } from '@/core/composables/useCurrency'

const { t } = useI18n()
const confirm = useConfirm()
const queryClient = useQueryClient()

const PLANES_KEY = ['planes']
const APPS_KEY = ['admin-apps']

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

// ─── Queries ──────────────────────────────────────────

const { data: planes, isLoading } = useQuery({
  queryKey: PLANES_KEY,
  queryFn: () =>
    supabase.from('planes').select('*').order('precio').then(r => { if (r.error) throw r.error; return r.data ?? [] }),
})

const { data: apps } = useQuery({
  queryKey: APPS_KEY,
  queryFn: () =>
    supabase.from('applications').select('id, slug, name').order('name').then(r => r.data ?? []),
})

// ─── Mutations ────────────────────────────────────────

const createPlanMutation = useMutation({
  mutationFn: (payload) =>
    supabase.from('planes').insert(payload).then(r => { if (r.error) throw r.error }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: PLANES_KEY })
    toast.success(t('pricing.created'))
  },
})

const updatePlanMutation = useMutation({
  mutationFn: ({ id, payload }) =>
    supabase.from('planes').update(payload).eq('id', id).then(r => { if (r.error) throw r.error }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: PLANES_KEY })
    toast.success(t('pricing.updated'))
  },
})

const togglePlanMutation = useMutation({
  mutationFn: ({ id, activo }) =>
    supabase.from('planes').update({ activo }).eq('id', id).then(r => { if (r.error) throw r.error }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANES_KEY }),
})

const deletePlanMutation = useMutation({
  mutationFn: (id) =>
    supabase.from('planes').delete().eq('id', id).then(r => { if (r.error) throw r.error }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANES_KEY }),
})

// ─── UI Handlers ──────────────────────────────────────

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
    toast.error(t('pricing.nameRequired'))
    return
  }
  if (!form.value.slug.trim()) {
    toast.error(t('pricing.slugRequired'))
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
      await createPlanMutation.mutateAsync(payload)
    } else {
      await updatePlanMutation.mutateAsync({ id: editando.value, payload })
    }

    editando.value = null
  } catch (err) {
    toast.error(err.message || t('pricing.saveError'))
  } finally {
    isSaving.value = false
  }
}

async function toggleActivo(plan) {
  loadingPlan.value = plan.id
  try {
    await togglePlanMutation.mutateAsync({ id: plan.id, activo: !plan.activo })
  } catch (err) {
    toast.error(err.message || t('pricing.toggleError'))
  } finally {
    loadingPlan.value = null
  }
}

function eliminarPlan(plan) {
  confirm.require({
    message: t('pricing.deleteConfirm', { nombre: plan.nombre }),
    header: t('pricing.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: t('common.cancel'),
    acceptLabel: t('pricing.deleteConfirmLabel'),
    acceptClass: 'p-button-danger',
    accept: async () => {
      loadingPlan.value = plan.id
      try {
        await deletePlanMutation.mutateAsync(plan.id)
        toast.success(t('pricing.deleted', { nombre: plan.nombre }))
      } catch (err) {
        toast.error(err.message || 'Error al eliminar plan')
      } finally {
        loadingPlan.value = null
      }
    },
  })
}

function formatPrecio(precio) {
  return formatCurrency(precio)
}

function formatPeriodo(p) {
  if (p === 'diario') return t('pricing.perDay')
  if (p === 'mensual') return t('pricing.perMonth')
  if (p === 'anual') return t('pricing.perYear')
  return p
}

</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{{ t('pricing.plansTitle') }}</h2>
        <p class="text-sm text-gray-500 mt-1">{{ t('pricing.plansSubtitle') }}</p>
      </div>
      <button
        @click="nuevoPlan"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        {{ t('pricing.newPlan') }}
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="!planes.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-credit-card text-4xl mb-3"></i>
      <p>{{ t('pricing.noPlans') }}</p>
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
            {{ plan.activo ? t('pricing.active') : t('pricing.inactive') }}
          </span>
        </div>

        <div class="text-2xl font-bold text-gray-900 mb-1">
          {{ plan.precio === 0 ? t('pricing.free') : formatPrecio(plan.precio) }}
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
            <div v-if="plan.features?.max_usuarios">{{ t('pricing.upToUsers', { n: plan.features.max_usuarios }) }}</div>
            <div v-if="plan.features?.max_empresas">{{ t('pricing.nCompanies', { n: plan.features.max_empresas }) }}</div>
            <div v-else>{{ t('pricing.unlimited') }}</div>
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
            {{ editando === 'nueva' ? t('pricing.newPlan') : t('pricing.editPlan') }}
          </h3>

          <form @submit.prevent="guardar" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pricing.formName') }} *</label>
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
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pricing.formSlug') }} *</label>
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
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pricing.formDescription') }}</label>
              <textarea
                v-model="form.descripcion"
                rows="2"
                :disabled="isSaving"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 resize-none disabled:opacity-50"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pricing.formPrice') }}</label>
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
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pricing.formPeriod') }}</label>
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
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('pricing.formApps') }}</label>
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
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pricing.formMaxUsers') }}</label>
                <input
                  v-model.number="form.max_usuarios"
                  type="number"
                  min="0"
                  :disabled="isSaving"
                  :placeholder="t('pricing.placeholderUnlimited')"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pricing.formMaxCompanies') }}</label>
                <input
                  v-model.number="form.max_empresas"
                  type="number"
                  min="0"
                  :disabled="isSaving"
                  :placeholder="t('pricing.placeholderUnlimited')"
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
              <span class="text-sm text-gray-700">{{ t('pricing.formActive') }}</span>
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
                {{ isSaving ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
