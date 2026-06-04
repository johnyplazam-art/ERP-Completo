// Pinia store for product state management
import { defineStore } from 'pinia'

export const useProductStore = defineStore('products', {
  state: () => ({
    products: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    },
    filters: {
      filtro: '',
      categoria: '',
      activo: ''
    }
  }),
  
  getters: {
    // Get product by ID
    getProductById: (state) => (id) => {
      return state.products.find(product => product.id == id) || null
    },
    
    // Get product count
    productCount: (state) => {
      return state.products.length
    },
    
    // Check if products are loaded
    hasProducts: (state) => {
      return state.products.length > 0
    }
  },
  
  actions: {
    // Fetch products from API
    async fetchProducts() {
      this.loading = true
      this.error = null
      
      try {
        // Build query parameters
        const params = new URLSearchParams({
          page: this.pagination.page,
          limit: this.pagination.limit,
          sortBy: 'nombre',
          sortOrder: 'asc'
        })
        
        // Add filters if present
        if (this.filters.filtro) params.append('filtro', this.filters.filtro)
        if (this.filters.categoria) params.append('categoria', this.filters.categoria)
        if (this.filters.activo) params.append('activo', this.filters.activo)
        
        const response = await fetch(`/Code.gs?action=getProducts&${params.toString()}`)
        const data = await response.json()
        
        if (data.success) {
          this.products = data.data.items
          this.pagination = data.data.pagination
        } else {
          this.error = data.error || 'Failed to fetch products'
        }
      } catch (err) {
        this.error = err.message || 'Network error occurred'
      } finally {
        this.loading = false
      }
    },
    
    // Create a new product
    async createProduct(productData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch('/Code.gs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'createProduct',
            params: productData
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Add the new product to the list
          this.products.unshift(data.data)
          return data
        } else {
          this.error = data.error || 'Failed to create product'
          return data
        }
      } catch (err) {
        this.error = err.message || 'Network error occurred'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    // Update an existing product
    async updateProduct(id, productData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch('/Code.gs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'updateProduct',
            params: { id, ...productData }
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Update the product in the list
          const index = this.products.findIndex(p => p.id == id)
          if (index !== -1) {
            this.products[index] = { ...this.products[index], ...data.data }
          }
          return data
        } else {
          this.error = data.error || 'Failed to update product'
          return data
        }
      } catch (err) {
        this.error = err.message || 'Network error occurred'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    // Delete a product
    async deleteProduct(id) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch('/Code.gs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'deleteProduct',
            params: { id }
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Remove the product from the list
          this.products = this.products.filter(p => p.id != id)
          return data
        } else {
          this.error = data.error || 'Failed to delete product'
          return data
        }
      } catch (err) {
        this.error = err.message || 'Network error occurred'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
    
    // Set filters
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
      // Reset to first page when filters change
      this.pagination.page = 1
    },
    
    // Set pagination page
    setPage(page) {
      this.pagination.page = page
    },
    
    // Clear error
    clearError() {
      this.error = null
    }
  }
})