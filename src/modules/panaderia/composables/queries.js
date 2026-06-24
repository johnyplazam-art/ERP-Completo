import { computed, ref, unref } from 'vue'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/vue-query'
import { useAuthStore } from '@/core/store/auth'
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
  fetchConversionesUnidades,
  createConversionUnidad,
  updateConversionUnidad,
  deleteConversionUnidad,
  fetchMermas,
  createMerma,
  updateMerma,
  deleteMerma,
  countMermas,
  fetchIngredientes,
  fetchIngrediente,
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
  fetchProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  fetchIngredientesProveedor,
  fetchProveedoresByIngrediente,
  createIngredienteProveedor,
  updateIngredienteProveedor,
  deleteIngredienteProveedor,
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
  fetchOrdenProduccion,
  createOrdenProduccion,
  updateOrdenProduccion,
  updateOrdenEstado,
  fetchMovimientosMp,
  crearMovimientoMp,
  fetchMovimientosPt,
  crearMovimientoPt,
  fetchStockIngrediente,
  fetchStockProducto,
  fetchProductosConStock,
  fetchAuditLogs,
  fetchStockValorizado,
  fetchStockValorizadoTotal,
  calcularIngredientesNecesarios,
  calcularCostoRecetaRPC,
  descontarIngredientesOrden,
  countIngredientes,
  countProveedores,
  countRecetas,
  countProductos,
  countOrdenesProduccion,
  countMovimientosMp,
  countMovimientosPt,
  generarProductosFaltantes,
} from './index'
import { createCrudHooks, usePaginatedList } from './crud-factory'

// ─── Query Keys ──────────────────────────────────────

export const queryKeys = {
  categoriasReceta: ['categorias_receta'],
  categoriasIngrediente: ['categorias_ingrediente'],
  categoriasProducto: ['categorias_producto'],
  unidadesMedida: ['unidades_medida'],
  conversionesUnidades: ['conversiones_unidades'],
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
  mermas: ['mermas'],
  movimientosPt: (productoId) => ['movimientos_pt', productoId],
}

// ─── Catálogos vía Factory ───────────────────────────
// Elimina ~80 líneas de boilerplate. Cada grupo genera
// 4 hooks: useList, useCreate, useUpdate, useRemove.

const _categoriasReceta = createCrudHooks({
  queryKey: queryKeys.categoriasReceta,
  list: fetchCategoriasReceta,
  create: createCategoriaReceta,
  update: ({ id, values }) => updateCategoriaReceta(id, values),
  remove: deleteCategoriaReceta,
})

const _categoriasIngrediente = createCrudHooks({
  queryKey: queryKeys.categoriasIngrediente,
  list: fetchCategoriasIngrediente,
  create: createCategoriaIngrediente,
  update: ({ id, values }) => updateCategoriaIngrediente(id, values),
  remove: deleteCategoriaIngrediente,
})

const _categoriasProducto = createCrudHooks({
  queryKey: queryKeys.categoriasProducto,
  list: fetchCategoriasProducto,
  create: createCategoriaProducto,
  update: ({ id, values }) => updateCategoriaProducto(id, values),
  remove: deleteCategoriaProducto,
})

const _unidadesMedida = createCrudHooks({
  queryKey: queryKeys.unidadesMedida,
  list: fetchUnidadesMedida,
  create: createUnidadMedida,
  update: ({ id, values }) => updateUnidadMedida(id, values),
  remove: deleteUnidadMedida,
})

const _conversionesUnidades = createCrudHooks({
  queryKey: queryKeys.conversionesUnidades,
  list: fetchConversionesUnidades,
  create: createConversionUnidad,
  update: ({ id, values }) => updateConversionUnidad(id, values),
  remove: deleteConversionUnidad,
})

// Re-export con nombres originales para compatibilidad
export const useCategoriasRecetaQuery = _categoriasReceta.useList
export const useCreateCategoriaRecetaMutation = _categoriasReceta.useCreate
export const useUpdateCategoriaRecetaMutation = _categoriasReceta.useUpdate
export const useDeleteCategoriaRecetaMutation = _categoriasReceta.useRemove

export const useCategoriasIngredienteQuery = _categoriasIngrediente.useList
export const useCreateCategoriaIngredienteMutation = _categoriasIngrediente.useCreate
export const useUpdateCategoriaIngredienteMutation = _categoriasIngrediente.useUpdate
export const useDeleteCategoriaIngredienteMutation = _categoriasIngrediente.useRemove

export const useCategoriasProductoQuery = _categoriasProducto.useList
export const useCreateCategoriaProductoMutation = _categoriasProducto.useCreate
export const useUpdateCategoriaProductoMutation = _categoriasProducto.useUpdate
export const useDeleteCategoriaProductoMutation = _categoriasProducto.useRemove

export const useUnidadesMedidaQuery = _unidadesMedida.useList
export const useCreateUnidadMedidaMutation = _unidadesMedida.useCreate
export const useUpdateUnidadMedidaMutation = _unidadesMedida.useUpdate
export const useDeleteUnidadMedidaMutation = _unidadesMedida.useRemove

export const useConversionesUnidadesQuery = _conversionesUnidades.useList
export const useCreateConversionUnidadMutation = _conversionesUnidades.useCreate
export const useUpdateConversionUnidadMutation = _conversionesUnidades.useUpdate
export const useDeleteConversionUnidadMutation = _conversionesUnidades.useRemove

// ─── Ingredientes ────────────────────────────────────

export function useIngredientesQuery(filters = {}) {
  const authStore = useAuthStore()
  const queryKey = computed(() => queryKeys.ingredientes({ ...filters, empresa_id: authStore.currentEmpresaId }))
  return useQuery({
    queryKey,
    queryFn: () => fetchIngredientes({ ...filters, empresa_id: authStore.currentEmpresaId }),
  })
}

export function useIngredienteQuery(id) {
  return useQuery({
    queryKey: ['ingrediente', id],
    queryFn: () => fetchIngrediente(id),
    enabled: !!id,
  })
}

export function useProveedoresByIngredienteQuery(ingredienteId) {
  return useQuery({
    queryKey: ['proveedores_ingrediente', ingredienteId],
    queryFn: () => fetchProveedoresByIngrediente(ingredienteId),
    enabled: !!ingredienteId,
  })
}

// ─── Factory Entities ────────────────────────────────

/** @type {Record<string, ReturnType<typeof createCrudHooks>>} */
const _f = {
  ingredientes: createCrudHooks({
    queryKey: ['ingredientes'],
    scoped: true,
    list: fetchIngredientes,
    create: createIngrediente,
    update: ({ id, values }) => updateIngrediente(id, values),
    remove: deleteIngrediente,
  }),
  proveedores: createCrudHooks({
    queryKey: ['proveedores'],
    scoped: true,
    list: fetchProveedores,
    create: createProveedor,
    update: ({ id, values }) => updateProveedor(id, values),
    remove: deleteProveedor,
  }),
  recetas: createCrudHooks({
    queryKey: ['recetas'],
    scoped: true,
    list: fetchRecetas,
    update: ({ id, values }) => updateReceta(id, values),
    remove: deleteReceta,
  }),
  productos: createCrudHooks({
    queryKey: ['productos'],
    scoped: true,
    list: fetchProductos,
    create: createProducto,
    update: ({ id, values }) => updateProducto(id, values),
    remove: deleteProducto,
  }),
  ordenes: createCrudHooks({
    queryKey: ['ordenes_produccion'],
    scoped: true,
    list: fetchOrdenesProduccion,
  }),
  mermas: createCrudHooks({
    queryKey: ['mermas'],
    scoped: true,
    list: fetchMermas,
    update: ({ id, values }) => updateMerma(id, values),
    remove: deleteMerma,
  }),
}

// ─── Re-exports: Ingredientes ────────────────────────

export const useCreateIngredienteMutation = _f.ingredientes.useCreate
export const useUpdateIngredienteMutation = _f.ingredientes.useUpdate
export const useDeleteIngredienteMutation = _f.ingredientes.useRemove

// ─── Re-exports: Proveedores ─────────────────────────

export const useProveedoresQuery = _f.proveedores.useList
export const useCreateProveedorMutation = _f.proveedores.useCreate
export const useUpdateProveedorMutation = _f.proveedores.useUpdate
export const useDeleteProveedorMutation = _f.proveedores.useRemove

// ─── Re-exports: Recetas ─────────────────────────────

export const useRecetasQuery = _f.recetas.useList
// useCreateRecetaMutation: manual porque inyecta creado_por del usuario
export function useCreateRecetaMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createReceta({ ...values, empresa_id: authStore.currentEmpresaId, creado_por: authStore.user?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recetas'] }),
  })
}
export const useUpdateRecetaMutation = _f.recetas.useUpdate
export const useDeleteRecetaMutation = _f.recetas.useRemove

// ─── Re-exports: Productos ───────────────────────────

export const useProductosQuery = _f.productos.useList
export const useCreateProductoMutation = _f.productos.useCreate
export const useUpdateProductoMutation = _f.productos.useUpdate
export const useDeleteProductoMutation = _f.productos.useRemove

export function useGenerarProductosFaltantesMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: () => generarProductosFaltantes(authStore.currentEmpresaId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      return result
    },
  })
}

// ─── Re-exports: Órdenes ─────────────────────────────

export const useOrdenesProduccionQuery = _f.ordenes.useList
// useCreateOrdenMutation: manual porque inyecta usuario_responsable_id
export function useCreateOrdenMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createOrdenProduccion({ ...values, empresa_id: authStore.currentEmpresaId, usuario_responsable_id: authStore.user?.id }),
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

export function useOrdenProduccionQuery(id) {
  return useQuery({
    queryKey: queryKeys.ordenProduccion(id),
    queryFn: () => fetchOrdenProduccion(id),
    enabled: !!id,
  })
}

export function useUpdateOrdenMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: ({ id, values }) => updateOrdenProduccion(id, { ...values, empresa_id: authStore.currentEmpresaId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes_produccion'] }),
  })
}

// ─── Re-exports: Mermas ──────────────────────────────

export const useMermasQuery = _f.mermas.useList
// useCreateMermaMutation: manual porque inyecta registrado_por del usuario
export function useCreateMermaMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createMerma({ ...values, empresa_id: authStore.currentEmpresaId, registrado_por: authStore.user?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mermas }),
  })
}
export const useUpdateMermaMutation = _f.mermas.useUpdate
export const useDeleteMermaMutation = _f.mermas.useRemove

export function useProductosConStockQuery(empresaId) {
  const id = computed(() => unref(empresaId))
  return useQuery({
    queryKey: ['productos_con_stock', id],
    queryFn: () => fetchProductosConStock(id.value),
    enabled: () => !!id.value,
  })
}

export function useStockProductoQuery(id) {
  return useQuery({
    queryKey: ['stock_producto', id],
    queryFn: () => fetchStockProducto(id),
    enabled: !!id,
  })
}

export function useAuditLogsPaginated(filters = {}) {
  const page = ref(1)
  const pageSize = 50
  const from = computed(() => (page.value - 1) * pageSize)
  const to = computed(() => from.value + pageSize - 1)

  const { data, isLoading, error } = useQuery({
    queryKey: computed(() => ['audit_logs', filters, { page: page.value }]),
    queryFn: () => fetchAuditLogs({ ...filters, from: from.value, to: to.value }),
    placeholderData: keepPreviousData,
  })

  const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / pageSize)))

  function setPage(p) { page.value = Math.max(1, Math.min(p, totalPages.value)) }
  function nextPage() { setPage(page.value + 1) }
  function prevPage() { setPage(page.value - 1) }

  return {
    data: computed(() => data.value?.data ?? []),
    total: computed(() => data.value?.total ?? 0),
    page, pageSize, totalPages,
    setPage, nextPage, prevPage,
    isLoading, error,
  }
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
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => crearMovimientoMp({ ...values, empresa_id: authStore.currentEmpresaId }),
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

export function useStockValorizadoTotalQuery(empresaId) {
  const id = computed(() => unref(empresaId))
  return useQuery({
    queryKey: ['stock_valorizado_total', id],
    queryFn: () => fetchStockValorizadoTotal(id.value),
    enabled: () => !!id.value,
  })
}

export function useStockValorizadoQuery(tipo, itemId) {
  return useQuery({
    queryKey: ['stock_valorizado', tipo, itemId],
    queryFn: () => fetchStockValorizado(tipo, itemId),
    enabled: !!tipo && !!itemId,
  })
}

// ─── Movimientos PT ─────────────────────────────────

export function useMovimientosPtQuery(productoId) {
  return useQuery({
    queryKey: queryKeys.movimientosPt(productoId),
    queryFn: () => fetchMovimientosPt(productoId),
    enabled: !!productoId,
  })
}

export function useCrearMovimientoPtMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => crearMovimientoPt({ ...values, empresa_id: authStore.currentEmpresaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos_pt'] })
    },
  })
}

// ─── Cálculo de Materia Prima ────────────────────────

export function useCalculoIngredientesQuery(detalles) {
  const enabled = computed(() =>
    detalles.value?.length > 0 &&
    detalles.value.some(d => d.producto_id && d.receta_id && d.cantidad_programada > 0)
  )
  return useQuery({
    queryKey: ['calculo_ingredientes', detalles],
    queryFn: () => calcularIngredientesNecesarios(detalles),
    enabled,
    staleTime: 30_000,
  })
}

// Re-export para que las vistas puedan importarlo desde queries
export { calcularIngredientesNecesarios }

// ─── Cálculo de Costos ────────────────────────────────────

export function useRecalcularCostoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recetaId) => calcularCostoRecetaRPC(recetaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recetas })
    },
    onError: (err) => {
      console.error('Error al recalcular costo:', err)
    },
  })
}

export function useDescontarInventarioMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: ({ ordenId, detalles }) => descontarIngredientesOrden(ordenId, detalles, authStore.currentEmpresaId, authStore.user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos_mp'] })
      queryClient.invalidateQueries({ queryKey: ['stock_ingrediente'] })
    },
  })
}

// ─── Paginated Hooks ────────────────────────────────

export function useIngredientesPaginated(filters = {}) {
  const authStore = useAuthStore()
  return usePaginatedList({
    queryKey: ['ingredientes', 'paginated'],
    list: (params) => fetchIngredientes({ ...filters, ...params }),
    count: (params) => countIngredientes({ ...filters, ...params }),
    scoped: false,
    pageSize: 25,
  })
}

export function useRecetasPaginated() {
  const authStore = useAuthStore()
  return usePaginatedList({
    queryKey: queryKeys.recetas,
    scoped: true,
    list: (params) => fetchRecetas(params.empresa_id, params),
    count: (params) => countRecetas(params),
    pageSize: 25,
  })
}

export function useProductosPaginated() {
  const authStore = useAuthStore()
  return usePaginatedList({
    queryKey: queryKeys.productos,
    scoped: true,
    list: (params) => fetchProductos(params.empresa_id, params),
    count: (params) => countProductos(params),
    pageSize: 25,
  })
}

export function useProveedoresPaginated() {
  const authStore = useAuthStore()
  return usePaginatedList({
    queryKey: queryKeys.proveedores,
    scoped: true,
    list: (params) => fetchProveedores(params.empresa_id, params),
    count: (params) => countProveedores(params),
    pageSize: 25,
  })
}

export function useMermasPaginated() {
  const authStore = useAuthStore()
  return usePaginatedList({
    queryKey: queryKeys.mermas,
    scoped: true,
    list: (params) => fetchMermas(params.empresa_id, params),
    count: (params) => countMermas(params.empresa_id),
    pageSize: 25,
  })
}

export function useMovimientosMpPaginated(ingredienteId) {
  return usePaginatedList({
    queryKey: ['movimientos_mp', ingredienteId],
    list: (params) => fetchMovimientosMp(ingredienteId, params),
    count: () => countMovimientosMp(ingredienteId),
    pageSize: 25,
    queryOpts: { enabled: !!ingredienteId },
  })
}

export function useMovimientosPtPaginated(productoId) {
  return usePaginatedList({
    queryKey: ['movimientos_pt', productoId],
    list: (params) => fetchMovimientosPt(productoId, params),
    count: () => countMovimientosPt(productoId),
    pageSize: 25,
    queryOpts: { enabled: !!productoId },
  })
}
