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
    redirect: '/panaderia',
    children: [
      {
        path: 'panaderia',
        name: 'panaderia',
        children: panaderiaRoutes,
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
