import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { RouterLink, RouterView, createRouter, createWebHashHistory } from 'vue-router'

import ProductTable from './components/ProductTable.js'
import ProductFormModal from './components/ProductFormModal.js'

import { supabaseAuth } from './api/supabase.js'

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
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input v-model="loginForm.email" type="email" required
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
          <p class="text-xs text-gray-500 text-center mt-2">
            \u00bfNo ten\u00e9s cuenta? 
            <a href="#" @click.prevent="showSignup = true; showLogin = false" class="text-indigo-600 hover:underline">Registrarse</a>
          </p>
        </form>
      </div>
    </div>

    <!-- Signup Modal -->
    <div v-if="showSignup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showSignup = false">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Crear Cuenta</h2>
        <div v-if="signupError" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 text-sm mb-4">{{ signupError }}</div>
        <div v-if="signupSuccess" class="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 text-sm mb-4">{{ signupSuccess }}</div>
        <form @submit.prevent="handleSignup" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input v-model="signupForm.email" type="email" required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contrase\u00f1a</label>
            <input v-model="signupForm.password" type="password" required minlength="6"
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
          </div>
          <button type="submit" :disabled="signupLoading"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {{ signupLoading ? 'Creando...' : 'Crear Cuenta' }}
          </button>
          <p class="text-xs text-gray-500 text-center mt-2">
            \u00bfYa ten\u00e9s cuenta? 
            <a href="#" @click.prevent="showSignup = false; showLogin = true" class="text-indigo-600 hover:underline">Iniciar sesi\u00f3n</a>
          </p>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      showLogin: false,
      showSignup: false,
      loginForm: { email: '', password: '' },
      signupForm: { email: '', password: '' },
      signupSuccess: '',
      loginLoading: false,
      signupLoading: false,
      loginError: '',
      signupError: '',
      globalError: ''
    }
  },
  computed: {
    isLoggedIn() {
      return !!localStorage.getItem('sias_token')
    },
    username() {
      return localStorage.getItem('sias_user') || ''
    }
  },
  methods: {
    async handleLogin() {
      this.loginLoading = true
      this.loginError = ''
      try {
        const data = await supabaseAuth.login(this.loginForm.email, this.loginForm.password)
        localStorage.setItem('sias_token', data.access_token)
        localStorage.setItem('sias_user', data.user?.email || this.loginForm.email)
        this.showLogin = false
        this.loginForm = { email: '', password: '' }
        window.location.reload()
      } catch (err) {
        this.loginError = err.message
      } finally {
        this.loginLoading = false
      }
    },
    async handleSignup() {
      this.signupLoading = true
      this.signupError = ''
      this.signupSuccess = ''
      try {
        const data = await supabaseAuth.signup(this.signupForm.email, this.signupForm.password)
        if (data?.user?.identities?.length === 0) {
          this.signupError = 'Este email ya est\u00e1 registrado'
        } else {
          this.signupSuccess = 'Cuenta creada. Revis\u00e1 tu email para confirmar.'
          this.signupForm = { email: '', password: '' }
        }
      } catch (err) {
        this.signupError = err.message
      } finally {
        this.signupLoading = false
      }
    },
    logout() {
      supabaseAuth.logout()
      this.$router.push('/')
    }
  }
})

app.config.globalProperties.$store = {
  token: localStorage.getItem('sias_token') || null,
  username: localStorage.getItem('sias_user') || ''
}

app.use(pinia)
app.use(router)
app.mount('#app')
