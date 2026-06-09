import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'
import panaderiaRoutes from '@/modules/panaderia/routes'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/core/components/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/core/components/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/core/components/HomeDashboard.vue'),
        meta: { title: 'SIAS ERP' },
      },
      {
        path: 'panaderia',
        name: 'panaderia',
        children: panaderiaRoutes,
      },
      {
        path: 'admin/usuarios',
        name: 'admin-usuarios',
        component: () => import('@/core/components/AdminUsers.vue'),
        meta: { title: 'Usuarios' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Si todavía está cargando la sesión, no redirigir todavía.
  // App.vue se encarga del redirect inicial después de initialize().
  if (authStore.loading) {
    next()
    return
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    if (to.name !== 'login') {
      next({ name: 'login' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
