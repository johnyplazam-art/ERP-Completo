-- ============================================================
-- MIGRACIÓN: Policies INSERT/UPDATE/DELETE para applications
-- Fecha: 2026-06-12
-- Descripción: Agrega policies faltantes para el CMS de apps.
--   La tabla applications tiene RLS habilitado pero solo policy
--   de SELECT. AdminApps.vue fallaba al crear/editar apps.
-- ============================================================

-- Los policies chequean que el usuario tenga rol 'admin'
-- en ALGUNA aplicación (user_roles + roles).
-- No se chequea empresa porque applications es global.
CREATE POLICY "Escritura applications admin insert"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

CREATE POLICY "Escritura applications admin update"
  ON public.applications FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

CREATE POLICY "Escritura applications admin delete"
  ON public.applications FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = 'admin'
  ));

SELECT '✅ Policies INSERT/UPDATE/DELETE para applications agregadas' AS resultado;
