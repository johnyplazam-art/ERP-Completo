<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/core/store/app'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'

const { t } = useI18n()
const appStore = useAppStore()
const confirm = useConfirm()

const apps = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const loadingApp = ref(null) // id de la app en operación (toggle/delete)
const editando = ref(null) // id de la app que se está editando | null
const form = ref({ name: '', slug: '', description: '', icon: 'pi pi-th-large', is_active: true, orden: 0 })

// Todos los iconos de PrimeIcons disponibles
const ICONOS_DISPONIBLES = [
  'pi pi-shop', 'pi pi-calculator', 'pi pi-cog', 'pi pi-users',
  'pi pi-book', 'pi pi-box', 'pi pi-tag', 'pi pi-truck',
  'pi pi-chart-bar', 'pi pi-warehouse', 'pi pi-shopping-cart',
  'pi pi-dollar', 'pi pi-calendar', 'pi pi-clock', 'pi pi-file',
  'pi pi-chart-line', 'pi pi-qrcode', 'pi pi-sync', 'pi pi-sliders-v',
  'pi pi-th-large', 'pi pi-star', 'pi pi-heart', 'pi pi-globe',
  'pi pi-envelope', 'pi pi-phone', 'pi pi-comments', 'pi pi-bell',
  'pi pi-map', 'pi pi-images', 'pi pi-palette', 'pi pi-wrench',
]

async function cargarApps() {
  isLoading.value = true
  try {
    apps.value = await appStore.cargarApps()
  } catch (err) {
    console.error('[admin-apps] Error:', err)
    toast.error(t('errors.loadApps'))
  } finally {
    isLoading.value = false
  }
}

function nuevaApp() {
  editando.value = 'nueva'
  form.value = { name: '', slug: '', description: '', icon: 'pi pi-th-large', is_active: true, orden: (apps.value.length + 1) * 10 }
}

function editarApp(app) {
  editando.value = app.id
  form.value = { ...app }
}

function cancelar() {
  editando.value = null
}

async function guardar() {
  if (!form.value.name.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }
  if (!form.value.slug.trim()) {
    toast.error('El slug es obligatorio')
    return
  }

  const slugFinal = form.value.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const exists = await appStore.slugExiste(slugFinal, editando.value === 'nueva' ? null : editando.value)
  if (exists) {
    toast.error(`El slug "${slugFinal}" ya está en uso`)
    return
  }

  isSaving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      slug: slugFinal,
      description: form.value.description.trim(),
      icon: form.value.icon,
      is_active: form.value.is_active,
      orden: form.value.orden,
    }

    if (editando.value === 'nueva') {
      await appStore.crearApp(payload)
      toast.success('Aplicación creada')
    } else {
      await appStore.actualizarApp(editando.value, payload)
      toast.success('Aplicación actualizada')
    }

    editando.value = null
    await cargarApps()
  } catch (err) {
    const msg = err?.message || err?.error_description || t('errors.generic')
    console.error('[admin-apps] Error guardando:', err)
    toast.error(msg)
  } finally {
    isSaving.value = false
  }
}

async function toggleActiva(app) {
  loadingApp.value = app.id
  try {
    await appStore.toggleActiva(app.id, app.is_active)
    toast.success(app.is_active ? t('users.deactivate') : t('users.active'))
    await cargarApps()
  } catch (err) {
    console.error('[admin-apps] Error toggling:', err)
    toast.error(t('errors.generic'))
  } finally {
    loadingApp.value = null
  }
}

function eliminarApp(app) {
  confirm.require({
    message: `¿Eliminar "${app.name}"? Esta acción no se puede deshacer.`,
    header: 'Eliminar aplicación',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Eliminar',
    accept: async () => {
      loadingApp.value = app.id
      try {
        await appStore.eliminarApp(app.id)
        toast.success(`"${app.name}" eliminada`)
        await cargarApps()
      } catch (err) {
        console.error('[admin-apps] Error eliminando:', err)
        toast.error(t('errors.generic'))
      } finally {
        loadingApp.value = null
      }
    },
  })
}

onMounted(cargarApps)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{{ t('admin.appsTitle') }}</h2>
        <p class="text-sm text-gray-500 mt-1">{{ t('admin.appsSubtitle') }}</p>
      </div>
      <button
        @click="nuevaApp"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        {{ t('admin.addApp') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!apps.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-th-large text-4xl mb-3"></i>
      <p>{{ t('admin.noApps') }}</p>
    </div>

    <!-- App list -->
    <div v-else class="space-y-4">
      <div
        v-for="app in apps"
        :key="app.id"
        class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
      >
        <!-- Icon -->
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
          :class="app.is_active ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'"
        >
          <i :class="app.icon || 'pi pi-th-large'"></i>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900">{{ app.name }}</h3>
            <span class="text-xs text-gray-400">/{{ app.slug }}</span>
            <span
              class="px-2 py-0.5 rounded-full text-xs font-medium"
              :class="app.is_active
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'"
            >
              {{ app.is_active ? t('users.active') : t('users.inactive') }}
            </span>
          </div>
          <p class="text-sm text-gray-500 truncate">{{ app.description || '—' }}</p>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ t('admin.orden') }}: {{ app.orden }}
            | ID: {{ app.id }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="toggleActiva(app)"
            class="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="loadingApp === app.id"
            :title="app.is_active ? t('users.deactivate') : t('users.activate')"
          >
            <i :class="app.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'" class="text-lg"></i>
          </button>
          <button
            @click="editarApp(app)"
            class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="isSaving || loadingApp !== null"
            :title="t('common.edit')"
          >
            <i class="pi pi-pencil text-lg"></i>
          </button>
          <button
            @click="eliminarApp(app)"
            class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="loadingApp === app.id"
            :title="t('common.delete')"
          >
            <i class="pi pi-trash text-lg"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit / Create modal -->
    <Teleport to="body">
      <ConfirmDialog />
      <div
        v-if="editando !== null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="cancelar"
      >
        <div class="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-lg w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">
            {{ editando === 'nueva' ? t('admin.addApp') : t('admin.editApp') }}
          </h3>

          <form @submit.prevent="guardar" class="space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                :disabled="isSaving"
                placeholder="Ej: Panadería"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <!-- Slug -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Slug <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.slug"
                type="text"
                required
                :disabled="isSaving"
                placeholder="Ej: panaderia"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p class="mt-1 text-xs text-gray-400">Identificador único para la URL: /{{ form.slug || 'slug' }}</p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.formDescription') }}</label>
              <textarea
                v-model="form.description"
                rows="2"
                :disabled="isSaving"
                placeholder="Breve descripción de la aplicación"
                class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              ></textarea>
            </div>

            <!-- Icon selector -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('admin.formIcon') }}</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="icono in ICONOS_DISPONIBLES"
                  :key="icono"
                  type="button"
                  :disabled="isSaving"
                  @click="form.icon = icono"
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="form.icon === icono
                    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'"
                  :title="icono"
                >
                  <i :class="icono"></i>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Orden -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.orden') }}</label>
                <input
                  v-model.number="form.orden"
                  type="number"
                  :disabled="isSaving"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <!-- Active -->
              <div class="flex items-end pb-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="form.is_active"
                    type="checkbox"
                    :disabled="isSaving"
                    class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                  />
                  <span class="text-sm text-gray-700">{{ t('admin.active') }}</span>
                </label>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                :disabled="isSaving"
                @click="cancelar"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
