-- ============================================================
-- Agregar icon y orden a applications para CMS del dashboard
-- Fecha: 2026-06-09
-- ============================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'pi pi-th-large',
  ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;

-- Actualizar iconos para apps existentes
UPDATE public.applications SET icon = 'pi pi-shop',      orden = 10 WHERE slug = 'panaderia';
UPDATE public.applications SET icon = 'pi pi-calculator', orden = 20 WHERE slug = 'contabilidad';

SELECT '✅ icon and orden added to applications' AS resultado;
