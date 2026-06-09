<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/core/store/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// ─── Form fields ──────────────────────────────────────

const email = ref('')
const password = ref('')
const nombre = ref('')
const empresa = ref('')
const invitacion = ref('')

const loading = ref(false)
const error = ref('')
const success = ref('')
const mode = ref('login')

// ─── Computed ─────────────────────────────────────────

const isSignup = computed(() => mode.value === 'signup')
const isInvitation = computed(() => !!invitacion.value?.trim())

// ─── Toggle login / signup ────────────────────────────

function toggleMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  error.value = ''
  success.value = ''
  if (mode.value === 'login') {
    invitacion.value = ''
  }
}

// ─── Actions ──────────────────────────────────────────

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
    const metadata = {
      nombre: nombre.value.trim(),
    }

    if (isInvitation.value) {
      metadata.invitacion = invitacion.value.trim()
    } else {
      metadata.empresa = empresa.value.trim() || 'Mi Empresa'
    }

    const { data } = await authStore.signup(email.value, password.value, metadata)

    if (data?.user?.identities?.length === 0) {
      error.value = 'Este correo ya está registrado. Iniciá sesión.'
    } else if (data?.user?.confirmation_sent_at) {
      success.value = isInvitation.value
        ? 'Te registraste correctamente. Revisá tu correo para confirmar y acceder a la empresa.'
        : 'Empresa creada correctamente. Revisá tu correo para confirmar la cuenta.'
    } else {
      success.value = isInvitation.value
        ? 'Todo listo. Ya podés iniciar sesión y acceder a la empresa.'
        : 'Empresa creada correctamente. Ya podés iniciar sesión.'
    }
  } catch (err) {
    error.value = err.message || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  if (mode.value === 'login') {
    handleLogin()
  } else {
    handleSignup()
  }
}

// ─── Leer invitación desde URL ───────────────────────
// Soporta: /login?invitacion=emp-xxx
onMounted(() => {
  const code = route.query.invitacion
  if (code) {
    invitacion.value = code
    mode.value = 'signup'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">SIAS ERP</h1>
        <p class="mt-2 text-gray-500">
          {{ isSignup ? 'Creá tu empresa y empezá a gestionar' : 'Sistema de Gestión de Panadería' }}
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <!-- Title -->
        <h2 class="text-lg font-semibold text-gray-900 mb-6">
          {{ isSignup ? 'Crear Cuenta y Empresa' : 'Iniciar Sesión' }}
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

        <!-- Form -->
        <form
          v-if="!isSignup || !success"
          @submit.prevent="handleSubmit"
          class="space-y-4"
        >
          <!-- Email -->
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
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
            />
          </div>

          <!-- Password -->
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
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
            />
          </div>

          <!-- Signup-only fields -->
          <template v-if="isSignup">
            <hr class="border-gray-200" />

            <!-- Full name -->
            <div>
              <label for="nombre" class="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo <span class="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                v-model="nombre"
                type="text"
                required
                autocomplete="name"
                placeholder="Tu nombre"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
              />
            </div>

            <!-- Invitation code (pre-filled from URL if present) -->
            <div>
              <label for="invitacion" class="block text-sm font-medium text-gray-700 mb-1">
                Código de invitación
                <span class="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="invitacion"
                v-model="invitacion"
                type="text"
                autocomplete="off"
                placeholder="Si te invitaron a una empresa, poné el código"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
              />
              <p class="mt-1 text-xs text-gray-400">
                {{ isInvitation
                  ? 'Te vas a unir a una empresa existente.'
                  : 'Si no tenés código, se creará una empresa nueva automáticamente.'
                }}
              </p>
            </div>

            <!-- Company name (only if no invitation) -->
            <div v-if="!isInvitation">
              <label for="empresa" class="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la empresa
                <span class="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="empresa"
                v-model="empresa"
                type="text"
                autocomplete="organization"
                placeholder="Mi Panadería"
                class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
              />
              <p class="mt-1 text-xs text-gray-400">
                Si no ponés nombre, se usará "Mi Empresa".
              </p>
            </div>

            <!-- Info box when using invitation -->
            <div
              v-if="isInvitation"
              class="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700"
            >
              <i class="pi pi-info-circle mr-1"></i>
              Te vas a unir a una empresa existente como usuario secundario.
              El dueño de la empresa podrá asignarte un rol.
            </div>
          </template>

          <!-- Submit button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            <template v-if="loading">
              {{ isSignup ? 'Creando cuenta...' : 'Ingresando...' }}
            </template>
            <template v-else>
              {{ isSignup ? 'Crear Cuenta y Empresa' : 'Ingresar' }}
            </template>
          </button>
        </form>

        <!-- Toggle mode -->
        <div v-if="!success" class="mt-4 text-center text-sm text-gray-500">
          <template v-if="isSignup">
            ¿Ya tenés cuenta?
            <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline ml-1">
              Iniciar Sesión
            </button>
          </template>
          <template v-else>
            ¿No tenés cuenta?
            <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline ml-1">
              Crear Cuenta y Empresa
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
