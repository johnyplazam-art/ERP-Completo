import { describe, it, expect, beforeAll } from 'vitest'
import { supabase, admin } from './helpers/supabase'
import { setupTestUser, TEST_EMAIL, TEST_PASSWORD } from './helpers/setup'

describe('RLS Policies - Multi-Industry Platform', () => {
  let empresaA_id
  let empresaB_id

  beforeAll(async () => {
    await setupTestUser()

    const { data: emps } = await admin
      .from('empresas')
      .select('id, slug')
      .in('slug', ['emp-panaderia-central', 'otra-empresa'])

    empresaA_id = emps.find(e => e.slug === 'emp-panaderia-central').id
    empresaB_id = emps.find(e => e.slug === 'otra-empresa').id

    // Ensure we're signed in
    const { error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    if (error) throw new Error(`Login failed: ${error.message}`)
  })

  describe('Empresas & Multi-tenancy', () => {
    it('debe permitir leer la empresa a la que el usuario pertenece', async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id')
        .eq('id', empresaA_id)
        .single()

      expect(error).toBeNull()
      expect(data?.id).toBe(empresaA_id)
    })

    it('NO debe permitir leer la empresa a la que el usuario NO pertenece', async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id')
        .eq('id', empresaB_id)
        .maybeSingle()

      expect(error).toBeNull()
      expect(data).toBeNull()
    })
  })

  describe('Roles & Permisos', () => {
    it('debe restringir la gestión de miembros a los dueños de la empresa', async () => {
      const { error } = await supabase
        .from('empresa_usuarios')
        .insert({
          empresa_id: empresaB_id,
          usuario_id: '00000000-0000-0000-0000-000000009999',
          es_dueno: false,
        })

      if (error) {
        expect(['42501', '42503']).toContain(error.code)
      } else {
        throw new Error('SEGURIDAD: Un usuario pudo insertar miembros en una empresa ajena')
      }
    })
  })
})
