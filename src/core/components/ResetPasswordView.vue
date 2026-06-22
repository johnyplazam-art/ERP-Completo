<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/core/supabase'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const ready = ref(false)

function parseRecoveryFromHash() {
  const hash = window.location.hash
  // hash = "#/reset-password#access_token=xxx&type=recovery&..."
  const match = hash.match(/#\/reset-password#(.+)/)
  if (!match) return null

  const params = new URLSearchParams(match[1])
  if (params.get('type') !== 'recovery') return null

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  }
}

onMounted(async () => {
  const tokens = parseRecoveryFromHash()
  if (!tokens?.accessToken) {
    error.value = t('resetPassword.invalidLink')
    return
  }

  try {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? '',
    })
    if (sessionError) throw sessionError
    ready.value = true
    // Clean hash so the route matches cleanly
    window.history.replaceState(null, '', '/#/reset-password')
  } catch (err) {
    error.value = t('resetPassword.linkExpired')
  }
})

async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    error.value = t('resetPassword.passwordMismatch')
    return
  }
  if (password.value.length < 6) {
    error.value = t('resetPassword.minLength')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const { error: updateError } = await supabase.auth.updateUser({ password: password.value })
    if (updateError) throw updateError
    success.value = t('resetPassword.success')
    setTimeout(() => router.push('/login'), 2000)
  } catch (err) {
    error.value = err.message || t('resetPassword.updateError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">SIAS ERP</h1>
        <p class="mt-2 text-gray-500">{{ t('resetPassword.subtitle') }}</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">{{ t('resetPassword.title') }}</h2>

        <div
          v-if="error"
          class="mb-4 px-4 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded"
        >
          {{ error }}
        </div>

        <div
          v-if="success"
          class="mb-4 px-4 py-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded"
        >
          {{ success }} — {{ t('resetPassword.redirecting') }}
        </div>

        <div v-if="!ready && !error" class="text-center py-8 text-gray-400">
          <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
          {{ t('resetPassword.verifying') }}
        </div>

        <form v-if="ready && !success" @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('resetPassword.newPassword') }}
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              :placeholder="t('resetPassword.placeholderMinChars')"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('resetPassword.confirmPassword') }}
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              :placeholder="t('resetPassword.placeholderRepeat')"
              class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            {{ loading ? t('resetPassword.updating') : t('resetPassword.updateButton') }}
          </button>
        </form>

        <div v-if="error && !ready" class="mt-4 text-center text-sm text-gray-500">
          <button
            type="button"
            @click="router.push('/forgot-password')"
            class="text-primary-600 font-medium hover:underline"
          >
            {{ t('resetPassword.requestNewLink') }}
          </button>
        </div>

        <div v-if="!ready && !error" class="mt-4 text-center text-sm text-gray-500">
          <button
            type="button"
            @click="router.push('/login')"
            class="text-primary-600 font-medium hover:underline"
          >
            {{ t('resetPassword.backToLogin') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
