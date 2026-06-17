-- ============================================================
-- FIX: Agregar permisos faltantes de receta_ingredientes
-- Fecha: 2026-06-17
-- Descripción:
--   La migración 20260609140000 (Odoo roles) creó RLS policies
--   que requieren permisos {tabla}.create/.update/.delete para
--   receta_ingredientes, pero esos permisos nunca fueron creados
--   ni asignados a ningún rol.
--
--   Esto causa error 403 al insertar ingredientes en una receta:
--     POST .../receta_ingredientes 403 Forbidden
-- ============================================================

-- ============================================================
-- 1. CREAR PERMISOS FALTANTES
-- ============================================================
INSERT INTO public.permissions (action_name, description, category) VALUES
  ('receta_ingredientes.create', 'Agregar ingredientes a recetas', 'recetas'),
  ('receta_ingredientes.update', 'Modificar ingredientes de recetas', 'recetas'),
  ('receta_ingredientes.delete', 'Eliminar ingredientes de recetas', 'recetas')
ON CONFLICT (action_name) DO NOTHING;

-- ============================================================
-- 2. ASIGNAR A ROLES (mismos que tienen recetas.*)
-- ============================================================
-- Admin: todos los permisos (INSERT todo contra todo)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'admin'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND p.action_name IN ('receta_ingredientes.create', 'receta_ingredientes.update', 'receta_ingredientes.delete')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Producción: create + update (como recetas.create + recetas.update)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'produccion'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND p.action_name IN ('receta_ingredientes.create', 'receta_ingredientes.update')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Panificador: create + update (como recetas.create + recetas.update)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'panificador'
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
  AND p.action_name IN ('receta_ingredientes.create', 'receta_ingredientes.update')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ============================================================
-- 3. VERIFICACIÓN
-- ============================================================
SELECT '✅ Fix receta_ingredientes permissions complete' AS resultado;
