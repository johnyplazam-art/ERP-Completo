<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Toaster } from 'vue-sonner'
import { useAuthStore } from '@/core/store/auth'
import { useAppStore } from '@/core/store/app'
import { useRouter } from 'vue-router'
import { getSelectValue } from '@/core/composables/useSelectValue'
import LanguageSelector from './LanguageSelector.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore = useAppStore()
const router = useRouter()

// ─── Nav sections ─────────────────────────────────────

const puedeAdmin = computed(() => authStore.tienePermiso('usuarios.manage'))

// Configuración de rutas por aplicación
const APP_ROUTES_CONFIG = {
  panaderia: [
    { to: '/panaderia', icon: 'pi pi-chart-bar', label: t('nav.dashboard') },
    { to: '/panaderia/recetas', icon: 'pi pi-book', label: t('nav.recetas') },
    { to: '/panaderia/inventario', icon: 'pi pi-box', label: t('nav.inventario') },
    { to: '/panaderia/stock-productos', icon: 'pi pi-box', label: 'Stock PT' },
    { to: '/panaderia/productos', icon: 'pi pi-tag', label: 'Productos' },
    { to: '/panaderia/proveedores', icon: 'pi pi-truck', label: 'Proveedores' },
    { to: '/panaderia/produccion', icon: 'pi pi-cog', label: t('nav.produccion') },
    { to: '/panaderia/movimientos', icon: 'pi pi-arrow-right-arrow-left', label: 'Movimientos' },
    { to: '/panaderia/mermas', icon: 'pi pi-exclamation-triangle', label: 'Mermas' },
    { to: '/panaderia/catalogos', icon: 'pi pi-wrench', label: 'Catálogos' },
    { to: '/panaderia/auditoria', icon: 'pi pi-history', label: 'Auditoría' },
  ],
  restaurant: [
    { to: '/restaurant', icon: 'pi pi-chart-bar', label: t('nav.dashboard') },
    // Aquí se añadirán más rutas de restaurant cuando se implementen
  ],
  pos: [
    { to: '/pos', icon: 'pi pi-chart-bar', label: t('nav.dashboard') },
  ],
  medico: [
    { to: '/medico', icon: 'pi pi-chart-bar', label: t('nav.dashboard') },
  ],
  academico: [
    { to: '/academico', icon: 'pi pi-chart-bar', label: t('nav.dashboard') },
  ],
  admin: [
    { to: '/admin/usuarios', icon: 'pi pi-users', label: t('nav.usuarios'), permission: puedeAdmin.value },
    { to: '/admin/apps', icon: 'pi pi-palette', label: t('nav.apps'), permission: puedeAdmin.value },
    { to: '/admin/planes', icon: 'pi pi-credit-card', label: 'Planes', permission: puedeAdmin.value },
    { to: '/admin/suscripciones', icon: 'pi pi-sync', label: 'Suscripciones', permission: puedeAdmin.value },
  ]
}

const appsDisponibles = ref([])
const loadingApps = ref(true)

const navItems = computed(() => {
  const items = []
  
  // 1. Home siempre visible
  items.push({ to: '/', icon: 'pi pi-home', label: t('nav.home'), isHome: true })

  // 2. Apps dinámicas
  appsDisponibles.value.forEach(app => {
    const routes = APP_ROUTES_CONFIG[app.slug] || []
    if (routes.length > 0) {
      // Añadir cabecera de sección si es una app
      items.push({ 
        isSectionHeader: true, 
        label: app.nombre, 
        icon: app.icono || `pi pi-${app.slug === 'panaderia' ? 'shop' : 'briefcase'}` 
      })
      
      // Añadir items de la app
      routes.forEach(route => {
        // Verificar permisos si el item los requiere
        const hasPermission = route.permission !== false ? true : false
        if (hasPermission) {
          items.push({ ...route, appSlug: app.slug })
        }
      })
    }
  })

  return items
})

const dentroDePanaderia = computed(() =>
  router.currentRoute.value.path.startsWith('/panaderia')
)

const dentroDeAdmin = computed(() =>
  router.currentRoute.value.path.startsWith('/admin')
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

const currentRoleName = computed(() => {
  const rolSlug = authStore.currentRol
  if (!rolSlug) return ''
  return t(`roles.${rolSlug}`)
})

function isActive(path) {
  return router.currentRoute.value.path.startsWith(path)
}

async function fetchApps() {
  loadingApps.value = true
  try {
    const apps = await authStore.cargarAppsDisponibles()
    appsDisponibles.value = apps
  } catch (err) {
    console.error('Error cargando apps:', err)
  } finally {
    loadingApps.value = false
  }
}

onMounted(async () => {
  await fetchApps()
})

// ─── Breadcrumbs ──────────────────────────────────────

const breadcrumbs = computed(() => {
  const route = router.currentRoute.value
  const crumbs = [{ label: 'Inicio', to: '/' }]

  // Partir la ruta en segmentos y buscar metadatos
  const pathParts = route.path.split('/').filter(Boolean)
  let accumulated = ''

  for (const part of pathParts) {
    accumulated += `/${part}`

    // Buscar la ruta que coincida (respetando params como :id)
    const matched = route.matched.find(m => {
      const normalized = m.path.replace(/\/:.*/, '') // quita /:id etc
      return accumulated === normalized || accumulated.startsWith(normalized)
    })

    if (matched?.meta?.title) {
      crumbs.push({ label: matched.meta.title, to: accumulated })
    } else if (matched) {
      // Segmento intermedio sin meta.title: lo mostramos sin link
      crumbs.push({ label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ') })
    }
  }

  // No linkear el último (es la página actual)
  if (crumbs.length > 1) {
    crumbs[crumbs.length - 1].to = undefined
  }

  return crumbs
})
</script>

<template>
  <Toaster position="top-right" rich-colors />
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Sidebar -->
    <aside
      :class="[
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300',
        appStore.sidebarCollapsed ? 'w-16' : 'w-64',
      ]"
    >
      <!-- Logo + Empresa selector -->
      <div class="border-b border-gray-200 dark:border-gray-800">
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
            class="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500"
          >
            <option
              v-for="emp in authStore.empresas"
              :key="emp.id"
              :value="emp.id"
            >
              {{ emp.nombre }}
            </option>
          </select>
          <p v-if="currentRoleName" class="mt-1 text-xs text-gray-400 dark:text-gray-500 pl-1">
            {{ currentRoleName }}
          </p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-3 overflow-y-auto space-y-1">
        <!-- Loading apps placeholder -->
        <div v-if="loadingApps && !appStore.sidebarCollapsed" class="px-3 py-2 space-y-2">
          <div v-for="i in 3" :key="i" class="h-4 bg-gray-100 dark:bg-gray-800 animate-pulse rounded"></div>
        </div>

        <!-- Nav items -->
        <template v-else>
          <template v-for="(item, index) in navItems" :key="index">
            
            <!-- Section Header -->
            <div 
              v-if="item.isSectionHeader" 
              class="pt-4 pb-1 px-3"
            >
              <div v-if="!appStore.sidebarCollapsed" class="flex items-center gap-2">
                <i :class="[item.icon, 'text-[10px] text-gray-400 dark:text-gray-500']"></i>
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {{ item.label }}
                </span>
              </div>
              <div v-else class="border-t border-gray-100 dark:border-gray-800 my-2"></div>
            </div>

            <!-- Router Link Item -->
            <router-link
              v-else-if="!item.isSectionHeader"
              :to="item.to"
              class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="isActive(item.to)
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700'
                : 'text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-700'"
            >
              <i :class="[item.icon, 'text-lg']"></i>
              <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ item.label }}</span>
            </router-link>

          </template>
        </template>
      </nav>

      <!-- User section -->
      <div class="border-t border-gray-200 dark:border-gray-800 p-4">
        <router-link
          to="/perfil"
          class="flex items-center rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 -mx-1 px-1 py-1"
        >
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm shrink-0 overflow-hidden">
            <img
              v-if="authStore.perfil?.avatar_url"
              :src="authStore.perfil.avatar_url"
              alt=""
              class="w-full h-full object-cover rounded-full"
              @error="(e) => e.target.style.display = 'none'"
            />
            <span v-else>{{ (authStore.perfil?.nombre || authStore.userEmail)?.charAt(0).toUpperCase() || 'U' }}</span>
          </div>
          <div v-if="!appStore.sidebarCollapsed" class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ authStore.perfil?.nombre || authStore.userEmail }}</p>
          </div>
        </router-link>
        <button
          @click="handleLogout"
          class="mt-1 w-full flex items-center px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <i class="pi pi-sign-out text-lg"></i>
          <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ t('auth.logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ $route.meta?.title || 'SIAS ERP' }}
        </h1>
        <div class="flex items-center gap-3">
          <button
            @click="appStore.setTheme(appStore.theme === 'dark' ? 'light' : 'dark')"
            class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            :title="appStore.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
          >
            <i :class="appStore.theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>
          <LanguageSelector />
        </div>
      </header>

      <!-- Breadcrumbs -->
      <nav v-if="breadcrumbs.length > 1" class="px-6 pt-4 pb-0 text-sm text-gray-500 dark:text-gray-400">
        <ol class="flex items-center gap-1.5">
          <li v-for="(crumb, i) in breadcrumbs" :key="i" class="flex items-center gap-1.5">
            <i v-if="i > 0" class="pi pi-chevron-right text-xs text-gray-300 dark:text-gray-600"></i>
            <router-link
              v-if="crumb.to"
              :to="crumb.to"
              class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {{ crumb.label }}
            </router-link>
            <span v-else class="text-gray-900 dark:text-gray-100 font-medium">{{ crumb.label }}</span>
          </li>
        </ol>
      </nav>

      <!-- Page content -->
      <div class="flex-1 overflow-auto p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
</script>

<template>
  <Toaster position="top-right" rich-colors />
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Sidebar -->
    <aside
      :class="[
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300',
        appStore.sidebarCollapsed ? 'w-16' : 'w-64',
      ]"
    >
      <!-- Logo + Empresa selector -->
      <div class="border-b border-gray-200 dark:border-gray-800">
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
            class="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500"
          >
            <option
              v-for="emp in authStore.empresas"
              :key="emp.id"
              :value="emp.id"
            >
              {{ emp.nombre }}
            </option>
          </select>
          <p v-if="currentRoleName" class="mt-1 text-xs text-gray-400 dark:text-gray-500 pl-1">
            {{ currentRoleName }}
          </p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-3 overflow-y-auto space-y-1">
        <!-- Home -->
        <router-link
          to="/"
          class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-700"
          :class="$route.path === '/' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700' : 'text-gray-600 dark:text-gray-400'"
        >
          <i class="pi pi-home text-lg"></i>
          <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ t('nav.home') }}</span>
        </router-link>

        <!-- Separator -->
        <div v-if="!appStore.sidebarCollapsed && dentroDePanaderia" class="pt-3 pb-1">
          <div class="flex items-center gap-2 px-3">
            <i class="pi pi-shop text-gray-400 dark:text-gray-500 text-xs"></i>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {{ t('nav.sectionPanaderia') }}
            </span>
          </div>
        </div>
        <div
          v-if="appStore.sidebarCollapsed && dentroDePanaderia"
          class="border-t border-gray-100 dark:border-gray-800 my-2"
        ></div>

        <!-- Panadería items -->
        <template v-if="dentroDePanaderia">
          <router-link
            v-for="item in panaderiaItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.to) && $route.path !== '/'
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700'
              : 'text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-700'"
          >
            <i :class="[item.icon, 'text-lg']"></i>
            <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ item.label }}</span>
          </router-link>
        </template>

        <!-- Admin section -->
        <template v-if="adminItems.length && dentroDeAdmin">
          <div v-if="!appStore.sidebarCollapsed" class="pt-3 pb-1">
            <div class="flex items-center gap-2 px-3">
              <i class="pi pi-cog text-gray-400 dark:text-gray-500 text-xs"></i>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {{ t('nav.sectionAdmin') }}
              </span>
            </div>
          </div>
          <div
            v-if="appStore.sidebarCollapsed"
            class="border-t border-gray-100 dark:border-gray-800 my-2"
          ></div>

          <router-link
            v-for="item in adminItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="$route.path === item.to
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700'
              : 'text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-700'"
          >
            <i :class="[item.icon, 'text-lg']"></i>
            <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <!-- User section -->
      <div class="border-t border-gray-200 dark:border-gray-800 p-4">
        <router-link
          to="/perfil"
          class="flex items-center rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 -mx-1 px-1 py-1"
        >
          <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm shrink-0 overflow-hidden">
            <img
              v-if="authStore.perfil?.avatar_url"
              :src="authStore.perfil.avatar_url"
              alt=""
              class="w-full h-full object-cover rounded-full"
              @error="(e) => e.target.style.display = 'none'"
            />
            <span v-else>{{ (authStore.perfil?.nombre || authStore.userEmail)?.charAt(0).toUpperCase() || 'U' }}</span>
          </div>
          <div v-if="!appStore.sidebarCollapsed" class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ authStore.perfil?.nombre || authStore.userEmail }}</p>
          </div>
        </router-link>
        <button
          @click="handleLogout"
          class="mt-1 w-full flex items-center px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <i class="pi pi-sign-out text-lg"></i>
          <span v-if="!appStore.sidebarCollapsed" class="ml-3">{{ t('auth.logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ $route.meta?.title || 'SIAS ERP' }}
        </h1>
        <div class="flex items-center gap-3">
          <button
            @click="appStore.setTheme(appStore.theme === 'dark' ? 'light' : 'dark')"
            class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            :title="appStore.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
          >
            <i :class="appStore.theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>
          <LanguageSelector />
        </div>
      </header>

      <!-- Breadcrumbs -->
      <nav v-if="breadcrumbs.length > 1" class="px-6 pt-4 pb-0 text-sm text-gray-500 dark:text-gray-400">
        <ol class="flex items-center gap-1.5">
          <li v-for="(crumb, i) in breadcrumbs" :key="i" class="flex items-center gap-1.5">
            <i v-if="i > 0" class="pi pi-chevron-right text-xs text-gray-300 dark:text-gray-600"></i>
            <router-link
              v-if="crumb.to"
              :to="crumb.to"
              class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {{ crumb.label }}
            </router-link>
            <span v-else class="text-gray-900 dark:text-gray-100 font-medium">{{ crumb.label }}</span>
          </li>
        </ol>
      </nav>

      <!-- Page content -->
      <div class="flex-1 overflow-auto p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
