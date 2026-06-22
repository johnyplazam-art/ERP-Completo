<script setup>
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useConfirm } from 'primevue/useconfirm'
import { useIngredientesQuery, useCategoriasIngredienteQuery, useUpdateIngredienteMutation, useStockValorizadoTotalQuery } from '../composables/queries'
import DataState from '@/core/components/DataState.vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/core/store/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const empresaId = computed(() => authStore.currentEmpresaId)

const { data: ingredientes, isLoading, error } = useIngredientesQuery({})
const { data: categorias } = useCategoriasIngredienteQuery()
const updateMutation = useUpdateIngredienteMutation()
const confirm = useConfirm()

const { data: totalValor, isLoading: loadingValor } = useStockValorizadoTotalQuery(empresaId)

const selectedCategoria = ref(null)
const searchQuery = ref('')
const mostrarInactivos = ref(false)

const filteredIngredientes = computed(() => {
  let list = ingredientes.value ?? []

  if (!mostrarInactivos.value) {
    list = list.filter(i => i.activo)
  }

  if (selectedCategoria.value) {
    list = list.filter(i => i.categoria_id === selectedCategoria.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i => i.nombre.toLowerCase().includes(q))
  }

  return list
})

function toggleInactivos() {
  mostrarInactivos.value = !mostrarInactivos.value
}

function desactivar(ing) {
  confirm.require({
    message: t('inventario.deactivateConfirm', { nombre: ing.nombre }),
    header: t('common.confirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: t('common.cancel'),
    acceptLabel: t('common.confirm'),
    accept: async () => {
      try {
        await updateMutation.mutateAsync({ id: ing.id, values: { activo: false } })
        toast.success(t('inventario.deactivated', { nombre: ing.nombre }))
      } catch (err) {
        toast.error(err.message || t('inventario.deactivateError'))
      }
    },
  })
}

function reactivar(ing) {
  confirm.require({
    message: t('inventario.reactivateConfirm', { nombre: ing.nombre }),
    header: t('common.confirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: t('common.cancel'),
    acceptLabel: t('common.confirm'),
    accept: async () => {
      try {
        await updateMutation.mutateAsync({ id: ing.id, values: { activo: true } })
        toast.success(t('inventario.reactivated', { nombre: ing.nombre }))
      } catch (err) {
        toast.error(err.message || t('inventario.reactivateError'))
      }
    },
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">{{ t('inventario.title') }}</h2>
      <router-link
        to="/panaderia/inventario/nuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        {{ t('inventario.new') }}
      </router-link>
    </div>

    <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 mb-6 text-white flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i class="pi pi-dollar text-xl"></i>
        <span class="font-medium">{{ t('inventario.totalValue') }}</span>
      </div>
      <span class="text-2xl font-bold tabular-nums">
        <template v-if="loadingValor">—</template>
        <template v-else>${{ (totalValor ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</template>
      </span>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('inventario.search')"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div class="sm:w-48">
          <select
            v-model="selectedCategoria"
            class="touch-input block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
          >
            <option :value="null">{{ t('inventario.allCategories') }}</option>
            <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
              {{ cat.nombre }}
            </option>
          </select>
        </div>
        <div class="flex items-center">
          <button
            @click="toggleInactivos"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
            :class="mostrarInactivos
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
          >
            <i class="pi pi-eye-slash text-xs"></i>
            {{ t('inventario.inactive') }}
          </button>
        </div>
      </div>
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!filteredIngredientes.length"
      empty-icon="pi pi-box"
      :empty-text="mostrarInactivos ? t('inventario.emptyInactive') : t('inventario.empty')"
      :loading-text="t('inventario.loading')"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            {{ ing.perecedero ? t('inventario.perishable') : t('inventario.nonPerishable') }}
          </span>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('inventario.baseUnit') }}</span>
            <span class="font-medium">{{ ing.unidad?.simbolo }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('inventario.minStock') }}</span>
            <span class="font-medium">{{ ing.stock_minimo }} {{ ing.unidad?.simbolo }}</span>
          </div>
          <div v-if="ing.vida_util_dias" class="flex justify-between">
            <span class="text-gray-500">{{ t('inventario.shelfLife') }}</span>
            <span class="font-medium">{{ ing.vida_util_dias }} {{ t('inventario.days') }}</span>
          </div>
          <div v-if="ing.ubicacion" class="flex justify-between">
            <span class="text-gray-500">{{ t('inventario.location') }}</span>
            <span class="font-medium">{{ ing.ubicacion }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
          <router-link
            :to="`/panaderia/inventario/${ing.id}`"
            class="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            {{ t('inventario.edit') }}
          </router-link>
          <button
            v-if="ing.activo"
            @click="desactivar(ing)"
            class="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            {{ t('inventario.deactivate') }}
          </button>
          <button
            v-else
            @click="reactivar(ing)"
            class="text-sm text-green-600 hover:text-green-800 font-medium"
          >
            {{ t('inventario.reactivate') }}
          </button>
        </div>
      </div>
    </div>
    </DataState>
  </div>

  <Teleport to="body">
    <ConfirmDialog />
  </Teleport>
</template>
