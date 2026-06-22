<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/core/supabase'

const { t } = useI18n()
const router = useRouter()

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function handleSubmit() {
  loading.value = true
  error.value = ''
  sent.value = false

  try {
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}/#/reset-password`,
    })
    if (err) throw err
    sent.value = true
  } catch (err) {
    error.value = t('forgotPassword.error')
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
        <p class="mt-2 text-gray-500">{{ t('forgotPassword.subtitle') }}</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        <h2 class="text-lg font-semibold text-gray-900 mb-6">{{ t('forgotPassword.title') }}</h2>

        <div
          v-if="error"
          class="mb-4 px-4 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded"
        >
          {{ error }}
        </div>

        <div
          v-if="sent"
          class="mb-4 px-4 py-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded"
        >
          {{ t('forgotPassword.sent') }}
        </div>

        <form v-if="!sent" @submit.prevent="handleSubmit" class="space-y-4">
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

          <button
            type="submit"
            :disabled="loading"
            class="w-full touch-input flex items-center justify-center bg-primary-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            {{ loading ? t('forgotPassword.sending') : t('forgotPassword.sendLink') }}
          </button>
        </form>

        <div class="mt-4 text-center text-sm text-gray-500">
          <button
            type="button"
            @click="router.push('/login')"
            class="text-primary-600 font-medium hover:underline"
          >
            {{ t('forgotPassword.backToLogin') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
