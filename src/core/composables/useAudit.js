import { supabase } from '@/core/supabase'
import { useAuthStore } from '@/core/store/auth'

const STALE_MS = 30 * 60 * 1000 // 30 min

const ipCache = {
  value: null,
  timestamp: 0,
  refreshing: false,
}

async function refreshIp() {
  if (ipCache.refreshing) return ipCache.value || ''
  ipCache.refreshing = true
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    const d = await r.json()
    ipCache.value = d.ip
    ipCache.timestamp = Date.now()
    return d.ip
  } catch {
    return ipCache.value || ''
  } finally {
    ipCache.refreshing = false
  }
}

async function resolvePublicIp() {
  const now = Date.now()

  // Fresco — devolver inmediato
  if (ipCache.value && (now - ipCache.timestamp) < STALE_MS) {
    return ipCache.value
  }

  // Stale — devolver el valor viejo y refrescar en background
  if (ipCache.value) {
    refreshIp() // fire-and-forget
    return ipCache.value
  }

  // Sin cache — esperar el fetch
  return refreshIp()
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
