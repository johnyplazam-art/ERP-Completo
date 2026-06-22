<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [Error, String], default: null },
  empty: { type: Boolean, default: false },
  emptyIcon: { type: String, default: 'pi pi-inbox' },
  emptyText: { type: String, default: '' },
  loadingText: { type: String, default: '' },
})
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="text-center py-12 text-gray-400">
    <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
    <p>
      <slot name="loading">{{ loadingText || t('datastate.loading') }}</slot>
    </p>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
    <slot name="error">{{ typeof error === 'string' ? error : error?.message || t('datastate.unknownError') }}</slot>
  </div>

  <!-- Empty -->
  <div v-else-if="empty" class="text-center py-12 text-gray-400">
    <i :class="`${emptyIcon} text-4xl mb-3`"></i>
    <p>
      <slot name="empty">{{ emptyText || t('datastate.empty') }}</slot>
    </p>
  </div>

  <!-- Data (default slot) -->
  <slot v-else />
</template>
