-- Seed data for testing RLS and multi-industry support (local INT-based schema)

-- 0. Disable triggers temporarily (needed to insert into auth.users without handle_new_user firing)
SET session_replication_role = replica;

-- 1. Test user (password123)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000111',
  'testuser@example.com',
  '$2a$10$EixZaYVK1fsbw1ZfbX3IDeWGjzSNo3qx9LpSjOOTW66fKqL86S7XG',
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre":"Test User", "industria":"panaderia"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Perfil
INSERT INTO public.perfiles (id, nombre)
VALUES ('00000000-0000-0000-0000-000000000111', 'Test User')
ON CONFLICT DO NOTHING;

-- 3. Empresas (IDs auto-generados por SERIAL)
INSERT INTO public.empresas (nombre, slug, industria_principal)
SELECT 'Panaderia Central', 'emp-panaderia-central', id
FROM public.industrias WHERE slug = 'panaderia'
ON CONFLICT (slug) DO NOTHING;

-- 4. Vincular usuario con empresa (dueño + admin)
INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo, es_dueno)
SELECT e.id, '00000000-0000-0000-0000-000000000111', true, true
FROM public.empresas e WHERE e.slug = 'emp-panaderia-central'
ON CONFLICT DO NOTHING;

-- 5. Rol admin de panadería en user_roles
INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
SELECT
  '00000000-0000-0000-0000-000000000111',
  e.id,
  r.id,
  a.id
FROM public.empresas e
JOIN public.roles r ON r.slug = 'admin'
JOIN public.applications a ON a.slug = 'panaderia' AND r.application_id = a.id
WHERE e.slug = 'emp-panaderia-central'
ON CONFLICT DO NOTHING;

-- 6. Plan gratuito (si no existe)
INSERT INTO public.planes (nombre, slug, descripcion, precio, periodo, features)
SELECT 'Plan Gratuito', 'gratuito', 'Plan gratuito para pruebas', 0, 'month', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.planes WHERE slug = 'gratuito');

-- 7. Re-enable triggers
SET session_replication_role = origin;
