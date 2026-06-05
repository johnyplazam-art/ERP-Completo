// Supabase REST API client (no build needed, works with CDN)
// Uses Supabase REST API directly via fetch
// Docs: https://supabase.com/docs/guides/api

const PROJECT_URL = 'https://thnjjqenlnvsdfkbtwri.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobmpqcWVubG52c2Rma2J0d3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDQxNDUsImV4cCI6MjA5NDg4MDE0NX0.lfeJTDS6HoH9SsFU-c09BiT0bAnsTlTiIiyChbu_kRY'

function getAuthHeaders() {
  const token = localStorage.getItem('sias_token')
  const headers = {
    'apikey': ANON_KEY,
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// ─── REST API ──────────────────────────────────────────────

export const supabase = {
  // Get table query builder
  from(table) {
    const baseUrl = `${PROJECT_URL}/rest/v1/${table}`

    return {
      // SELECT with optional query params
      async select(columns = '*', options = {}) {
        const params = new URLSearchParams()
        params.set('select', columns)

        if (options.order) {
          params.set('order', options.order)
        }
        if (options.limit) {
          params.set('limit', String(options.limit))
        }
        if (options.offset) {
          params.set('offset', String(options.offset))
        }
        if (options.filters) {
          for (const [key, value] of Object.entries(options.filters)) {
            params.set(key, `eq.${value}`)
          }
        }

        const url = `${baseUrl}?${params.toString()}`
        const resp = await fetch(url, {
          headers: {
            ...getAuthHeaders(),
            'Prefer': 'count=exact',
          },
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ message: resp.statusText }))
          throw new Error(err.message || `Error ${resp.status}`)
        }
        // Read total count from content-range header
        const contentRange = resp.headers.get('content-range')
        let count = 0
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/)
          if (match) count = parseInt(match[1], 10)
        }
        const data = await resp.json()
        return { data, count, error: null }
      },

      // INSERT one or more rows
      async insert(rows, options = {}) {
        const url = options.returning ? `${baseUrl}?select=${options.returning}` : baseUrl
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Prefer': options.returning ? 'return=representation' : 'return=minimal',
          },
          body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ message: resp.statusText }))
          throw new Error(err.message || `Error ${resp.status}`)
        }
        const data = options.returning ? await resp.json() : null
        return { data, error: null }
      },

      // UPDATE rows matching filter
      async update(values, filters) {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(filters)) {
          params.set(key, `eq.${value}`)
        }
        const url = `${baseUrl}?${params.toString()}&select=*`
        const resp = await fetch(url, {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(values),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ message: resp.statusText }))
          throw new Error(err.message || `Error ${resp.status}`)
        }
        const data = await resp.json()
        return { data, error: null }
      },

      // DELETE rows matching filter
      async delete(filters) {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(filters)) {
          params.set(key, `eq.${value}`)
        }
        const url = `${baseUrl}?${params.toString()}`
        const resp = await fetch(url, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ message: resp.statusText }))
          throw new Error(err.message || `Error ${resp.status}`)
        }
        return { error: null }
      },

      // COUNT all rows
      async count(filters = {}) {
        const params = new URLSearchParams()
        params.set('select', 'count')
        for (const [key, value] of Object.entries(filters)) {
          params.set(key, `eq.${value}`)
        }
        const url = `${baseUrl}?${params.toString()}`
        const resp = await fetch(url, {
          headers: { ...getAuthHeaders(), Accept: 'application/json' },
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ message: resp.statusText }))
          throw new Error(err.message || `Error ${resp.status}`)
        }
        const data = await resp.json()
        return { count: data[0]?.count || 0, error: null }
      },
    }
  },
}

// ─── Auth API ──────────────────────────────────────────────

const AUTH_URL = `${PROJECT_URL}/auth/v1`

export const supabaseAuth = {
  async login(email, password) {
    const resp = await fetch(`${AUTH_URL}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      throw new Error(data.error_description || data.error || `Error ${resp.status}`)
    }
    return data
  },

  async signup(email, password) {
    const resp = await fetch(`${AUTH_URL}/signup`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      throw new Error(data.msg || data.error || `Error ${resp.status}`)
    }
    return data
  },

  async getUser(accessToken) {
    const resp = await fetch(`${AUTH_URL}/user`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    const data = await resp.json()
    if (!resp.ok) {
      throw new Error(data.msg || `Error ${resp.status}`)
    }
    return data
  },

  logout() {
    localStorage.removeItem('sias_token')
    localStorage.removeItem('sias_user')
  },
}
