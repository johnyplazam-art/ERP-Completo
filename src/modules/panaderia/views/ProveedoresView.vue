<script setup>
import { useProveedoresQuery } from '../composables/queries'

const { data: proveedores, isLoading, error } = useProveedoresQuery()
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

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12 text-gray-400">
      <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
      <p>Cargando proveedores...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
      {{ error.message }}
    </div>

    <!-- Empty -->
    <div v-else-if="!proveedores?.length" class="text-center py-12 text-gray-400">
      <i class="pi pi-truck text-4xl mb-3"></i>
      <p>No hay proveedores registrados</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 font-medium">
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Contacto</th>
              <th class="px-4 py-3">Teléfono</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="prov in proveedores" :key="prov.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ prov.nombre }}</td>
              <td class="px-4 py-3 text-gray-600">{{ prov.contacto || '-' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ prov.telefono || '-' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ prov.email || '-' }}</td>
              <td class="px-4 py-3">
                <router-link
                  :to="`/panaderia/proveedores/${prov.id}`"
                  class="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  Editar
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
