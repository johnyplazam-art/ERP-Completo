<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const apps = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const soloDisponibles = ref(true)

async function cargarApps() {
  isLoading.value = true
  try {
    apps.value = await authStore.cargarAppsDisponibles()
  } catch (err) {
    console.error('[home] Error cargando apps:', err)
    apps.value = []
  } finally {
    isLoading.value = false
  }
}

const appsFiltradas = computed(() => {
  let filtered = apps.value

  if (soloDisponibles.value) {
    filtered = filtered.filter(a => a.disponible)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    )
  }

  return filtered
})

const puedeAdminCMS = computed(() => authStore.tienePermiso('usuarios.manage'))

function abrirApp(app) {
  if (!app.disponible) return
  router.push(`/${app.slug}`)
}

onMounted(cargarApps)
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Welcome + Admin CMS button -->
    <div class="flex items-start justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ t('home.welcome', { nombre: authStore.perfil?.nombre || '' }) }}
        </h1>
        <p class="text-gray-500 mt-1">{{ t('home.subtitle') }}</p>
      </div>

      <!-- Admin CMS -->
      <button
        v-if="puedeAdminCMS"
        @click="router.push('/admin/apps')"
        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-primary-600 transition-colors"
      >
        <i class="pi pi-palette text-lg"></i>
        <span class="hidden sm:inline">{{ t('admin.manageApps') }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-3xl mb-3"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!apps.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-th-large text-5xl mb-4"></i>
      <p>{{ t('home.noApps') }}</p>
    </div>

    <template v-else>
      <!-- Search + Filter bar -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('home.searchApps')"
            class="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            v-model="soloDisponibles"
            type="checkbox"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-gray-500">{{ t('home.onlyAvailable') }}</span>
        </label>
      </div>

      <!-- App grid (Odoo-like) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <div
          v-for="app in appsFiltradas"
          :key="app.id"
          @click="abrirApp(app)"
          role="button"
          tabindex="0"
          @keydown.enter="abrirApp(app)"
          class="relative group bg-white rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer"
          :class="app.disponible
            ? 'border-gray-100 hover:border-primary-200 hover:shadow-lg hover:-translate-y-1'
            : 'border-gray-100 opacity-40 cursor-not-allowed'"
        >
          <!-- App icon -->
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl transition-colors"
            :class="app.disponible
              ? 'bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 group-hover:from-primary-100 group-hover:to-primary-200'
              : 'bg-gray-50 text-gray-300'"
          >
            <i :class="app.icon || 'pi pi-th-large'"></i>
          </div>

          <!-- App name -->
          <h3 class="text-base font-semibold text-gray-900 mb-1.5">{{ app.name }}</h3>

          <!-- App description -->
          <p class="text-sm text-gray-400 leading-relaxed line-clamp-2">{{ app.description || '—' }}</p>

          <!-- Badge: disponible / no disponible -->
          <span
            v-if="!app.disponible"
            class="absolute top-3 right-3 text-[11px] font-medium bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full"
          >
            {{ t('home.noAccess') }}
          </span>

          <!-- Enter button -->
          <div
            v-if="app.disponible"
            class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span class="text-xs font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
              {{ t('home.enter') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Result count -->
      <p class="mt-6 text-center text-xs text-gray-400">
        {{ appsFiltradas.length }} {{ t('admin.usersCount') }}
      </p>
    </template>
  </div>
</template>
