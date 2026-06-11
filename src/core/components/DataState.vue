<script setup>
/**
 * DataState — maneja los estados loading / error / empty / data
 *
 * Uso:
 *   <DataState :loading="isLoading" :error="error" :empty="!items?.length" empty-icon="pi pi-box" empty-text="Sin items">
 *     <table>...data...</table>
 *   </DataState>
 *
 * Slots:
 *   default (contenido cuando hay datos)
 *   loading (personalizar spinner)
 *   error (personalizar mensaje de error)
 *   empty (personalizar mensaje vacío)
 */
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [Error, String], default: null },
  empty: { type: Boolean, default: false },
  emptyIcon: { type: String, default: 'pi pi-inbox' },
  emptyText: { type: String, default: 'No hay datos' },
  loadingText: { type: String, default: 'Cargando...' },
})
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="text-center py-12 text-gray-400">
    <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
    <p>
      <slot name="loading">{{ loadingText }}</slot>
    </p>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
    <slot name="error">{{ typeof error === 'string' ? error : error?.message || 'Error desconocido' }}</slot>
  </div>

  <!-- Empty -->
  <div v-else-if="empty" class="text-center py-12 text-gray-400">
    <i :class="`${emptyIcon} text-4xl mb-3`"></i>
    <p>
      <slot name="empty">{{ emptyText }}</slot>
    </p>
  </div>

  <!-- Data (default slot) -->
  <slot v-else />
</template>
