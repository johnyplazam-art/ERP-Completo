-- ============================================================
-- MIGRACIÓN: Limpieza de perfiles
-- Fecha: 2026-06-17
-- Descripción:
--   Elimina columna `activo` de perfiles ya que el estado
--   de activación se maneja en empresa_usuarios.activo.
--
--   Columnas finales de perfiles:
--     id, nombre, avatar_url, phone, idioma, created_at, updated_at
-- ============================================================

ALTER TABLE public.perfiles DROP COLUMN IF EXISTS activo;

SELECT '✅ Drop activo from perfiles complete' AS resultado;
