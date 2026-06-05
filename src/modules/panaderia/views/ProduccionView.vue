<script setup>
import { useOrdenesProduccionQuery, useUpdateOrdenEstadoMutation } from '../composables/queries'

const { data: ordenes, isLoading } = useOrdenesProduccionQuery()
const updateEstado = useUpdateOrdenEstadoMutation()

const cambiarEstado = async (id, nuevoEstado) => {
  try {
    await updateEstado.mutateAsync({ id, estado: nuevoEstado })
  } catch (err) {
    console.error(err)
  }
}

const puedeAvanzar = (estado) => {
  const flujo = ['pendiente', 'en_proceso', 'completada']
  const idx = flujo.indexOf(estado)
  return idx >= 0 && idx < flujo.length - 1
}

const puedeCancelar = (estado) => {
  return estado === 'pendiente' || estado === 'en_proceso'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Órdenes de Producción</h2>
      <router-link
        to="/panaderia/produccion/nueva"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nueva Orden
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando órdenes...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!ordenes?.length" class="text-center py-12 text-gray-400">
      <i class="pi pi-cog text-4xl mb-3"></i>
      <p>No hay órdenes de producción</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-4">
      <div
        v-for="orden in ordenes"
        :key="orden.id"
        class="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div class="flex items-center gap-3">
            <h3 class="font-semibold text-gray-900">Orden #{{ orden.id }}</h3>
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="{
                'bg-amber-100 text-amber-700': orden.estado === 'pendiente',
                'bg-blue-100 text-blue-700': orden.estado === 'en_proceso',
                'bg-green-100 text-green-700': orden.estado === 'completada',
                'bg-red-100 text-red-700': orden.estado === 'cancelada',
              }"
            >
              {{ orden.estado.replace('_', ' ') }}
            </span>
          </div>
          <div class="flex gap-2">
            <button
              v-if="puedeAvanzar(orden.estado)"
              @click="cambiarEstado(orden.id, orden.estado === 'pendiente' ? 'en_proceso' : 'completada')"
              class="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
            >
              {{ orden.estado === 'pendiente' ? 'Iniciar' : 'Completar' }}
            </button>
            <button
              v-if="puedeCancelar(orden.estado)"
              @click="cambiarEstado(orden.id, 'cancelada')"
              class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Cancelar
            </button>
          </div>
        </div>

        <!-- Info -->
        <div class="p-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
            <div>
              <span class="text-gray-500">Programada:</span>
              <p class="font-medium">{{ orden.fecha_programada }}</p>
            </div>
            <div>
              <span class="text-gray-500">Responsable:</span>
              <p class="font-medium">{{ orden.responsable?.nombre || '-' }}</p>
            </div>
            <div v-if="orden.fecha_inicio">
              <span class="text-gray-500">Inicio:</span>
              <p class="font-medium">{{ new Date(orden.fecha_inicio).toLocaleString() }}</p>
            </div>
            <div v-if="orden.fecha_fin">
              <span class="text-gray-500">Fin:</span>
              <p class="font-medium">{{ new Date(orden.fecha_fin).toLocaleString() }}</p>
            </div>
          </div>

          <!-- Details -->
          <div v-if="orden.detalles?.length" class="border-t pt-3">
            <p class="text-xs text-gray-500 mb-2">Productos:</p>
            <div v-for="det in orden.detalles" :key="det.id" class="flex items-center justify-between py-1">
              <span class="text-sm font-medium">{{ det.producto?.nombre }}</span>
              <span class="text-sm text-gray-600">
                {{ det.cantidad_programada }} {{ det.cantidad_producida ? `/ ${det.cantidad_producida}` : '' }}
              </span>
            </div>
          </div>

          <p v-if="orden.nota" class="mt-2 text-sm text-gray-500 italic">{{ orden.nota }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
