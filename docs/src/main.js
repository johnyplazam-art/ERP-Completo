import { createApp } from 'https://cdn.jsdelivr.net/npm/vue@3.4.27/dist/vue.esm-browser.prod.js'
import { createPinia } from 'https://cdn.jsdelivr.net/npm/pinia@2.1.7/dist/pinia.esm-browser.prod.js'
import { RouterLink, RouterView } from 'https://cdn.jsdelivr.net/npm/vue-router@4.3.2/dist/vue-router.esm-browser.prod.js'
import { createRouter, createWebHashHistory } from 'https://cdn.jsdelivr.net/npm/vue-router@4.3.2/dist/vue-router.esm-browser.prod.js'
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.6.7/dist/axios.esm.js'
import '../styles/tailwind.css'

import ProductTable from './components/ProductTable.vue'
import ProductFormModal from './components/ProductFormModal.vue'

const api = axios.create({
  baseURL: 'https://script.google.com/macros/s/AKfycbz.../exec', // TODO: replace with actual deployment URL
  timeout: 10000
})

// Request interceptor to attach JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sias_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle 401
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) {
    localStorage.removeItem('sias_token')
    // Optionally redirect to login
  }
  return Promise.reject(error)
})

const routes = [
  { path: '/', name: 'ProductList', component: ProductTable },
  { path: '/productos/nuevo', name: 'ProductCreate', component: ProductFormModal },
  { path: '/productos/:id/editar', name: 'ProductEdit', component: ProductFormModal, props: true }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const pinia = createPinia()

const app = createApp({
  template: `
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <img class="h-8 w-auto" src="https://via.placeholder.com/40" alt="SIAS Logo">
              </div>
              <div class="hidden md:block">
                <div class="ml-10 flex items-baseline space-x-4">
                  <RouterLink to="/" class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">Inicio</RouterLink>
                  <RouterLink to="/productos/nuevo" class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">Nuevo Producto</RouterLink>
                </div>
              </div>
            </div>
            <div class="hidden md:block">
              <div class="ml-4 flex items-baseline space-x-4">
                <button @click="logout" class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  `
})

app.use(pinia)
app.use(router)
app.mount('#app')

function logout() {
  localStorage.removeItem('sias_token')
  router.push('/')
}