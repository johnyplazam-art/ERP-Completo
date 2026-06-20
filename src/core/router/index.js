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
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/core/components/ForgotPasswordView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/core/components/ResetPasswordView.vue'),
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
        path: 'perfil',
        name: 'perfil',
        component: () => import('@/core/components/PerfilView.vue'),
        meta: { title: 'Mi Perfil' },
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
      {
        path: 'admin/planes',
        name: 'admin-planes',
        component: () => import('@/core/components/AdminPlanes.vue'),
        meta: { title: 'Planes', role: 'admin' },
      },
      {
        path: 'admin/suscripciones',
        name: 'admin-suscripciones',
        component: () => import('@/core/components/AdminSuscripciones.vue'),
        meta: { title: 'Suscripciones', role: 'admin' },
      },
      // Platform admin routes
      {
        path: 'admin/empresas',
        name: 'admin-empresas',
        component: () => import('@/core/components/AdminAllEmpresas.vue'),
        meta: { title: 'Todas las Empresas', platformAdmin: true },
      },
      {
        path: 'admin/todos-usuarios',
        name: 'admin-todos-usuarios',
        component: () => import('@/core/components/AdminUsers.vue'),
        meta: { title: 'Todos los Usuarios', platformAdmin: true },
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

  if (to.meta.platformAdmin && !authStore.isPlatformAdmin) {
    next({ name: 'home' })
    return
  }

  next()
})

export default router
