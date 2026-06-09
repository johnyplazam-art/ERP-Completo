<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'

const { locale } = useI18n()
const authStore = useAuthStore()
const showMenu = ref(false)

const languages = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
]

function cambiarIdioma(code) {
  locale.value = code
  authStore.guardarIdioma(code)
  showMenu.value = false
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 rounded transition-colors"
      @click="showMenu = !showMenu"
      @blur="showMenu = false"
    >
      <i class="pi pi-globe text-base"></i>
      <span class="hidden sm:inline uppercase">{{ locale }}</span>
      <i class="pi pi-chevron-down text-xs"></i>
    </button>

    <div
      v-if="showMenu"
      class="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
    >
      <button
        v-for="lang in languages"
        :key="lang.code"
        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        :class="{ 'font-semibold text-primary-600': locale === lang.code }"
        @mousedown.prevent="cambiarIdioma(lang.code)"
      >
        {{ lang.label }}
      </button>
    </div>
  </div>
</template>
