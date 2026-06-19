<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/core/supabase'
import { useAuthStore } from '@/core/store/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const empresas = ref([])
const isLoading = ref(true)
const searchQuery = ref('')

const empresasFiltradas = computed(() => {
  if (!searchQuery.value) return empresas.value
  const q = searchQuery.value.toLowerCase()
  return empresas.value.filter(e =>
    e.nombre.toLowerCase().includes(q) ||
    (e.industria_principal?.nombre || '').toLowerCase().includes(q) ||
    (e.slug || '').toLowerCase().includes(q)
  )
})

async function cargarEmpresas() {
  isLoading.value = true
  try {
    const { data } = await supabase
      .from('empresas')
      .select('*, industria_principal:industrias(nombre, slug)')
      .order('created_at', { ascending: false })
    empresas.value = data ?? []
  } catch (err) {
    console.error('[admin-empresas] Error:', err)
  } finally {
    isLoading.value = false
  }
}

function irAEmpresa(empresa) {
  authStore.seleccionarEmpresa(empresa)
}

// Init
cargarEmpresas()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">
        Todas las Empresas
      </h2>
      <div class="relative">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar empresa..."
          class="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
        />
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando empresas...</p>
    </div>

    <div v-else-if="!empresasFiltradas.length" class="text-center py-20 text-gray-400">
      <i class="pi pi-building text-4xl mb-3"></i>
      <p>No se encontraron empresas</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="emp in empresasFiltradas"
        :key="emp.id"
        class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
        @click="irAEmpresa(emp)"
      >
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-semibold text-gray-900 text-base truncate">{{ emp.nombre }}</h3>
          <span class="text-xs text-gray-400 ml-2 shrink-0">#{{ emp.id }}</span>
        </div>

        <div class="space-y-1.5 text-sm text-gray-500">
          <div v-if="emp.industria_principal" class="flex items-center gap-2">
            <i class="pi pi-tag text-xs"></i>
            <span>{{ emp.industria_principal.nombre }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-hashtag text-xs"></i>
            <span class="text-xs font-mono text-gray-400">{{ emp.slug }}</span>
          </div>
        </div>

        <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-gray-400">
            {{ emp.activa !== false ? 'Activa' : 'Inactiva' }}
          </span>
          <span class="text-xs text-primary-600 font-medium hover:underline">
            Seleccionar →
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
