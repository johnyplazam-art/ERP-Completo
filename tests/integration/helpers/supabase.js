import { createClient } from '@supabase/supabase-js'

const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const LOCAL_SERVICE_ROLE_KEY = 'sb_secret_REPLACE_WITH_YOUR_KEY'

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

export const supabase = createClient(LOCAL_URL, LOCAL_ANON_KEY, opts)

// Admin client with service_role key (bypasses RLS)
export const admin = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, opts)
