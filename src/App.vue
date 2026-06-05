<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'

const authStore = useAuthStore()
const router = useRouter()

onMounted(async () => {
  await authStore.initialize()

  if (!authStore.isAuthenticated && router.currentRoute.value.name !== 'login') {
    router.push('/login')
  }
})
</script>

<template>
  <router-view />
</template>
