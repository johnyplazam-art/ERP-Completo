-- ============================================================
-- FIX: get_apps_por_suscripcion — tipos de RETURNS TABLE
-- Fecha: 2026-06-17
-- Descripción:
--   La función declaraba slug como TEXT pero la columna real
--   applications.slug es VARCHAR(50). PostgreSQL exige que los
--   tipos coincidan exactamente en RETURNS TABLE, así que
--   casteamos explícitamente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_apps_por_suscripcion(p_empresa_id INT)
RETURNS TABLE(
  id INT,
  slug TEXT,
  name TEXT,
  description TEXT,
  is_active BOOLEAN,
  icon VARCHAR(50),
  orden INT
) AS $$
DECLARE
  v_features JSONB;
BEGIN
  -- Obtener features del plan activo
  SELECT p.features INTO v_features
  FROM public.suscripciones s
  JOIN public.planes p ON p.id = s.plan_id
  WHERE s.empresa_id = p_empresa_id
    AND s.estado = 'activa'
    AND (s.fecha_fin IS NULL OR s.fecha_fin > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Si no hay suscripción activa, retornar vacío
  IF v_features IS NULL THEN
    RETURN;
  END IF;

  -- Retornar apps incluidas en el plan
  RETURN QUERY
  SELECT
    a.id,
    a.slug::TEXT,
    a.name::TEXT,
    a.description::TEXT,
    a.is_active,
    a.icon,
    a.orden
  FROM public.applications a
  WHERE a.is_active = true
    AND a.slug = ANY (ARRAY(SELECT jsonb_array_elements_text(v_features->'apps')));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Asegurar permiso de ejecución
GRANT EXECUTE ON FUNCTION public.get_apps_por_suscripcion(INT) TO authenticated;

SELECT '✅ get_apps_por_suscripcion fixed — slug casted to TEXT' AS resultado;
