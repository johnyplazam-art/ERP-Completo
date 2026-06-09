<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  total: { type: Number, required: true },
})

const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.page - 1) * props.pageSize + 1)
const to = computed(() => Math.min(props.page * props.pageSize, props.total))

function go(p) {
  const n = Math.max(1, Math.min(p, totalPages.value))
  if (n !== props.page) emit('update:page', n)
}
</script>

<template>
  <div
    v-if="total > pageSize"
    class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200"
  >
    <!-- Info -->
    <p class="text-sm text-gray-500">
      {{ from }}–{{ to }} de {{ total }}
    </p>

    <!-- Controls -->
    <div class="flex items-center gap-1">
      <button
        :disabled="page <= 1"
        @click="go(page - 1)"
        class="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <i class="pi pi-chevron-left text-xs"></i>
      </button>

      <button
        v-for="p in totalPages"
        :key="p"
        @click="go(p)"
        class="min-w-[32px] px-2 py-1 text-sm rounded border transition-colors"
        :class="p === page
          ? 'bg-primary-600 text-white border-primary-600'
          : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
      >
        {{ p }}
      </button>

      <button
        :disabled="page >= totalPages"
        @click="go(page + 1)"
        class="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <i class="pi pi-chevron-right text-xs"></i>
      </button>
    </div>
  </div>
</template>
