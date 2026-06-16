<script setup>
import { useOrdenesProduccionQuery, useUpdateOrdenEstadoMutation, useDescontarInventarioMutation, calcularIngredientesNecesarios } from '../composables/queries'
import { crearMovimientoPt } from '../composables/database'
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import DataState from '@/core/components/DataState.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/core/store/auth'

const queryClient = useQueryClient()
const authStore = useAuthStore()

const { data: ordenes, isLoading, error } = useOrdenesProduccionQuery()
const updateEstado = useUpdateOrdenEstadoMutation()
const descontarInventario = useDescontarInventarioMutation()
const empresaId = computed(() => authStore.currentEmpresaId)
const expandedRow = ref('')
const calculosMap = ref({})
const searchQuery = ref('')

const filteredOrdenes = computed(() => {
  if (!ordenes.value) return []
  if (!searchQuery.value) return ordenes.value
  const q = searchQuery.value.toLowerCase()
  return ordenes.value.filter(o =>
    String(o.id).includes(q) ||
    o.estado?.toLowerCase().includes(q) ||
    o.detalles?.some(d => d.producto?.nombre?.toLowerCase().includes(q))
  )
}) // ordenId -> { ingredientes, loading }

const toggleRow = async (id) => {
  if (expandedRow.value === id) {
    expandedRow.value = ''
    return
  }
  expandedRow.value = id

  // Cargar cálculo de ingredientes al expandir
  if (!calculosMap.value[id]) {
    calculosMap.value = { ...calculosMap.value, [id]: { ingredientes: null, loading: true } }
    const orden = ordenes.value?.find(o => o.id === id)
    if (orden?.detalles?.length) {
      try {
        const detalles = orden.detalles.map(d => ({
          producto_id: d.producto_id,
          receta_id: d.receta_id,
          cantidad_programada: d.cantidad_programada,
        }))
        const ingredientes = await calcularIngredientesNecesarios(detalles)
        calculosMap.value = { ...calculosMap.value, [id]: { ingredientes, loading: false } }
      } catch {
        calculosMap.value = { ...calculosMap.value, [id]: { ingredientes: null, loading: false } }
      }
    } else {
      calculosMap.value = { ...calculosMap.value, [id]: { ingredientes: null, loading: false } }
    }
  }
}

const cambiarEstado = async (id, nuevoEstado) => {
  try {
    // Si va a en_proceso, descontar inventario automáticamente
    if (nuevoEstado === 'en_proceso') {
      const orden = ordenes.value?.find(o => o.id === id)
      if (orden?.detalles?.length) {
        const detalles = orden.detalles.map(d => ({
          producto_id: d.producto_id,
          receta_id: d.receta_id,
          cantidad_programada: d.cantidad_programada,
          id: d.id,
        }))
        await descontarInventario.mutateAsync({ ordenId: id, detalles })
        toast.success('Inventario descontado automáticamente')
      }
    }
    await updateEstado.mutateAsync({ id, estado: nuevoEstado })

    // Auto-valorizar PT al completar
    if (nuevoEstado === 'completada') {
      const orden = ordenes.value?.find(o => o.id === id)
      if (orden?.detalles?.length) {
        for (const d of orden.detalles) {
          const precio = Number(d.costo_unitario_estimado || 0)
          if (precio > 0 && d.producto_id) {
            await crearMovimientoPt({
              producto_id: d.producto_id,
              tipo: 'ingreso',
              cantidad: Number(d.cantidad_programada),
              precio_unitario: precio,
              nota: `Auto: orden #${id}`,
              empresa_id: empresaId.value,
              creado_por: authStore.user?.id,
            })
          }
        }
        queryClient.invalidateQueries({ queryKey: ['movimientos_pt'] })
      }
    }
  } catch (err) {
    toast.error(err.message || 'Error al cambiar estado')
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

    <!-- Search -->
    <div class="mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por ID, estado o producto..."
        class="touch-input block w-full max-w-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!filteredOrdenes.length"
      empty-icon="pi pi-cog"
      :empty-text="searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay órdenes de producción'"
      loading-text="Cargando órdenes..."
    >
      <div class="space-y-4">
      <div
        v-for="orden in filteredOrdenes"
        :key="orden.id"
        class="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <!-- Header / click to expand -->
        <div
          @click="toggleRow(orden.id)"
          class="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
          :class="{ 'border-b-0': expandedRow !== orden.id }"
        >
          <div class="flex items-center gap-3">
            <i
              class="pi text-xs transition-transform duration-200"
              :class="expandedRow === orden.id ? 'pi-chevron-down' : 'pi-chevron-right'"
            ></i>
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
          <div class="flex gap-2" @click.stop>
            <router-link
              v-if="orden.estado === 'pendiente'"
              :to="`/panaderia/produccion/${orden.id}/editar`"
              class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-1"
            >
              <i class="pi pi-pencil text-xs"></i>
              Editar
            </router-link>
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

        <!-- Expanded content -->
        <div v-if="expandedRow === orden.id" class="p-4 animate-fadeIn">
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
            <div v-if="orden.costo_total_estimado > 0">
              <span class="text-gray-500">Costo est.:</span>
              <p class="font-medium tabular-nums">$ {{ Number(orden.costo_total_estimado).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
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

          <!-- Matteria prima calculada -->
          <div v-if="calculosMap[orden.id]" class="border-t pt-3 mt-3">
            <p class="text-xs text-gray-500 mb-2">Materia prima necesaria:</p>
            <div v-if="calculosMap[orden.id].loading" class="text-sm text-gray-400">
              <i class="pi pi-spin pi-spinner mr-1"></i> Calculando...
            </div>
            <div v-else-if="!calculosMap[orden.id].ingredientes?.length" class="text-sm text-gray-400">
              Sin datos de receta para calcular
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-500 font-medium text-xs">
                    <th class="pb-1 pr-4">Ingrediente</th>
                    <th class="pb-1 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="ing in calculosMap[orden.id].ingredientes" :key="ing.ingrediente_id">
                    <td class="py-1 pr-4 text-gray-700">{{ ing.nombre }}</td>
                    <td class="py-1 text-right text-gray-900 tabular-nums">
                      {{ Number(ing.cantidad_total).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      {{ ing.simbolo_unidad }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p v-if="orden.nota" class="mt-2 text-sm text-gray-500 italic">{{ orden.nota }}</p>
        </div>
      </div>
    </div>
    </DataState>
  </div>
</template>
