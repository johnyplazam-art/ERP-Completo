<script setup>
import { Toaster } from 'vue-sonner'
import { useAuthStore } from '@/core/store/auth'
import { useAppStore } from '@/core/store/app'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const appStore = useAppStore()
const router = useRouter()

async function handleLogout() {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>

<template>
  <Toaster position="top-right" rich-colors />
  <div class="flex h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside
      :class="[
        'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
        appStore.sidebarCollapsed ? 'w-16' : 'w-64',
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-4 border-b border-gray-200">
        <span v-if="!appStore.sidebarCollapsed" class="text-xl font-bold text-primary-600">
          SIAS ERP
        </span>
        <span v-else class="text-xl font-bold text-primary-600 mx-auto">S</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in [
            { to: '/panaderia', icon: 'pi pi-home', label: 'Panadería' },
            { to: '/panaderia/recetas', icon: 'pi pi-book', label: 'Recetas' },
            { to: '/panaderia/inventario', icon: 'pi pi-box', label: 'Inventario' },
            { to: '/panaderia/productos', icon: 'pi pi-tag', label: 'Productos' },
            { to: '/panaderia/proveedores', icon: 'pi pi-truck', label: 'Proveedores' },
            { to: '/panaderia/produccion', icon: 'pi pi-cog', label: 'Producción' },
          ]"
          :key="item.to"
          :to="item.to"
          class="flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-primary-50 hover:text-primary-700"
          :class="$route.path === item.to ? 'bg-primary-50 text-primary-700' : 'text-gray-600'"
        >
          <i :class="[item.icon, 'text-lg']"></i>
          <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- User section -->
      <div class="border-t border-gray-200 p-4">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
            {{ authStore.userEmail?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div v-if="!appStore.sidebarCollapsed" class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ authStore.userEmail }}</p>
          </div>
          <button
            @click="appStore.toggleSidebar"
            class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <i :class="appStore.sidebarCollapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"></i>
          </button>
        </div>
        <button
          @click="handleLogout"
          class="mt-2 w-full flex items-center px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <i class="pi pi-sign-out text-lg"></i>
          <span v-if="!appStore.sidebarCollapsed" class="ml-3">Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center px-6">
        <h1 class="text-lg font-semibold text-gray-900">
          {{ $route.meta?.title || 'SIAS ERP' }}
        </h1>
      </header>

      <!-- Page content -->
      <div class="flex-1 overflow-auto p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
