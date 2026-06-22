<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'
import IndustrySelector from '@/core/components/IndustrySelector.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()

// ─── Form fields ──────────────────────────────────────

const email = ref('')
const password = ref('')
const nombre = ref('')
const empresa = ref('')
const invitacion = ref('')
const industria = ref('panaderia')

const loading = ref(false)
const error = ref('')
const success = ref('')
const mode = ref('login')
const step = ref(1) // 1 = account form, 2 = industry selection

// ─── Computed ─────────────────────────────────────────

const isSignup = computed(() => mode.value === 'signup')
const isInvitation = computed(() => !!invitacion.value?.trim())

// ─── Toggle login / signup ────────────────────────────

function toggleMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  step.value = 1
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
    error.value = err.message || t('auth.loginError')
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
      industria: industria.value,
    }

    if (isInvitation.value) {
      metadata.invitacion = invitacion.value.trim()
    } else {
      metadata.empresa = empresa.value.trim() || 'Mi Empresa'
    }

    const { data } = await authStore.signup(email.value, password.value, metadata)

    if (data?.user?.identities?.length === 0) {
      error.value = t('auth.emailExists')
    } else if (data?.user?.confirmation_sent_at) {
      success.value = isInvitation.value
        ? t('auth.confirmEmail')
        : t('auth.confirmEmail')
    } else {
      success.value = isInvitation.value
        ? t('auth.successJoin')
        : t('auth.successNewCompany')
    }
  } catch (err) {
    error.value = err.message || t('auth.signupError')
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  if (mode.value === 'login') {
    handleLogin()
    return
  }

  // Signup multi-step: form → industry selector → submit
  if (step.value === 1) {
    error.value = ''
    // Basic validation before moving to industry selection
    if (!nombre.value.trim()) {
      error.value = t('auth.nameRequired')
      return
    }
    step.value = 2
  } else {
    handleSignup()
  }
}

function volverAlFormulario() {
  step.value = 1
  error.value = ''
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
          {{ isSignup ? t('auth.subtitleSignup') : t('auth.subtitleLogin') }}
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <!-- Title -->
        <h2 class="text-lg font-semibold text-gray-900 mb-6">
          {{ isSignup ? t('auth.signupTitle') : t('auth.loginTitle') }}
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
              {{ t('auth.email') }}
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              :placeholder="t('auth.emailPlaceholder')"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('auth.password') }}
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
            <!-- Step 1: Account details -->
            <template v-if="step === 1">
              <hr class="border-gray-200" />

              <!-- Full name -->
              <div>
              <label for="nombre" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('auth.fullName') }} <span class="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                v-model="nombre"
                type="text"
                required
                autocomplete="name"
                :placeholder="t('auth.fullNamePlaceholder')"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
                />
              </div>

              <!-- Invitation code (pre-filled from URL if present) -->
              <div>
                <label for="invitacion" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('auth.invitationCode') }}
                  <span class="text-gray-400 font-normal">{{ t('auth.invitationOptional') }}</span>
                </label>
                <input
                  id="invitacion"
                  v-model="invitacion"
                  type="text"
                  autocomplete="off"
                  :placeholder="t('auth.invitationPlaceholder')"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
                />
                <p class="mt-1 text-xs text-gray-400">
                  {{ isInvitation ? t('auth.joinCompany') : t('auth.noCodeAutoCreate') }}
                </p>
              </div>

              <!-- Company name (only if no invitation) -->
              <div v-if="!isInvitation">
                <label for="empresa" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('auth.companyName') }}
                  <span class="text-gray-400 font-normal">{{ t('auth.invitationOptional') }}</span>
                </label>
                <input
                  id="empresa"
                  v-model="empresa"
                  type="text"
                  autocomplete="organization"
                  :placeholder="t('auth.companyPlaceholder')"
                  class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
                />
                <p class="mt-1 text-xs text-gray-400">
                  {{ t('auth.companyDefault') }}
                </p>
              </div>

              <!-- Info box when using invitation -->
              <div
                v-if="isInvitation"
                class="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700"
              >
                <i class="pi pi-info-circle mr-1"></i>
                {{ t('auth.joinInfo') }}
              </div>

              <!-- Submit button (step 1 → goes to industry selection) -->
              <button
                type="submit"
                :disabled="loading"
                class="w-full touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ t('auth.continue') }} <i class="pi pi-chevron-right ml-2 text-sm"></i>
              </button>
            </template>

            <!-- Step 2: Industry selection -->
            <template v-if="step === 2">
              <hr class="border-gray-200" />

              <IndustrySelector v-model="industria" />

              <p class="mt-2 text-xs text-gray-400">
                {{ t('auth.chooseIndustry') }}
              </p>

              <!-- Submit button (step 2 → create account) -->
              <div class="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  @click="volverAlFormulario"
                  class="touch-input flex items-center justify-center text-gray-600 font-medium rounded-lg px-4 py-2.5 text-sm hover:text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  <i class="pi pi-chevron-left mr-1 text-sm"></i>
                  {{ t('auth.back') }}
                </button>
                <button
                  type="submit"
                  :disabled="loading"
                  class="flex-1 touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
                  {{ loading ? t('auth.creatingAccount') : t('auth.createAccount') }}
                </button>
              </div>
            </template>
          </template>

          <!-- Forgot password (login only) -->
          <div v-if="mode === 'login'" class="text-right">
            <router-link
              to="/forgot-password"
              class="text-sm text-primary-600 hover:underline font-medium"
            >
              {{ t('auth.forgotPassword') }}
            </router-link>
          </div>

          <!-- Submit button (login only — signup uses step-specific buttons) -->
          <button
            v-if="mode === 'login'"
            type="submit"
            :disabled="loading"
            class="w-full touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            {{ loading
              ? (isSignup ? t('auth.creatingAccount') : t('auth.loginLoading'))
              : t('auth.loginButton')
            }}
          </button>
        </form>

        <!-- Toggle mode -->
        <div v-if="!success" class="mt-4 text-center text-sm text-gray-500">
          <template v-if="isSignup">
            ¿Ya tenés cuenta?
            <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline ml-1">
              {{ t('auth.toggleLogin') }}
            </button>
          </template>
          <template v-else>
            ¿No tenés cuenta?
            <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline ml-1">
              {{ t('auth.toggleSignup') }}
            </button>
          </template>
        </div>
        <div v-else class="mt-4 text-center text-sm text-gray-500">
          <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline">
            {{ t('auth.backToLogin') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
