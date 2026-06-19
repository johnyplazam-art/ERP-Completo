import { supabase, admin } from './supabase'

export const TEST_EMAIL = 'testuser@example.com'
export const TEST_PASSWORD = 'password123'

export async function setupTestUser() {
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  if (loginErr) {
    const { error: signupErr } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: { data: { nombre: 'Test User', industria: 'panaderia' } },
    })
    if (signupErr) throw new Error(`Signup failed: ${signupErr.message}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user found after signup/login')
  const userId = user.id

  // Look up the seed empresa (Panaderia Central) by slug
  const { data: seedEmpresas } = await admin
    .from('empresas')
    .select('id, slug')
    .in('slug', ['emp-panaderia-central', 'otra-empresa'])

  const panaderiaId = seedEmpresas?.find(e => e.slug === 'emp-panaderia-central')?.id
  if (!panaderiaId) throw new Error('Seed empresa emp-panaderia-central not found')

  // Clean up auto-created empresa (from handle_new_user trigger)
  const { data: links } = await admin
    .from('empresa_usuarios')
    .select('empresa_id')
    .eq('usuario_id', userId)

  const autoIds = (links || []).map(r => r.empresa_id).filter(id => id !== panaderiaId)

  for (const eid of autoIds) {
    await admin.from('suscripciones').delete().eq('empresa_id', eid)
    await admin.from('user_roles').delete().eq('user_id', userId).eq('empresa_id', eid)
    await admin.from('empresa_usuarios').delete().eq('empresa_id', eid)
    await admin.from('empresas').delete().eq('id', eid)
  }

  // Link user to the seed empresa (Panaderia Central)
  const { count } = await admin
    .from('empresa_usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('empresa_id', panaderiaId)

  if (count === 0) {
    await admin.from('empresa_usuarios').insert({
      empresa_id: panaderiaId,
      usuario_id: userId,
      activo: true,
      es_dueno: true,
    })

    const { data: apps } = await admin.from('applications').select('id, slug')
    const { data: roles } = await admin.from('roles').select('id, slug, application_id')
    const bySlug = slug => apps.find(x => x.slug === slug)
    const roleBy = (slug, appSlug) => roles.find(r => r.slug === slug && r.application_id === bySlug(appSlug).id)

    const entries = [
      { user_id: userId, empresa_id: panaderiaId, role_id: roleBy('admin', 'core').id, application_id: bySlug('core').id },
      { user_id: userId, empresa_id: panaderiaId, role_id: roleBy('admin', 'panaderia').id, application_id: bySlug('panaderia').id },
    ]
    for (const entry of entries) {
      await admin.from('user_roles').upsert(entry, { onConflict: 'user_id,role_id,empresa_id' })
    }
  }

  const { data: { session }, error: reLoginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (reLoginErr) throw new Error(`Re-login failed: ${reLoginErr.message}`)

  return { userId, session }
}
