<script setup>
import { useRecetasQuery, useOrdenesProduccionQuery, useProductosQuery } from '../composables/queries'

const { data: recetas, isLoading: loadingRecetas } = useRecetasQuery()
const { data: ordenes, isLoading: loadingOrdenes } = useOrdenesProduccionQuery()
const { data: productos } = useProductosQuery()

const recetasActivas = computed(() => recetas.value?.filter(r => r.activa) ?? [])
const ordenesPendientes = computed(() => ordenes.value?.filter(o => o.estado === 'pendiente') ?? [])
const ordenesHoy = computed(() => {
  const hoy = new Date().toISOString().split('T')[0]
  return ordenes.value?.filter(o => o.fecha_programada === hoy) ?? []
})
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Panel de Panadería</h2>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Recetas Activas</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">
              {{ loadingRecetas ? '...' : recetasActivas.length }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
            <i class="pi pi-book text-primary-600 text-xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Productos</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ productos?.length ?? '...' }}</p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <i class="pi pi-box text-blue-600 text-xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Órdenes Pendientes</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">
              {{ loadingOrdenes ? '...' : ordenesPendientes.length }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
            <i class="pi pi-clock text-amber-600 text-xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Producción Hoy</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">
              {{ loadingOrdenes ? '...' : ordenesHoy.length }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
            <i class="pi pi-calendar text-green-600 text-xl"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div class="space-y-3">
          <router-link
            to="/panaderia/recetas/nueva"
            class="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <i class="pi pi-plus-circle text-primary-500 text-xl mr-3"></i>
            <span class="text-sm font-medium text-gray-700">Nueva Receta</span>
          </router-link>
          <router-link
            to="/panaderia/produccion/nueva"
            class="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <i class="pi pi-cog text-primary-500 text-xl mr-3"></i>
            <span class="text-sm font-medium text-gray-700">Iniciar Producción</span>
          </router-link>
          <router-link
            to="/panaderia/inventario"
            class="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <i class="pi pi-warehouse text-primary-500 text-xl mr-3"></i>
            <span class="text-sm font-medium text-gray-700">Registrar Movimiento</span>
          </router-link>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Últimas Órdenes</h3>
        <div v-if="loadingOrdenes" class="text-gray-400 text-sm">Cargando...</div>
        <div v-else-if="!ordenes?.length" class="text-gray-400 text-sm">Sin órdenes aún</div>
        <div v-else class="space-y-3">
          <div
            v-for="orden in ordenes.slice(0, 5)"
            :key="orden.id"
            class="flex items-center justify-between p-3 rounded-lg bg-gray-50"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">#{{ orden.id }}</p>
              <p class="text-xs text-gray-500">{{ orden.fecha_programada }}</p>
            </div>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="{
                'bg-amber-100 text-amber-700': orden.estado === 'pendiente',
                'bg-blue-100 text-blue-700': orden.estado === 'en_proceso',
                'bg-green-100 text-green-700': orden.estado === 'completada',
                'bg-red-100 text-red-700': orden.estado === 'cancelada',
              }"
            >
              {{ orden.estado }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
