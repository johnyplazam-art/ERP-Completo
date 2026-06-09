-- ============================================================
-- FIX: RLS recursion en user_roles policies
-- Fecha: 2026-06-09
-- Descripción:
--   Las policies INSERT/UPDATE/DELETE de user_roles consultan
--   user_roles internamente para verificar si el usuario es
--   admin, causando infinite recursion.
--   Se reemplazan usando es_admin_en_empresa() que es SECURITY
--   DEFINER y bypassa RLS (misma técnica que empresa_usuarios).
-- ============================================================

-- ============================================================
-- 1. user_roles INSERT
-- ============================================================
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.es_admin_en_empresa(empresa_id)
  );

-- ============================================================
-- 2. user_roles UPDATE
-- ============================================================
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.es_admin_en_empresa(empresa_id)
  );

-- ============================================================
-- 3. user_roles DELETE
-- ============================================================
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.es_admin_en_empresa(empresa_id)
  );

-- ============================================================
-- 4. VERIFICACIÓN
-- ============================================================
SELECT '✅ Fix user_roles RLS recursion complete' AS resultado;
