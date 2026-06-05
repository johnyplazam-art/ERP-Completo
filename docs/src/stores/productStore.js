import { defineStore } from 'https://cdn.jsdelivr.net/npm/pinia@2.1.7/dist/pinia.esm-browser.prod.js'
import api from '../api/axiosInstance.js'

export const useProductStore = defineStore('product', {
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
    }
  }),
  getters: {
    productCount: (state) => state.products.length
  },
  actions: {
    async fetchProducts(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('', {
          action: 'getProducts',
          params: params
        })
        if (response.data.success) {
          this.products = response.data.data.items
          this.pagination = response.data.data.pagination
        } else {
          throw new Error(response.data.error || 'Failed to fetch products')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    async createProduct(productData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('', {
          action: 'createProduct',
          params: productData
        })
        if (response.data.success) {
          // Optionally refresh list
          await this.fetchProducts()
          return response.data
        } else {
          throw new Error(response.data.error || 'Failed to create product')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    async updateProduct(id, productData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('', {
          action: 'updateProduct',
          params: { id, ...productData }
        })
        if (response.data.success) {
          await this.fetchProducts()
          return response.data
        } else {
          throw new Error(response.data.error || 'Failed to update product')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    async deleteProduct(id) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('', {
          action: 'deleteProduct',
          params: { id }
        })
        if (response.data.success) {
          await this.fetchProducts()
          return response.data
        } else {
          throw new Error(response.data.error || 'Failed to delete product')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    clearError() {
      this.error = null
    }
  }
})