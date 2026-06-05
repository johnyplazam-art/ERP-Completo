-- ============================================================
-- MIGRACIÓN: Corregir FKs a auth.users → perfiles
-- Fecha: 2026-06-05
-- Descripción: Cambia las FK que apuntan a auth.users(id) para
--   que apunten a perfiles(id) en las tablas que necesitan
--   join con perfiles desde el front-end (PostgREST).
--
-- MOTIVO: PostgREST (Supabase JS) solo puede resolver joins
--   embebidos cuando existe un FK directo entre las tablas.
--   Como perfiles.id YA tiene FK a auth.users(id) y contiene
--   el mismo UUID, cambiar las referencias es seguro.
-- ============================================================

-- ============================================================
-- 1. recetas.creado_por → perfiles(id)
-- ============================================================
ALTER TABLE public.recetas
  DROP CONSTRAINT IF EXISTS recetas_creado_por_fkey,
  ADD CONSTRAINT recetas_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.perfiles(id)
    ON DELETE RESTRICT;

-- ============================================================
-- 2. ordenes_produccion.usuario_responsable_id → perfiles(id)
-- ============================================================
ALTER TABLE public.ordenes_produccion
  DROP CONSTRAINT IF EXISTS ordenes_produccion_usuario_responsable_id_fkey,
  ADD CONSTRAINT ordenes_produccion_usuario_responsable_id_fkey
    FOREIGN KEY (usuario_responsable_id) REFERENCES public.perfiles(id)
    ON DELETE RESTRICT;

-- ============================================================
-- 3. movimientos_inventario_mp.creado_por → perfiles(id)
-- ============================================================
ALTER TABLE public.movimientos_inventario_mp
  DROP CONSTRAINT IF EXISTS movimientos_inventario_mp_creado_por_fkey,
  ADD CONSTRAINT movimientos_inventario_mp_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.perfiles(id)
    ON DELETE SET NULL;

-- ============================================================
-- 4. movimientos_inventario_pt.creado_por → perfiles(id)
-- ============================================================
ALTER TABLE public.movimientos_inventario_pt
  DROP CONSTRAINT IF EXISTS movimientos_inventario_pt_creado_por_fkey,
  ADD CONSTRAINT movimientos_inventario_pt_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.perfiles(id)
    ON DELETE SET NULL;

-- ============================================================
-- 5. mermas.registrado_por → perfiles(id)
-- ============================================================
ALTER TABLE public.mermas
  DROP CONSTRAINT IF EXISTS mermas_registrado_por_fkey,
  ADD CONSTRAINT mermas_registrado_por_fkey
    FOREIGN KEY (registrado_por) REFERENCES public.perfiles(id)
    ON DELETE SET NULL;

-- ============================================================
-- 6. user_roles.user_id → perfiles(id)
-- ============================================================
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
  ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.perfiles(id)
    ON DELETE CASCADE;

-- ============================================================
-- 7. user_roles.assigned_by → perfiles(id)
-- ============================================================
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey,
  ADD CONSTRAINT user_roles_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES public.perfiles(id)
    ON DELETE SET NULL;

-- ============================================================
-- 8. audit_logs.user_id → perfiles(id)
-- ============================================================
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
  ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.perfiles(id)
    ON DELETE SET NULL;

-- ============================================================
-- 9. productos (vieja migración) usuario_id → perfiles(id)
-- ============================================================
ALTER TABLE IF EXISTS public.productos
  DROP CONSTRAINT IF EXISTS productos_usuario_id_fkey;
-- Nota: Esta tabla existe en 20260605132957 pero la recreamos
-- en 20260605145000 sin el campo usuario_id. Solo por si acaso.

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT '✅ FKs corregidas a perfiles(id)' AS resultado;
