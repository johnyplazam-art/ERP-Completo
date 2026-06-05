<script setup>
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useIngredientesQuery, useCategoriasIngredienteQuery, useUpdateIngredienteMutation } from '../composables/queries'

const { data: ingredientes, isLoading } = useIngredientesQuery({ activo: true })
const { data: categorias } = useCategoriasIngredienteQuery()
const updateMutation = useUpdateIngredienteMutation()

const selectedCategoria = ref(null)
const searchQuery = ref('')

const filteredIngredientes = computed(() => {
  let list = ingredientes.value ?? []

  if (selectedCategoria.value) {
    list = list.filter(i => i.categoria_id === selectedCategoria.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i => i.nombre.toLowerCase().includes(q))
  }

  return list
})

async function desactivar(ing) {
  if (!confirm(`¿Desactivar "${ing.nombre}"?\nEl ingrediente dejará de aparecer en el inventario, pero las recetas que lo usan no se verán afectadas.`)) return
  try {
    await updateMutation.mutateAsync({ id: ing.id, values: { activo: false } })
    toast.success(`"${ing.nombre}" desactivado`)
  } catch (err) {
    toast.error(err.message || 'Error al desactivar ingrediente')
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Inventario de Materia Prima</h2>
      <router-link
        to="/panaderia/inventario/nuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo Ingrediente
      </router-link>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar ingrediente..."
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div class="sm:w-64">
          <select
            v-model="selectedCategoria"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          >
            <option :value="null">Todas las categorías</option>
            <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
              {{ cat.nombre }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando inventario...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredIngredientes.length" class="text-center py-12 text-gray-400">
      <i class="pi pi-box text-4xl mb-3"></i>
      <p>Sin ingredientes registrados</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="ing in filteredIngredientes"
        :key="ing.id"
        class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h4 class="font-semibold text-gray-900">{{ ing.nombre }}</h4>
            <p class="text-sm text-gray-500">{{ ing.categoria?.nombre }}</p>
          </div>
          <span
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="ing.perecedero ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'"
          >
            {{ ing.perecedero ? 'Perecedero' : 'No perecedero' }}
          </span>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Unidad base:</span>
            <span class="font-medium">{{ ing.unidad?.simbolo }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Stock mínimo:</span>
            <span class="font-medium">{{ ing.stock_minimo }} {{ ing.unidad?.simbolo }}</span>
          </div>
          <div v-if="ing.vida_util_dias" class="flex justify-between">
            <span class="text-gray-500">Vida útil:</span>
            <span class="font-medium">{{ ing.vida_util_dias }} días</span>
          </div>
          <div v-if="ing.ubicacion" class="flex justify-between">
            <span class="text-gray-500">Ubicación:</span>
            <span class="font-medium">{{ ing.ubicacion }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
          <router-link
            :to="`/panaderia/inventario/${ing.id}`"
            class="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            Editar
          </router-link>
          <button
            @click="desactivar(ing)"
            class="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Desactivar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
