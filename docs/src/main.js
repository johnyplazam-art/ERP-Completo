import { createApp } from 'https://cdn.jsdelivr.net/npm/vue@3.4.27/dist/vue.esm-browser.prod.js'
import { createPinia } from 'https://cdn.jsdelivr.net/npm/pinia@2.1.7/dist/pinia.esm-browser.js'
import { RouterLink, RouterView } from 'https://cdn.jsdelivr.net/npm/vue-router@4.3.2/dist/vue-router.esm-browser.js'
import { createRouter, createWebHashHistory } from 'https://cdn.jsdelivr.net/npm/vue-router@4.3.2/dist/vue-router.esm-browser.js'
import ProductTable from './components/ProductTable.js'
import ProductFormModal from './components/ProductFormModal.js'

// Use shared axios instance from api module
import api from './api/axiosInstance.js'
// Make it globally available for login in the template
window.$api = api

// Routes
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
      <!-- Simple error display -->
      <div v-if="globalError" class="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-6 py-3 text-center text-sm">
        {{ globalError }}
        <button @click="globalError = ''" class="ml-3 underline hover:no-underline">Cerrar</button>
      </div>
      <nav class="bg-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <span class="text-xl font-bold text-indigo-600">SIAS ERP</span>
              </div>
              <div class="hidden md:block">
                <div class="ml-10 flex items-baseline space-x-4">
                  <RouterLink to="/" class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Inicio</RouterLink>
                  <RouterLink to="/productos/nuevo" class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Nuevo Producto</RouterLink>
                </div>
              </div>
            </div>
            <div class="hidden md:block">
              <div class="ml-4 flex items-baseline space-x-4">
                <button v-if="isLoggedIn" @click="logout" class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cerrar sesi\u00f3n ({{ username }})
                </button>
                <button v-else @click="showLogin = true" class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Iniciar sesi\u00f3n
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

    <!-- Login Modal -->
    <div v-if="showLogin" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showLogin = false">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Iniciar Sesi\u00f3n</h2>
        <div v-if="loginError" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 text-sm mb-4">{{ loginError }}</div>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input v-model="loginForm.username" type="text" required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contrase\u00f1a</label>
            <input v-model="loginForm.password" type="password" required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
          </div>
          <button type="submit" :disabled="loginLoading"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {{ loginLoading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      showLogin: false,
      loginForm: { username: '', password: '' },
      loginLoading: false,
      loginError: '',
      globalError: ''
    }
  },
  computed: {
    isLoggedIn() {
      return !!this.$store?.token
    },
    username() {
      return this.$store?.username || ''
    }
  },
  methods: {
    async handleLogin() {
      this.loginLoading = true
      this.loginError = ''
      try {
        const resp = await window.$api.post('', {
          action: 'authenticate',
          params: this.loginForm
        })
        if (resp.data.success) {
          localStorage.setItem('sias_token', resp.data.data.token)
          if (this.$store) {
            this.$store.token = resp.data.data.token
            this.$store.username = this.loginForm.username
          }
          this.showLogin = false
          this.loginForm = { username: '', password: '' }
          // Reload products
          window.location.reload()
        } else {
          this.loginError = resp.data.error || 'Credenciales inv\u00e1lidas'
        }
      } catch (err) {
        this.loginError = err.message || 'Error de conexi\u00f3n'
      } finally {
        this.loginLoading = false
      }
    },
    logout() {
      localStorage.removeItem('sias_token')
      if (this.$store) {
        this.$store.token = null
        this.$store.username = ''
      }
      this.$router.push('/')
    }
  }
})

// Simple global store for auth state
app.config.globalProperties.$store = {
  token: localStorage.getItem('sias_token') || null,
  username: ''
}

app.use(pinia)
app.use(router)
app.mount('#app')
