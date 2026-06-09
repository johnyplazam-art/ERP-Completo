<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Toaster } from 'vue-sonner'
import { useAuthStore } from '@/core/store/auth'
import { useAppStore } from '@/core/store/app'
import { useRouter } from 'vue-router'
import LanguageSelector from './LanguageSelector.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore = useAppStore()
const router = useRouter()

// ─── Nav sections ─────────────────────────────────────

const puedeAdmin = computed(() => authStore.tienePermiso('usuarios.manage'))

const panaderiaItems = computed(() => [
  { to: '/panaderia', icon: 'pi pi-chart-bar', label: t('nav.dashboard'), permission: null },
  { to: '/panaderia/recetas', icon: 'pi pi-book', label: t('nav.recetas'), permission: null },
  { to: '/panaderia/inventario', icon: 'pi pi-box', label: t('nav.inventario'), permission: null },
  { to: '/panaderia/productos', icon: 'pi pi-tag', label: 'Productos', permission: null },
  { to: '/panaderia/proveedores', icon: 'pi pi-truck', label: 'Proveedores', permission: null },
  { to: '/panaderia/produccion', icon: 'pi pi-cog', label: t('nav.produccion'), permission: null },
  { to: '/panaderia/catalogos', icon: 'pi pi-wrench', label: 'Catálogos', permission: null },
].filter(item => item.permission !== false))

const adminItems = computed(() => [
  { to: '/admin/usuarios', icon: 'pi pi-users', label: t('nav.usuarios'), permission: puedeAdmin.value },
].filter(item => item.permission !== false))

const tienePanaderia = computed(() =>
  authStore.permisos.length > 0
)

// ─── Helpers ──────────────────────────────────────────

async function handleLogout() {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

function getSelectValue(event) {
  return event.target.options[event.target.selectedIndex]._value
}

const currentRoleName = computed(() => {
  const rolSlug = authStore.currentRol
  if (!rolSlug) return ''
  return t(`roles.${rolSlug}`)
})

function isActive(path) {
  return router.currentRoute.value.path.startsWith(path)
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
      <!-- Logo + Empresa selector -->
      <div class="border-b border-gray-200">
        <div class="h-14 flex items-center px-4">
          <span v-if="!appStore.sidebarCollapsed" class="text-xl font-bold text-primary-600 tracking-tight">
            SIAS ERP
          </span>
          <span v-else class="text-xl font-bold text-primary-600 mx-auto">S</span>
        </div>
        <div v-if="!appStore.sidebarCollapsed && authStore.empresas.length" class="px-3 pb-3">
          <select
            :value="authStore.currentEmpresa?.id"
            @change="authStore.seleccionarEmpresa(
              authStore.empresas.find(e => e.id === getSelectValue($event))
            )"
            class="w-full text-sm rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-primary-500"
          >
            <option
              v-for="emp in authStore.empresas"
              :key="emp.id"
              :value="emp.id"
            >
              {{ emp.nombre }}
            </option>
          </select>
          <p v-if="currentRoleName" class="mt-1 text-xs text-gray-400 pl-1">
            {{ currentRoleName }}
          </p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-3 overflow-y-auto space-y-1">
        <!-- Home -->
        <router-link
          to="/"
          class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-primary-50 hover:text-primary-700"
          :class="$route.path === '/' ? 'bg-primary-50 text-primary-700' : 'text-gray-600'"
        >
          <i class="pi pi-home text-lg"></i>
          <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ t('nav.home') }}</span>
        </router-link>

        <!-- Separator -->
        <div v-if="!appStore.sidebarCollapsed && tienePanaderia" class="pt-3 pb-1">
          <div class="flex items-center gap-2 px-3">
            <i class="pi pi-shop text-gray-400 text-xs"></i>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {{ t('nav.sectionPanaderia') }}
            </span>
          </div>
        </div>
        <div
          v-if="appStore.sidebarCollapsed && tienePanaderia"
          class="border-t border-gray-100 my-2"
        ></div>

        <!-- Panadería items -->
        <template v-if="tienePanaderia">
          <router-link
            v-for="item in panaderiaItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.to) && $route.path !== '/'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'"
          >
            <i :class="[item.icon, 'text-lg']"></i>
            <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ item.label }}</span>
          </router-link>
        </template>

        <!-- Admin section -->
        <template v-if="adminItems.length">
          <div v-if="!appStore.sidebarCollapsed" class="pt-3 pb-1">
            <div class="flex items-center gap-2 px-3">
              <i class="pi pi-cog text-gray-400 text-xs"></i>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {{ t('nav.sectionAdmin') }}
              </span>
            </div>
          </div>
          <div
            v-if="appStore.sidebarCollapsed"
            class="border-t border-gray-100 my-2"
          ></div>

          <router-link
            v-for="item in adminItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="$route.path === item.to
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'"
          >
            <i :class="[item.icon, 'text-lg']"></i>
            <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <!-- User section -->
      <div class="border-t border-gray-200 p-4">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
            {{ (authStore.perfil?.nombre || authStore.userEmail)?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div v-if="!appStore.sidebarCollapsed" class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ authStore.perfil?.nombre || authStore.userEmail }}</p>
          </div>
          <button
            @click="appStore.toggleSidebar"
            class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
          >
            <i :class="appStore.sidebarCollapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"></i>
          </button>
        </div>
        <button
          @click="handleLogout"
          class="mt-2 w-full flex items-center px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <i class="pi pi-sign-out text-lg"></i>
          <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ t('auth.logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 class="text-lg font-semibold text-gray-900">
          {{ $route.meta?.title || 'SIAS ERP' }}
        </h1>
        <LanguageSelector />
      </header>

      <!-- Page content -->
      <div class="flex-1 overflow-auto p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
