<script setup>
import { useProveedoresQuery, useDeleteProveedorMutation } from '../composables/queries'
import { ref, computed } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import DataState from '@/core/components/DataState.vue'

const { data: proveedores, isLoading, error } = useProveedoresQuery()
const { mutate: eliminarProveedor } = useDeleteProveedorMutation()
const expandedRow = ref('')
const confirm = useConfirm()
const searchQuery = ref('')

const filteredProveedores = computed(() => {
  if (!proveedores.value) return []
  if (!searchQuery.value) return proveedores.value
  const q = searchQuery.value.toLowerCase()
  return proveedores.value.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.contacto?.toLowerCase().includes(q)
  )
})

const toggleRow = (id) => {
  expandedRow.value = expandedRow.value === id ? '' : id
}

const confirmarDesactivar = (prov) => {
  confirm.require({
    message: `¿Desactivar el proveedor "${prov.nombre}"?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancelar',
    acceptLabel: 'Confirmar',
    accept: () => eliminarProveedor(prov.id),
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Proveedores</h2>
      <router-link
        to="/panaderia/proveedores/nuevo"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <i class="pi pi-plus mr-2"></i>
        Nuevo Proveedor
      </router-link>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar proveedores..."
        class="touch-input block w-full max-w-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <DataState
      :loading="isLoading"
      :error="error"
      :empty="!filteredProveedores.length"
      empty-icon="pi pi-truck"
      :empty-text="searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay proveedores registrados'"
      loading-text="Cargando proveedores..."
    >
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Contacto</th>
              <th class="px-4 py-3">Teléfono</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="prov in filteredProveedores" :key="prov.id">
              <tr
                @click="toggleRow(prov.id)"
                class="hover:bg-gray-50 cursor-pointer"
                :class="{ 'bg-primary-50': expandedRow === prov.id }"
              >
                <td class="px-4 py-3 font-medium text-gray-900">
                  <i
                    class="pi text-xs mr-1 transition-transform duration-200"
                    :class="expandedRow === prov.id ? 'pi-chevron-down' : 'pi-chevron-right'"
                  ></i>
                  {{ prov.nombre }}
                </td>
                <td class="px-4 py-3 text-gray-600">{{ prov.contacto || '-' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ prov.telefono || '-' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ prov.email || '-' }}</td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="prov.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ prov.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3" @click.stop>
                  <div class="flex items-center gap-3">
                    <router-link
                      :to="`/panaderia/proveedores/${prov.id}`"
                      class="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Editar
                    </router-link>
                    <button
                      v-if="prov.activo"
                      @click="confirmarDesactivar(prov)"
                      class="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Desactivar
                    </button>
                    <span v-else class="text-gray-400 text-sm">Desactivado</span>
                  </div>
                </td>
              </tr>
              <!-- Expanded detail row -->
              <tr v-if="expandedRow === prov.id" :key="`${prov.id}-detail`">
                <td colspan="6" class="px-4 py-0 bg-gray-50">
                  <div class="py-3 animate-fadeIn">
                    <div v-if="!prov.ingredientes?.length" class="text-sm text-gray-400 text-center py-2">
                      Sin ingredientes asociados
                    </div>
                    <div v-else class="max-w-lg">
                      <div
                        v-for="item in prov.ingredientes"
                        :key="item.id"
                        class="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span class="text-gray-700 font-medium">
                          {{ item.ingrediente?.nombre }}
                        </span>
                        <span class="text-gray-500">
                          ${{ Number(item.precio_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
                          <span
                            v-if="item.es_preferido"
                            class="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                          >Preferido</span>
                          <span v-if="item.plazo_entrega_dias" class="ml-2 text-xs text-gray-400">
                            {{ item.plazo_entrega_dias }} días
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    </DataState>
  </div>

  <Teleport to="body">
    <ConfirmDialog />
  </Teleport>
</template>
