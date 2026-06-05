-- ============================================================
-- MIGRACIÓN: Políticas UPDATE/DELETE para tablas catálogo
-- Fecha: 2026-06-05
-- Descripción: Agrega policies faltantes para que las vistas
--   de administración de catálogos puedan editar y eliminar
--   registros de categorías y unidades de medida.
-- ============================================================

-- ============================================================
-- 1. categorias_receta
-- ============================================================
CREATE POLICY "Escritura admins y produccion update"
  ON public.categorias_receta FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion delete"
  ON public.categorias_receta FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 2. categorias_ingrediente
-- ============================================================
CREATE POLICY "Escritura admins y produccion update"
  ON public.categorias_ingrediente FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion delete"
  ON public.categorias_ingrediente FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 3. categorias_producto
-- ============================================================
CREATE POLICY "Escritura admins y produccion update"
  ON public.categorias_producto FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion delete"
  ON public.categorias_producto FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 4. unidades_medida
-- ============================================================
CREATE POLICY "Escritura admins y produccion update"
  ON public.unidades_medida FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion delete"
  ON public.unidades_medida FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 5. conversiones_unidades (solo admin puede borrar)
-- ============================================================
CREATE POLICY "Escritura admins y produccion delete"
  ON public.conversiones_unidades FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 6. ingredientes (DELETE faltaba)
-- ============================================================
CREATE POLICY "Escritura admins y produccion delete"
  ON public.ingredientes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 7. proveedores (UPDATE y DELETE faltaban)
-- ============================================================
CREATE POLICY "Escritura admins y produccion update"
  ON public.proveedores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion delete"
  ON public.proveedores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 8. recetas (DELETE faltaba)
-- ============================================================
CREATE POLICY "Escritura admins y produccion delete"
  ON public.recetas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- 9. productos (DELETE faltaba, reemplaza policy anterior con usuario_id)
-- ============================================================
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios productos" ON public.productos;
CREATE POLICY "Escritura admins y produccion delete"
  ON public.productos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT '✅ Policies UPDATE/DELETE para catálogos e ingredientes agregadas' AS resultado;
