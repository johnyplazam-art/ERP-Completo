import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  fetchCategoriasReceta,
  fetchCategoriasIngrediente,
  fetchCategoriasProducto,
  createCategoriaReceta,
  fetchIngredientes,
  createIngrediente,
  updateIngrediente,
  fetchProveedores,
  createProveedor,
  fetchUnidadesMedida,
  createUnidadMedida,
  fetchRecetas,
  createReceta,
  fetchProductos,
  createProducto,
  updateProducto,
  fetchOrdenesProduccion,
  createOrdenProduccion,
  updateOrdenEstado,
  fetchMovimientosMp,
  crearMovimientoMp,
  fetchStockIngrediente,
} from './database'

// ─── Query Keys ──────────────────────────────────────

export const queryKeys = {
  categoriasReceta: ['categorias_receta'],
  categoriasIngrediente: ['categorias_ingrediente'],
  categoriasProducto: ['categorias_producto'],
  unidadesMedida: ['unidades_medida'],
  ingredientes: (filters) => ['ingredientes', filters],
  ingrediente: (id) => ['ingredientes', id],
  proveedores: ['proveedores'],
  recetas: ['recetas'],
  receta: (id) => ['recetas', id],
  productos: ['productos'],
  producto: (id) => ['productos', id],
  ordenesProduccion: ['ordenes_produccion'],
  ordenProduccion: (id) => ['ordenes_produccion', id],
  movimientosMp: (ingredienteId) => ['movimientos_mp', ingredienteId],
  stockIngrediente: (id) => ['stock_ingrediente', id],
}

// ─── Categorías ──────────────────────────────────────

export function useCategoriasRecetaQuery() {
  return useQuery({
    queryKey: queryKeys.categoriasReceta,
    queryFn: fetchCategoriasReceta,
  })
}

export function useCreateCategoriaRecetaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategoriaReceta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasReceta }),
  })
}

export function useCategoriasIngredienteQuery() {
  return useQuery({
    queryKey: queryKeys.categoriasIngrediente,
    queryFn: fetchCategoriasIngrediente,
  })
}

export function useCategoriasProductoQuery() {
  return useQuery({
    queryKey: queryKeys.categoriasProducto,
    queryFn: fetchCategoriasProducto,
  })
}

// ─── Unidades ────────────────────────────────────────

export function useUnidadesMedidaQuery() {
  return useQuery({
    queryKey: queryKeys.unidadesMedida,
    queryFn: fetchUnidadesMedida,
  })
}

export function useCreateUnidadMedidaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUnidadMedida,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.unidadesMedida }),
  })
}

// ─── Ingredientes ────────────────────────────────────

export function useIngredientesQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.ingredientes(filters),
    queryFn: () => fetchIngredientes(filters),
  })
}

export function useCreateIngredienteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createIngrediente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredientes'] }),
  })
}

export function useUpdateIngredienteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateIngrediente(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredientes'] }),
  })
}

// ─── Proveedores ─────────────────────────────────────

export function useProveedoresQuery() {
  return useQuery({
    queryKey: queryKeys.proveedores,
    queryFn: fetchProveedores,
  })
}

export function useCreateProveedorMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProveedor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.proveedores }),
  })
}

// ─── Recetas ─────────────────────────────────────────

export function useRecetasQuery() {
  return useQuery({
    queryKey: queryKeys.recetas,
    queryFn: fetchRecetas,
  })
}

export function useCreateRecetaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createReceta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recetas'] }),
  })
}

// ─── Productos ───────────────────────────────────────

export function useProductosQuery() {
  return useQuery({
    queryKey: queryKeys.productos,
    queryFn: fetchProductos,
  })
}

export function useCreateProductoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProducto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
  })
}

export function useUpdateProductoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateProducto(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
  })
}

// ─── Órdenes de Producción ──────────────────────────

export function useOrdenesProduccionQuery() {
  return useQuery({
    queryKey: queryKeys.ordenesProduccion,
    queryFn: fetchOrdenesProduccion,
  })
}

export function useCreateOrdenMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOrdenProduccion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes_produccion'] }),
  })
}

export function useUpdateOrdenEstadoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }) => updateOrdenEstado(id, estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes_produccion'] }),
  })
}

// ─── Movimientos / Stock ────────────────────────────

export function useMovimientosMpQuery(ingredienteId) {
  return useQuery({
    queryKey: queryKeys.movimientosMp(ingredienteId),
    queryFn: () => fetchMovimientosMp(ingredienteId),
    enabled: !!ingredienteId,
  })
}

export function useCrearMovimientoMpMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: crearMovimientoMp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos_mp'] })
      queryClient.invalidateQueries({ queryKey: ['stock_ingrediente'] })
    },
  })
}

export function useStockIngredienteQuery(id) {
  return useQuery({
    queryKey: queryKeys.stockIngrediente(id),
    queryFn: () => fetchStockIngrediente(id),
    enabled: !!id,
  })
}
