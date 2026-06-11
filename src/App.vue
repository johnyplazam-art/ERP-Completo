<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'
import { useAppStore } from '@/core/store/app'

const authStore = useAuthStore()
const appStore = useAppStore()
const router = useRouter()

watch(() => appStore.theme, (val) => {
  document.documentElement.classList.toggle('p-dark', val === 'dark')
}, { immediate: true })

const initError = ref(null)

onMounted(async () => {
  // Timeout de seguridad: si la inicialización tarda más de 8s,
  // mostramos la pantalla de error para evitar el spinner eterno
  const timeoutId = setTimeout(() => {
    initError.value = 'Tiempo de espera agotado al conectar con el servidor'
  }, 8000)

  try {
    await authStore.initialize()
    clearTimeout(timeoutId)
  } catch (err) {
    clearTimeout(timeoutId)
    initError.value = err?.message || 'Error al iniciar sesión'
  }

  if (!initError.value) {
    // Si hay sesión pero estamos en login, ir a home
    if (authStore.isAuthenticated && router.currentRoute.value.name === 'login') {
      await router.push('/')
    }

    // Si no hay sesión y no estamos en login, ir al login
    if (!authStore.isAuthenticated && router.currentRoute.value.name !== 'login') {
      await router.push('/login')
    }
  }
})

async function reintentar() {
  initError.value = null
  try {
    await authStore.initialize()
    
    if (authStore.isAuthenticated && router.currentRoute.value.name === 'login') {
      await router.push('/')
    }

    if (!authStore.isAuthenticated && router.currentRoute.value.name !== 'login') {
      await router.push('/login')
    }
  } catch (err) {
    initError.value = err?.message || 'Error al iniciar sesión'
  }
}
</script>

<template>
  <!-- Pantalla de error si falló initialize -->
  <div
    v-if="initError"
    class="min-h-screen flex items-center justify-center bg-gray-50"
  >
    <div class="text-center max-w-md mx-auto px-4">
      <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
      <h2 class="text-lg font-semibold text-gray-800 mb-2">Error de conexión</h2>
      <p class="text-sm text-gray-500 mb-6">{{ initError }}</p>
      <button
        @click="reintentar"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
      >
        <i class="pi pi-refresh mr-2"></i>
        Reintentar
      </button>
    </div>
  </div>

  <!-- Mientras el store esté cargando, mostrar spinner -->
  <div
    v-else-if="authStore.loading"
    class="min-h-screen flex items-center justify-center bg-gray-50"
  >
    <div class="text-center text-gray-400">
      <i class="pi pi-spin pi-spinner text-3xl mb-3"></i>
      <p class="text-sm">Cargando...</p>
    </div>
  </div>

  <!-- Router habilitado solo después de resolver sesión -->
  <router-view v-else />
</template>
