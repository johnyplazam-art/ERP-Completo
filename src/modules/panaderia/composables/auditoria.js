import { supabase, withRange } from './_helpers'

// ─── Auditoría ─────────────────────────────────────────

export async function fetchAuditLogs(opts = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (opts.action) query = query.eq('action', opts.action)
  if (opts.table) query = query.ilike('affected_table', opts.table)
  if (opts.userId) query = query.eq('user_id', opts.userId)

  if (opts.dateFrom) {
    query = query.gte('created_at', opts.dateFrom)
  }
  if (opts.dateTo) {
    query = query.lte('created_at', opts.dateTo)
  }

  query = withRange(query, opts)

  const { data, error, count } = await query
  if (error) throw error
  return { data, total: count ?? 0 }
}
