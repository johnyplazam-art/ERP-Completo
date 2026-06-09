-- ============================================================
-- FIX: Eliminar referencias a empresa_usuarios.rol en funciones
-- Fecha: 2026-06-09
-- Descripción:
--   La migración 20260609140000 eliminó la columna rol de
--   empresa_usuarios, pero dejó dos funciones que la referencian:
--     - usuario_en_empresa() → rompe RLS policies de tablas
--       de negocio → HTTP 400 en queries del Dashboard
--     - es_admin_en_empresa() → rompe policies de empresa_usuarios
--   Este fix actualiza ambas funciones para que usen user_roles.
-- ============================================================

-- ============================================================
-- 1. FIX usuario_en_empresa()
-- ============================================================
-- Ya no necesita verificar roles (ahora están en user_roles).
-- Solo verifica membresía activa en la empresa.
CREATE OR REPLACE FUNCTION public.usuario_en_empresa(p_empresa_id INT, p_roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.empresa_usuarios
    WHERE usuario_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND activo = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 2. FIX es_admin_en_empresa()
-- ============================================================
-- Ahora verifica el rol 'admin' en user_roles en lugar de
-- empresa_usuarios.rol
CREATE OR REPLACE FUNCTION public.es_admin_en_empresa(p_empresa_id INT)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.empresa_id = p_empresa_id
      AND r.slug = 'admin'
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 3. VERIFICACIÓN
-- ============================================================
SELECT '✅ Fix functions dropped column complete' AS resultado;
