-- Seed data for testing RLS and multi-industry support (local INT-based schema)

-- 1. Empresa (ID auto-generado por SERIAL)
INSERT INTO public.empresas (nombre, slug, industria_principal)
SELECT 'Panaderia Central', 'emp-panaderia-central', id
FROM public.industrias WHERE slug = 'panaderia'
ON CONFLICT (slug) DO NOTHING;

-- 1b. Empresa ajena (para test RLS: existe pero el usuario NO pertenece)
INSERT INTO public.empresas (nombre, slug, industria_principal)
SELECT 'Otra Empresa', 'otra-empresa', id
FROM public.industrias WHERE slug = 'panaderia'
ON CONFLICT (slug) DO NOTHING;

-- 1b. Marcar usuario admin como platform_admin en local (si existe)
UPDATE public.perfiles
SET is_platform_admin = true
WHERE id IN (SELECT id FROM auth.users WHERE email LIKE 'admin@%')
  AND is_platform_admin = false;

-- 2. Plan gratuito (si no existe)
INSERT INTO public.planes (nombre, slug, descripcion, precio, periodo, features)
SELECT 'Plan Gratuito', 'gratuito', 'Plan gratuito para pruebas', 0, 'month', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.planes WHERE slug = 'gratuito');
