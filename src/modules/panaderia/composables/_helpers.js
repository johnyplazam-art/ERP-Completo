import { supabase } from '@/core/supabase'

export { supabase }

/**
 * Aplica .range(from, to) a una query si los parámetros están presentes.
 * La paginación es server-side (SQL LIMIT/OFFSET).
 */
export function withRange(query, opts) {
  if (opts?.from !== undefined && opts?.to !== undefined) {
    return query.range(opts.from, opts.to)
  }
  return query
}
