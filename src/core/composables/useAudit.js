import { supabase } from '@/core/supabase'
import { useAuthStore } from '@/core/store/auth'

let cachedIp = null
let ipPromise = null

async function resolvePublicIp() {
  if (cachedIp) return cachedIp
  if (ipPromise) return ipPromise
  ipPromise = fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(d => { cachedIp = d.ip; return d.ip })
    .catch(() => '')
    .finally(() => { ipPromise = null })
  return ipPromise
}

function getUserAgent() {
  try {
    return navigator.userAgent || 'unknown'
  } catch {
    return 'unknown'
  }
}

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
 * appSlug: opcional, por defecto usa authStore.currentAppSlug
 */
export function useAudit() {
  const authStore = useAuthStore()

  async function log(
    action,
    { table, entityId, oldValue, newValue, trace, sourceIp, appSlug } = {},
  ) {
    if (!authStore.user) return

    try {
      const slug = appSlug || authStore.currentAppSlug
      const appId = await authStore.getAppId(slug)

      await supabase.from('audit_logs').insert({
        user_id: authStore.user.id,
        user_email: authStore.userEmail,
        application_id: appId,
        action,
        affected_table: table,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        source_ip: sourceIp || await resolvePublicIp(),
        user_agent: getUserAgent(),
        trace,
      })
    } catch (err) {
      console.error('[useAudit] Error logging event:', err)
    }
  }

  return { log }
}
