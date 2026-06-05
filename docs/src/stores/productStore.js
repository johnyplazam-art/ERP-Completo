import { defineStore } from 'pinia'
import { supabase } from '../api/supabase.js'

const TABLE = 'productos'

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
        const page = params.page || 1
        const limit = params.limit || 20
        const offset = (page - 1) * limit

        const { data, count, error } = await supabase.from(TABLE).select('*', {
          order: 'creado_en.desc',
          limit,
          offset,
        })

        if (error) throw new Error(error)

        this.products = data || []
        this.pagination = {
          page,
          limit,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: page * limit < (count || 0),
          hasPrev: page > 1
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
        const { error } = await supabase.from(TABLE).insert({
          codigo: productData.codigo,
          nombre: productData.nombre,
          descripcion: productData.descripcion || '',
          categoria: productData.categoria,
          subcategoria: productData.subcategoria || '',
          unidad_medida: productData.unidadMedida,
          precio_costo: Number(productData.precioCosto),
          precio_venta: Number(productData.precioVenta),
          stock_actual: Number(productData.stockActual),
          stock_minimo: Number(productData.stockMinimo),
          stock_maximo: Number(productData.stockMaximo),
        })

        if (error) throw new Error(error)

        await this.fetchProducts()
        return { success: true }
      } catch (error) {
        if (error.message?.includes('productos_codigo_unique') || error.message?.includes('duplicate key')) {
          throw new Error('El c\u00f3digo de producto ya existe')
        }
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
        const { error } = await supabase.from(TABLE).update({
          codigo: productData.codigo,
          nombre: productData.nombre,
          descripcion: productData.descripcion || '',
          categoria: productData.categoria,
          subcategoria: productData.subcategoria || '',
          unidad_medida: productData.unidadMedida,
          precio_costo: Number(productData.precioCosto),
          precio_venta: Number(productData.precioVenta),
          stock_actual: Number(productData.stockActual),
          stock_minimo: Number(productData.stockMinimo),
          stock_maximo: Number(productData.stockMaximo),
        }, { id })

        if (error) throw new Error(error)

        await this.fetchProducts()
        return { success: true }
      } catch (error) {
        if (error.message?.includes('productos_codigo_unique') || error.message?.includes('duplicate key')) {
          throw new Error('El c\u00f3digo de producto ya existe')
        }
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
        const { error } = await supabase.from(TABLE).delete({ id })

        if (error) throw new Error(error)

        await this.fetchProducts()
        return { success: true }
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
