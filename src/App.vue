<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <img class="h-8 w-auto" src="https://via.placeholder.com/40x40?text=SIAS" alt="SIAS ERP">
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                <a href="#" class="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50">
                  Dashboard
                </a>
                <a href="#" class="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50">
                  Products
                </a>
                <a href="#" class="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50">
                  Reports
                </a>
              </div>
            </div>
          </div>
          
          <div class="hidden md:block">
            <div class="ml-4 flex items-center md:ml-6">
              <button type="button" class="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                <i class="pi pi-bell text-xl"></i>
                <span class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <button type="button" class="ml-3 bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                <i class="pi pi-user text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mt-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <!-- Page Title -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">
            Gestión de Productos
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            Administre el inventario de productos de su empresa
          </p>
        </div>

        <!-- Product Table Component -->
        <ProductTable />
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p class="text-sm text-gray-500">
          SIAS ERP © 2026 - Sistema de Gestión Empresarial
        </p>
      </div>
    </footer>
  </div>
</template>

<script>
import ProductTable from './components/ProductTable.vue'

export default {
  name: 'App',
  components: {
    ProductTable
  }
}
</script>

<style>
/* Global styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
}

/* PrimeVue overrides */
.p-button {
  border-radius: 0.375rem;
}

.p-inputtext {
  border-radius: 0.375rem;
}

.p-dropdown {
  border-radius: 0.375rem;
}

.p-checkbox-box {
  border-radius: 0.25rem;
}
</style>