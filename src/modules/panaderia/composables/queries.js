import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  fetchCategoriasReceta,
  fetchCategoriasIngrediente,
  fetchCategoriasProducto,
  createCategoriaReceta,
  updateCategoriaReceta,
  deleteCategoriaReceta,
  createCategoriaIngrediente,
  updateCategoriaIngrediente,
  deleteCategoriaIngrediente,
  createCategoriaProducto,
  updateCategoriaProducto,
  deleteCategoriaProducto,
  updateUnidadMedida,
  deleteUnidadMedida,
  fetchIngredientes,
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
  fetchProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  fetchUnidadesMedida,
  createUnidadMedida,
  fetchRecetas,
  createReceta,
  updateReceta,
  deleteReceta,
  fetchProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  fetchOrdenesProduccion,
  createOrdenProduccion,
  updateOrdenEstado,
  fetchMovimientosMp,
  crearMovimientoMp,
  fetchStockIngrediente,
  calcularIngredientesNecesarios,
  descontarIngredientesOrden,
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

export function useUpdateCategoriaRecetaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateCategoriaReceta(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasReceta }),
  })
}

export function useDeleteCategoriaRecetaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteCategoriaReceta(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasReceta }),
  })
}

export function useCategoriasIngredienteQuery() {
  return useQuery({
    queryKey: queryKeys.categoriasIngrediente,
    queryFn: fetchCategoriasIngrediente,
  })
}

export function useCreateCategoriaIngredienteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategoriaIngrediente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasIngrediente }),
  })
}

export function useUpdateCategoriaIngredienteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateCategoriaIngrediente(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasIngrediente }),
  })
}

export function useDeleteCategoriaIngredienteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteCategoriaIngrediente(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasIngrediente }),
  })
}

export function useCategoriasProductoQuery() {
  return useQuery({
    queryKey: queryKeys.categoriasProducto,
    queryFn: fetchCategoriasProducto,
  })
}

export function useCreateCategoriaProductoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategoriaProducto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasProducto }),
  })
}

export function useUpdateCategoriaProductoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateCategoriaProducto(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasProducto }),
  })
}

export function useDeleteCategoriaProductoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteCategoriaProducto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categoriasProducto }),
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

export function useUpdateUnidadMedidaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateUnidadMedida(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.unidadesMedida }),
  })
}

export function useDeleteUnidadMedidaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteUnidadMedida(id),
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

export function useDeleteIngredienteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteIngrediente(id),
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

export function useUpdateProveedorMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateProveedor(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.proveedores }),
  })
}

export function useDeleteProveedorMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteProveedor(id),
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

export function useUpdateRecetaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateReceta(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recetas'] }),
  })
}

export function useDeleteRecetaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteReceta(id),
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

export function useDeleteProductoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteProducto(id),
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

// ─── Cálculo de Materia Prima ────────────────────────

export function useCalculoIngredientesQuery(detalles) {
  return useQuery({
    queryKey: ['calculo_ingredientes', detalles],
    queryFn: () => calcularIngredientesNecesarios(detalles),
    enabled: !!detalles?.length && detalles.some(d => d.producto_id && d.receta_id && d.cantidad_programada > 0),
    staleTime: 30_000,
  })
}

// Re-export para que las vistas puedan importarlo desde queries
export { calcularIngredientesNecesarios }

export function useDescontarInventarioMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ordenId, detalles }) => descontarIngredientesOrden(ordenId, detalles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos_mp'] })
      queryClient.invalidateQueries({ queryKey: ['stock_ingrediente'] })
    },
  })
}
