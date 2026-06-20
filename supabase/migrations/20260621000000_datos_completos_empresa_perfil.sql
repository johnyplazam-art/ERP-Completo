-- Migration: datos_completos_empresa_perfil
-- Description: Add comprehensive company info fields to empresas
--              and personal info fields to perfiles.
--              Fix perfiles RLS to allow platform_admin updates.
-- Date: 2026-06-21

-- 1. EMPRESAS — comprehensive company info
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS razon_social TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'CUIT',
  ADD COLUMN IF NOT EXISTS documento TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS direccion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ciudad TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provincia TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT 'AR',
  ADD COLUMN IF NOT EXISTS codigo_postal TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefono TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT '';

-- 2. PERFILES — comprehensive personal info
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS apellido TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'DNI',
  ADD COLUMN IF NOT EXISTS documento TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS direccion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ciudad TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provincia TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT 'AR',
  ADD COLUMN IF NOT EXISTS puesto TEXT NOT NULL DEFAULT '';

-- 3. FIX RLS — platform admin can update any perfil
DROP POLICY IF EXISTS "perfiles_update" ON public.perfiles;
CREATE POLICY "perfiles_update" ON public.perfiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.user_is_platform_admin(auth.uid()));

SELECT '✅ Datos completos empresa/perfil migration applied' AS resultado;
