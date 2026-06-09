<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'

const authStore = useAuthStore()
const router = useRouter()

const isReady = ref(false)

onMounted(async () => {
  // Inicializar sesión ANTES de permitir el renderizado
  await authStore.initialize()

  // Si no hay sesión, redirigir al login
  if (!authStore.isAuthenticated && router.currentRoute.value.name !== 'login') {
    await router.push('/login')
  }

  // Recién acá se habilita el router-view
  isReady.value = true
})
</script>

<template>
  <!-- Mientras no se resuelva la sesión, no renderizar nada -->
  <div
    v-if="!isReady"
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
