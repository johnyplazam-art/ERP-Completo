<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataState from '@/core/components/DataState.vue'
import PaginatorBar from '../components/PaginatorBar.vue'
import { useAuditLogsPaginated } from '../composables/queries'

const { t } = useI18n()

const filterAction = ref('')
const filterTable = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const filters = computed(() => ({
  action: filterAction.value || undefined,
  table: filterTable.value ? `%${filterTable.value}%` : undefined,
  dateFrom: filterDateFrom.value ? new Date(filterDateFrom.value).toISOString() : undefined,
  dateTo: filterDateTo.value ? new Date(filterDateTo.value + 'T23:59:59').toISOString() : undefined,
}))

const {
  data: logs,
  total,
  page,
  pageSize,
  totalPages,
  setPage, nextPage, prevPage,
  isLoading, error,
} = useAuditLogsPaginated(filters)

const actionsDisponibles = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAIL', 'EXPORT', 'CANCEL']

const actionBadge = (action) => {
  const map = {
    INSERT: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    LOGIN: 'bg-purple-100 text-purple-700',
    LOGIN_FAIL: 'bg-amber-100 text-amber-700',
    EXPORT: 'bg-gray-100 text-gray-700',
    CANCEL: 'bg-orange-100 text-orange-700',
  }
  return map[action] || 'bg-gray-100 text-gray-500'
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">{{ t('auditoria.title') }}</h2>
      <span class="text-sm text-gray-500">{{ total }} {{ t('auditoria.records') }}</span>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="sm:w-44">
          <select
            v-model="filterAction"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{{ t('auditoria.allActions') }}</option>
            <option v-for="a in actionsDisponibles" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="flex-1">
          <input
            v-model="filterTable"
            type="text"
            :placeholder="t('auditoria.filterTable')"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <input
            v-model="filterDateFrom"
            type="date"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <input
            v-model="filterDateTo"
            type="date"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!logs.length"
      empty-icon="pi pi-history"
      :empty-text="t('auditoria.empty')"
      :loading-text="t('auditoria.loading')"
    >
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-gray-500 font-medium">
                <th class="px-4 py-3 whitespace-nowrap">{{ t('auditoria.date') }}</th>
                <th class="px-4 py-3 whitespace-nowrap">{{ t('auditoria.user') }}</th>
                <th class="px-4 py-3 whitespace-nowrap">{{ t('auditoria.action') }}</th>
                <th class="px-4 py-3 whitespace-nowrap">{{ t('auditoria.table') }}</th>
                <th class="px-4 py-3 whitespace-nowrap">{{ t('auditoria.entity') }}</th>
                <th class="px-4 py-3">{{ t('auditoria.ip') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap text-xs tabular-nums">
                  {{ formatDate(log.created_at) }}
                </td>
                <td class="px-4 py-3 text-gray-900 whitespace-nowrap">
                  <div class="text-sm font-medium">{{ log.user_email || '—' }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="px-2 py-0.5 text-xs font-medium rounded-full"
                    :class="actionBadge(log.action)"
                  >
                    {{ log.action }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                  {{ log.affected_table || '—' }}
                </td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                  {{ log.entity_id || '—' }}
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {{ log.source_ip || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="border-t border-gray-100">
          <PaginatorBar
            :page="page"
            :total="total"
            :page-size="pageSize"
            @update:page="setPage"
          />
        </div>
      </div>
    </DataState>
  </div>
</template>
