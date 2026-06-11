import { supabase } from '@/core/supabase'
import { useAuthStore } from '@/core/store/auth'

/**
 * useAudit — registra eventos de auditoría ISO
 *
 * Uso:
 *   const { log } = useAudit()
 *   await log('UPDATE', {
 *     table: 'ingredientes',
 *     entityId: '5',
 *     oldValue: { precio: 10 },
 *     newValue: { precio: 12 },
 *   })
 *
 * Actions comunes: INSERT, UPDATE, DELETE, LOGIN, LOGIN_FAIL, EXPORT, CANCEL
 */
export function useAudit() {
  const authStore = useAuthStore()

  async function log(
    action,
    { table, entityId, oldValue, newValue, trace } = {},
  ) {
    if (!authStore.user) return

    try {
      // getAppId tiene caché propio — solo consulta DB la primera vez
      const appId = await authStore.getAppId('panaderia')

      await supabase.from('audit_logs').insert({
        user_id: authStore.user.id,
        user_email: authStore.userEmail,
        application_id: appId,
        action,
        affected_table: table,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        source_ip: '',
        user_agent: navigator.userAgent,
        trace,
      })
    } catch (err) {
      // No romper el flujo si la auditoría falla
      console.error('[useAudit] Error logging event:', err)
    }
  }

  return { log }
}
