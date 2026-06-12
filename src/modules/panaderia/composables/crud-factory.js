import { computed, ref } from 'vue'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/vue-query'
import { useAuthStore } from '@/core/store/auth'

/**
 * createCrudHooks — factory para hooks CRUD de TanStack Query
 *
 * Reduce el boilerplate de queries.js. Cada llamada genera 4 hooks:
 *   useList(), useCreate(), useUpdate(), useRemove()
 *
 * @param {Object} config
 * @param {Array|Function} config.queryKey — clave o función que retorna clave (recibe authStore)
 * @param {Function} config.list — fetchFn(queryKey params)
 * @param {Function} [config.create] — createFn(values)
 * @param {Function} [config.update] — updateFn({ id, values })
 * @param {Function} [config.remove] — removeFn(id)
 * @param {boolean} [config.scoped=false] — si necesita empresa_id de authStore
 * @param {Object} [config.queryOpts={}] — opciones extra para useQuery (enabled, staleTime, etc.)
 * @returns {{ useList, useCreate, useUpdate, useRemove }}
 *
 * @example
 *   const recetas = createCrudHooks({
 *     queryKey: ['recetas'],
 *     scoped: true,
 *     list: (empresaId) => fetchRecetas(empresaId),
 *     create: (values) => createReceta(values),
 *     update: ({ id, values }) => updateReceta(id, values),
 *     remove: (id) => deleteReceta(id),
 *   })
 *   // Uso en componente:
 *   const { data, isLoading } = recetas.useList()
 *   const createMut = recetas.useCreate()
 */
export function createCrudHooks(config) {
  const { queryKey, list, create, update, remove, scoped = false, queryOpts = {} } = config

  // ─── List (useQuery) ─────────────────────────────────
  function useList() {
    const authStore = scoped ? useAuthStore() : null

    const key = typeof queryKey === 'function'
      ? computed(() => queryKey(authStore))
      : scoped
        ? computed(() => [...queryKey, authStore.currentEmpresaId])
        : queryKey

    const fetcher = scoped
      ? () => list(authStore.currentEmpresaId)
      : list

    return useQuery({ queryKey: key, queryFn: fetcher, ...queryOpts })
  }

  // ─── Create (useMutation) ────────────────────────────
  function useCreate() {
    const queryClient = useQueryClient()
    const authStore = scoped ? useAuthStore() : null

    const resolvedKey = Array.isArray(queryKey) ? queryKey : ['_dynamic_']

    return useMutation({
      mutationFn: (values) => {
        const payload = scoped ? { ...values, empresa_id: authStore.currentEmpresaId } : values
        return create ? create(payload) : Promise.reject(new Error('create not configured'))
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: resolvedKey }),
    })
  }

  // ─── Update (useMutation) ────────────────────────────
  function useUpdate() {
    const queryClient = useQueryClient()
    const resolvedKey = Array.isArray(queryKey) ? queryKey : ['_dynamic_']

    return useMutation({
      mutationFn: ({ id, values }) => update ? update(id, values) : Promise.reject(new Error('update not configured')),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: resolvedKey }),
    })
  }

  // ─── Remove (useMutation) ────────────────────────────
  function useRemove() {
    const queryClient = useQueryClient()
    const resolvedKey = Array.isArray(queryKey) ? queryKey : ['_dynamic_']

    return useMutation({
      mutationFn: (id) => remove ? remove(id) : Promise.reject(new Error('remove not configured')),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: resolvedKey }),
    })
  }

  return { useList, useCreate, useUpdate, useRemove }
}

/**
 * usePaginatedList — query con paginación server-side
 *
 * Similar a createCrudHooks().useList() pero con paginación.
 *
 * @param {Object} config
 * @param {Array|Function} config.queryKey — clave base
 * @param {Function} config.list — fetchFn({ from, to, ...params })
 * @param {Function} config.count — countFn(params) — devuelve total de registros
 * @param {boolean} [config.scoped=false]
 * @param {number} [config.pageSize=25]
 * @param {Object} [config.queryOpts={}]
 * @returns {{ data, total, page, pageSize, totalPages, setPage, nextPage, prevPage, isLoading, error }}
 */
export function usePaginatedList(config) {
  const { queryKey, list, count, scoped = false, pageSize = 25, queryOpts = {} } = config
  const page = ref(1)
  const authStore = scoped ? useAuthStore() : null

  const from = computed(() => (page.value - 1) * pageSize)
  const to = computed(() => from.value + pageSize - 1)

  const params = computed(() => {
    const base = { from: from.value, to: to.value }
    if (scoped && authStore) base.empresa_id = authStore.currentEmpresaId
    return base
  })

  const key = computed(() => [
    ...(Array.isArray(queryKey) ? queryKey : [queryKey]),
    { page: page.value, pageSize },
    ...(scoped ? [authStore?.currentEmpresaId] : []),
  ])

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => list(params.value),
    placeholderData: keepPreviousData,
    ...queryOpts,
  })

  const { data: total } = useQuery({
    queryKey: [...(Array.isArray(queryKey) ? queryKey : [queryKey]), 'count', ...(scoped ? [authStore?.currentEmpresaId] : [])],
    queryFn: () => count(scoped ? { empresa_id: authStore?.currentEmpresaId } : {}),
    placeholderData: keepPreviousData,
    ...queryOpts,
  })

  const totalPages = computed(() => Math.max(1, Math.ceil((total ?? 0) / pageSize)))

  function setPage(p) { page.value = Math.max(1, Math.min(p, totalPages.value)) }
  function nextPage() { setPage(page.value + 1) }
  function prevPage() { setPage(page.value - 1) }

  return { data, total, page, pageSize, totalPages, setPage, nextPage, prevPage, isLoading, error }
}
