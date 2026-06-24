import { toast } from 'vue-sonner'

/**
 * Configura manejo global de errores para supabase.
 *
 * Parchea supabase.from() y supabase.rpc() in-place.
 *
 * Supabase JS v2 resuelve las promesas con { data, error } para errores
 * PostgREST (no las rechaza). Este wrapper captura AMBOS casos:
 *   - Resolved: { data: null, error: { code, status, message } }
 *   - Rejected: network error, timeout, etc.
 *
 * Uso en main.js:
 *   import { setupGlobalErrorHandler } from '@/core/supabase-error'
 *   setupGlobalErrorHandler(supabase, { router, authStore })
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ router: import('vue-router').Router, authStore: ReturnType<typeof import('@/core/store/auth').useAuthStore> }} opts
 */
export function setupGlobalErrorHandler(supabase, { router, authStore }) {
  const originalFrom = supabase.from.bind(supabase)
  const originalRpc = supabase.rpc.bind(supabase)

  /**
   * Wrapper para Promises de Supabase.
   * Captura tanto resolved errors ({ data, error }) como rejected (network).
   */
  function wrapPromise(promise) {
    const origThen = promise.then.bind(promise)
    promise.then = function (onFulfilled, onRejected) {
      return origThen(
        (result) => {
          // Supabase resuelve con { data, error } para errores PostgREST
          if (result && result.error) {
            handleSupabaseError(result.error)
          }
          return onFulfilled?.(result)
        },
        (error) => {
          // Network / fetch errors rechazan la promise
          handleSupabaseError(error)
          return onRejected?.(error)
        },
      )
    }
    return promise
  }

  /**
   * Wrapper para query builders (.select, .insert, etc.)
   */
  function wrapQueryMethods(query) {
    ;['select', 'insert', 'update', 'delete', 'upsert'].forEach((method) => {
      const original = query[method].bind(query)
      query[method] = function (...args) {
        const builder = original(...args)
        return wrapPromise(builder)
      }
    })
    return query
  }

  // ─── Parchear from() ─────────────────────────────────

  supabase.from = function (table) {
    const query = originalFrom(table)
    return wrapQueryMethods(query)
  }

  // ─── Parchear rpc() ─────────────────────────────────

  supabase.rpc = function (...args) {
    const promise = originalRpc(...args)
    return wrapPromise(promise)
  }

  // ─── Manejador central ──────────────────────────────

  function handleSupabaseError(error) {
    // El flag __supabaseHandled permite que el código local
    // evite duplicar toasts si ya fue manejado globalmente.
    if (error.__supabaseHandled) return
    error.__supabaseHandled = true

    const code = error.code
    const status = error.status ?? error.statusCode

    if (status === 401 || code === 'PGRST301') {
      toast.error('Sesión expirada. Redirigiendo al login...')
      authStore.logout().catch(() => {})
      router.push('/login')
      return
    }

    if (status === 403 || status === 42501 || code === 'PGRST104') {
      toast.error('No tenés permisos para realizar esta acción')
      return
    }

    if (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('ERR_NAME_NOT_RESOLVED') ||
      error.message?.includes('ERR_CONNECTION_REFUSED')
    ) {
      toast.error('Error de conexión. Verificá tu internet.')
      return
    }

    // Otros errores — log y toast genérico
    console.warn('[supabase-error] Error no manejado:', error)
    toast.error(error.message || 'Error inesperado')
  }
}
