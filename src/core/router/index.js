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
        meta: { title: 'Usuarios', role: 'admin' },
      },
      {
        path: 'admin/apps',
        name: 'admin-apps',
        component: () => import('@/core/components/AdminApps.vue'),
        meta: { title: 'Aplicaciones', role: 'admin' },
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

  if (authStore.loading) {
    next()
    return
  }

  if (authStore.isAuthenticated && to.name === 'login') {
    next({ name: 'home' })
    return
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.role === 'admin' && !authStore.esAdmin) {
    next({ name: 'home' })
    return
  }

  next()
})

export default router
