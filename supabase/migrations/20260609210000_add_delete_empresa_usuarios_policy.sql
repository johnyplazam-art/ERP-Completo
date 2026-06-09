-- ============================================================
-- Agregar DELETE policy para empresa_usuarios
-- Fecha: 2026-06-09
-- Descripción:
--   Permite que admins puedan remover (eliminar) usuarios
--   de una empresa. No se puede eliminar a sí mismo ni
--   al dueño de la empresa.
-- ============================================================

CREATE POLICY "empresa_usuarios_delete" ON public.empresa_usuarios FOR DELETE TO authenticated
  USING (
    public.es_admin_en_empresa(empresa_id)
    AND usuario_id != auth.uid()
    AND es_dueno = false
  );

SELECT '✅ DELETE policy added to empresa_usuarios' AS resultado;
