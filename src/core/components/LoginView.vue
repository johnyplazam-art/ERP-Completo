<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const mode = ref('login')

function toggleMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  error.value = ''
  success.value = ''
}

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}

async function handleSignup() {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const { data } = await authStore.signup(email.value, password.value)
    if (data?.user?.identities?.length === 0) {
      error.value = 'Este correo ya está registrado. Iniciá sesión.'
    } else if (data?.user?.confirmation_sent_at) {
      success.value = 'Registrado correctamente. Revisá tu correo para confirmar la cuenta.'
    } else {
      success.value = 'Cuenta creada correctamente. Ya podés iniciar sesión.'
    }
  } catch (err) {
    error.value = err.message || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">SIAS ERP</h1>
        <p class="mt-2 text-gray-500">Sistema de Gestión de Panadería</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">
          {{ mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta' }}
        </h2>

        <!-- Error -->
        <div
          v-if="error"
          class="mb-4 px-4 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded"
        >
          {{ error }}
        </div>

        <!-- Success -->
        <div
          v-if="success"
          class="mb-4 px-4 py-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded"
        >
          {{ success }}
        </div>

        <form
          v-if="mode === 'login' || !success"
          @submit.prevent="mode === 'login' ? handleLogin() : handleSignup()"
          class="space-y-4"
        >
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="correo@ejemplo.com"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              placeholder="••••••••"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            {{ loading
              ? (mode === 'login' ? 'Ingresando...' : 'Registrando...')
              : (mode === 'login' ? 'Ingresar' : 'Crear Cuenta')
            }}
          </button>
        </form>

        <div v-if="!success" class="mt-4 text-center text-sm text-gray-500">
          <template v-if="mode === 'login'">
            ¿No tenés cuenta?
            <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline ml-1">
              Registrarse
            </button>
          </template>
          <template v-else>
            ¿Ya tenés cuenta?
            <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline ml-1">
              Iniciar Sesión
            </button>
          </template>
        </div>
        <div v-else class="mt-4 text-center text-sm text-gray-500">
          <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline">
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
