import { describe, it, expect, beforeAll } from 'vitest'
import { supabase } from '@/core/supabase'

/**
 * TEST DE INTEGRACIÓN: RLS (Row Level Security)
 * 
 * NOTA: Estos tests utilizan un usuario pre-creado en el seed para garantizar
 * estabilidad y evitar problemas con el flujo de registro.
 */

describe('RLS Policies - Multi-Industry Platform', () => {
  let testUserAuthId
  let empresaA_id
  let empresaB_id

  beforeAll(async () => {
    // 1. Setup: IDs deterministas del seed
    empresaA_id = '00000000-0000-0000-0000-000000000080' // Panaderia Central
    empresaB_id = '00000000-0000-0000-0000-000000000090' // Tienda de Ropa

    // 2. Login con el usuario del seed
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'testuser@example.com',
      password: 'password123'
    })

    if (error) throw new Error(`Error de login: ${error.message}`)
    if (!data.user) throw new Error('No se pudo obtener el usuario tras el login')
    
    testUserAuthId = data.user.id
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

      expect(data).toBeNull()
    })
  })

  describe('Roles & Permisos', () => {
    it('debe restringir la gestión de miembros a los dueños de la empresa', async () => {
      // Intentar insertar un nuevo miembro en la empresa B desde el usuario de la empresa A
      const { error } = await supabase
        .from('empresa_usuarios')
        .insert({
          empresa_id: empresaB_id,
          usuario_id: '00000000-0000-0000-0000-000000009999',
          rol_id: '00000000-0000-0000-0000-000000000020', // admin_tienda
          es_dueno: false
        })

      if (error) {
        expect(['42501', '42503']).toContain(error.code)
      } else {
        throw new Error('SEGURIDAD: Un usuario pudo insertar miembros en una empresa ajena')
      }
    })
  })
})
