-- ============================================================
-- RPC: get_usuarios_email_all — emails multi-empresa
-- Fecha: 2026-06-09
-- Descripción:
--   Variante de get_usuarios_email que acepta múltiples
--   empresa_ids en un array. Usado por AdminUsers para
--   mostrar usuarios de todas las empresas.
--   El chequeo de admin es por empresa (misma lógica que
--   get_usuarios_email).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_usuarios_email_all(p_empresa_ids INT[])
RETURNS TABLE (usuario_id UUID, email TEXT)
SECURITY DEFINER
AS $$
  SELECT eu.usuario_id, au.email::TEXT
  FROM public.empresa_usuarios eu
  JOIN auth.users au ON au.id = eu.usuario_id
  WHERE eu.empresa_id = ANY(p_empresa_ids)
    AND eu.activo = true
    AND (
      eu.usuario_id = auth.uid()
      OR public.es_admin_en_empresa(eu.empresa_id)
    );
$$ LANGUAGE sql STABLE;

SELECT '✅ get_usuarios_email_all RPC created' AS resultado;
