-- ============================================================
-- RPC: get_usuarios_email — emails de usuarios de una empresa
-- Fecha: 2026-06-09
-- Descripción:
--   Permite que un usuario vea su propio email y que los admins
--   vean los emails de todos los usuarios en su empresa.
--   Necesario porque auth.users no es accesible desde el cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_usuarios_email(p_empresa_id INT)
RETURNS TABLE (usuario_id UUID, email TEXT)
SECURITY DEFINER
AS $$
  SELECT eu.usuario_id, au.email::TEXT
  FROM public.empresa_usuarios eu
  JOIN auth.users au ON au.id = eu.usuario_id
  WHERE eu.empresa_id = p_empresa_id
    AND eu.activo = true
    AND (
      eu.usuario_id = auth.uid()                    -- tu propio email
      OR public.es_admin_en_empresa(p_empresa_id)   -- o sos admin
    );
$$ LANGUAGE sql STABLE;

SELECT '✅ get_usuarios_email RPC created' AS resultado;
