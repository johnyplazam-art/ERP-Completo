<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const apps = ref([])
const isLoading = ref(true)

const APP_ICONS = {
  panaderia: 'pi pi-shop',
  contabilidad: 'pi pi-calculator',
  admin: 'pi pi-cog',
}

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

function abrirApp(app) {
  if (!app.disponible) return
  router.push(`/${app.slug}`)
}

function appIcon(slug) {
  return APP_ICONS[slug] || 'pi pi-th-large'
}

onMounted(cargarApps)
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">
        {{ t('home.welcome', { nombre: authStore.perfil?.nombre || '' }) }}
      </h1>
      <p class="text-gray-500 mt-1">{{ t('home.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-3xl mb-3"></i>
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- Empty (no apps available) -->
    <div v-else-if="!apps.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-th-large text-5xl mb-4"></i>
      <p>{{ t('home.noApps') }}</p>
    </div>

    <!-- App grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="app in apps"
        :key="app.id"
        @click="abrirApp(app)"
        role="button"
        tabindex="0"
        @keydown.enter="abrirApp(app)"
        class="relative group bg-white rounded-xl border-2 p-6 transition-all duration-200 cursor-pointer"
        :class="app.disponible
          ? 'border-gray-200 hover:border-primary-300 hover:shadow-lg hover:-translate-y-1'
          : 'border-gray-100 opacity-50 cursor-not-allowed'"
      >
        <!-- App icon -->
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-2xl"
          :class="app.disponible
            ? 'bg-primary-50 text-primary-600 group-hover:bg-primary-100'
            : 'bg-gray-100 text-gray-400'"
        >
          <i :class="appIcon(app.slug)"></i>
        </div>

        <!-- App name -->
        <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ app.name }}</h3>

        <!-- App description -->
        <p class="text-sm text-gray-500 leading-relaxed">{{ app.description }}</p>

        <!-- Badge: disponible / no disponible -->
        <span
          v-if="!app.disponible"
          class="absolute top-3 right-3 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full"
        >
          {{ t('home.noAccess') }}
        </span>
      </div>
    </div>
  </div>
</template>
