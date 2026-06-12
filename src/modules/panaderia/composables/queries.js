import { computed, ref } from 'vue'
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
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
  fetchProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  fetchIngredientesProveedor,
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
  createOrdenProduccion,
  updateOrdenEstado,
  fetchMovimientosMp,
  crearMovimientoMp,
  fetchMovimientosPt,
  crearMovimientoPt,
  fetchStockIngrediente,
  calcularIngredientesNecesarios,
  descontarIngredientesOrden,
  countIngredientes,
  countProveedores,
  countRecetas,
  countProductos,
  countOrdenesProduccion,
  countMovimientosMp,
  countMovimientosPt,
} from './database'
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

export function useCreateIngredienteMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createIngrediente({ ...values, empresa_id: authStore.currentEmpresaId }),
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
  const authStore = useAuthStore()
  const queryKey = computed(() => [...queryKeys.proveedores, authStore.currentEmpresaId])
  return useQuery({
    queryKey,
    queryFn: () => fetchProveedores(authStore.currentEmpresaId),
  })
}

export function useCreateProveedorMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createProveedor({ ...values, empresa_id: authStore.currentEmpresaId }),
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
  const authStore = useAuthStore()
  const queryKey = computed(() => [...queryKeys.recetas, authStore.currentEmpresaId])
  return useQuery({
    queryKey,
    queryFn: () => fetchRecetas(authStore.currentEmpresaId),
  })
}

export function useCreateRecetaMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createReceta({ ...values, empresa_id: authStore.currentEmpresaId, creado_por: authStore.user?.id }),
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
  const authStore = useAuthStore()
  const queryKey = computed(() => [...queryKeys.productos, authStore.currentEmpresaId])
  return useQuery({
    queryKey,
    queryFn: () => fetchProductos(authStore.currentEmpresaId),
  })
}

export function useCreateProductoMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createProducto({ ...values, empresa_id: authStore.currentEmpresaId }),
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
  const authStore = useAuthStore()
  const queryKey = computed(() => [...queryKeys.ordenesProduccion, authStore.currentEmpresaId])
  return useQuery({
    queryKey,
    queryFn: () => fetchOrdenesProduccion(authStore.currentEmpresaId),
  })
}

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

// ─── Mermas ──────────────────────────────────────────

export function useMermasQuery() {
  const authStore = useAuthStore()
  const queryKey = computed(() => [...queryKeys.mermas, authStore.currentEmpresaId])
  return useQuery({
    queryKey,
    queryFn: () => fetchMermas(authStore.currentEmpresaId),
  })
}

export function useCreateMermaMutation() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (values) => createMerma({ ...values, empresa_id: authStore.currentEmpresaId, registrado_por: authStore.user?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mermas }),
  })
}

export function useUpdateMermaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }) => updateMerma(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mermas }),
  })
}

export function useDeleteMermaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteMerma(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mermas }),
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
  const key = computed(() => [...queryKeys.movimientosMp(ingredienteId), 'paginated'])
  const page = ref(1)
  const pageSize = 25
  const from = computed(() => (page.value - 1) * pageSize)
  const to = computed(() => from.value + pageSize - 1)

  const queryKey = computed(() => [...key.value, { page: page.value }])

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchMovimientosMp(ingredienteId ?? undefined, { from: from.value, to: to.value }),
    placeholderData: keepPreviousData,
    enabled: !!ingredienteId,
  })

  const { data: total } = useQuery({
    queryKey: [...key.value, 'count'],
    queryFn: () => countMovimientosMp(ingredienteId ?? undefined),
    placeholderData: keepPreviousData,
  })

  const totalPages = computed(() => Math.max(1, Math.ceil((total ?? 0) / pageSize)))

  function setPage(p) { page.value = Math.max(1, Math.min(p, totalPages.value)) }
  function nextPage() { setPage(page.value + 1) }
  function prevPage() { setPage(page.value - 1) }

  return { data, total, page, pageSize, totalPages, setPage, nextPage, prevPage, isLoading, error }
}

export function useMovimientosPtPaginated(productoId) {
  const key = computed(() => [...queryKeys.movimientosPt(productoId), 'paginated'])
  const page = ref(1)
  const pageSize = 25
  const from = computed(() => (page.value - 1) * pageSize)
  const to = computed(() => from.value + pageSize - 1)

  const queryKey = computed(() => [...key.value, { page: page.value }])

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchMovimientosPt(productoId ?? undefined, { from: from.value, to: to.value }),
    placeholderData: keepPreviousData,
    enabled: !!productoId,
  })

  const { data: total } = useQuery({
    queryKey: [...key.value, 'count'],
    queryFn: () => countMovimientosPt(productoId ?? undefined),
    placeholderData: keepPreviousData,
  })

  const totalPages = computed(() => Math.max(1, Math.ceil((total ?? 0) / pageSize)))

  function setPage(p) { page.value = Math.max(1, Math.min(p, totalPages.value)) }
  function nextPage() { setPage(page.value + 1) }
  function prevPage() { setPage(page.value - 1) }

  return { data, total, page, pageSize, totalPages, setPage, nextPage, prevPage, isLoading, error }
}
