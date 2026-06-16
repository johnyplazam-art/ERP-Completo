<script setup>
import { ref, computed } from 'vue'
import DataState from '@/core/components/DataState.vue'
import { useAuthStore } from '@/core/store/auth'
import { useProductosConStockQuery } from '../composables/queries'

const authStore = useAuthStore()
const empresaId = computed(() => authStore.currentEmpresaId)

const { data: productos, isLoading, error } = useProductosConStockQuery(empresaId)

const searchQuery = ref('')
const soloStockBajo = ref(false)

const filtered = computed(() => {
  let list = productos.value ?? []

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.nombre.toLowerCase().includes(q))
  }

  if (soloStockBajo.value) {
    list = list.filter(p => p.stock_actual <= 0)
  }

  return list
})

const totalValorizado = computed(() =>
  filtered.value.reduce((sum, p) => sum + p.valor_total, 0)
)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Stock de Productos Terminados</h2>
      <router-link
        to="/panaderia/productos/nuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo Producto
      </router-link>
    </div>

    <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 mb-6 text-white flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i class="pi pi-dollar text-xl"></i>
        <span class="font-medium">Valor total del stock PT</span>
      </div>
      <span class="text-2xl font-bold tabular-nums">
        ${{ totalValorizado.toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
      </span>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar producto..."
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
          <input
            v-model="soloStockBajo"
            type="checkbox"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Solo sin stock
        </label>
      </div>
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!filtered.length"
      empty-icon="pi pi-box"
      :empty-text="searchQuery ? 'Sin resultados' : 'No hay productos registrados'"
      loading-text="Cargando stock..."
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="p in filtered"
          :key="p.id"
          class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="min-w-0 flex-1">
              <h4 class="font-semibold text-gray-900 truncate">{{ p.nombre }}</h4>
              <p class="text-sm text-gray-500 truncate">{{ p.categoria?.nombre }}</p>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full shrink-0 ml-2"
              :class="p.stock_actual > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
            >
              {{ p.stock_actual > 0 ? 'En stock' : 'Sin stock' }}
            </span>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Stock actual:</span>
              <span class="font-medium tabular-nums">{{ Number(p.stock_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }} u.</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Precio costo:</span>
              <span class="font-medium tabular-nums">${{ (p.precio_costo ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Precio venta:</span>
              <span class="font-medium tabular-nums">${{ (p.precio_venta ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div v-if="p.valor_total > 0" class="flex justify-between pt-1 border-t border-gray-100">
              <span class="text-gray-500">Valor stock:</span>
              <span class="font-medium tabular-nums text-primary-600">${{ p.valor_total.toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
            <router-link
              :to="`/panaderia/productos/${p.id}`"
              class="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Ver producto
            </router-link>
          </div>
        </div>
      </div>
    </DataState>
  </div>
</template>
