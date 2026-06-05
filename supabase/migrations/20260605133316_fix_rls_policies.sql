-- Fix RLS policies to handle usuario_id properly
-- The initial migration required usuario_id = auth.uid() for writes,
-- but the frontend doesn't always send usuario_id.
-- Instead, we auto-set it via a trigger and simplify the policies.

-- Drop old policies
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear productos" ON public.productos;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios productos" ON public.productos;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios productos" ON public.productos;

-- Create trigger function to auto-set usuario_id
CREATE OR REPLACE FUNCTION public.set_usuario_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.usuario_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for INSERT
DROP TRIGGER IF EXISTS trg_productos_set_usuario_id ON public.productos;
CREATE TRIGGER trg_productos_set_usuario_id
  BEFORE INSERT ON public.productos
  FOR EACH ROW
  WHEN (NEW.usuario_id IS NULL)
  EXECUTE FUNCTION public.set_usuario_id();

-- New policies:
-- Authenticated users can create products (usuario_id is auto-set by trigger)
CREATE POLICY "Usuarios autenticados pueden crear productos"
  ON public.productos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own products
CREATE POLICY "Usuarios pueden actualizar sus propios productos"
  ON public.productos
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Users can delete their own products
CREATE POLICY "Usuarios pueden eliminar sus propios productos"
  ON public.productos
  FOR DELETE
  TO authenticated
  USING (usuario_id = auth.uid());
