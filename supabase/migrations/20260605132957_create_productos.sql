-- Migration: Create productos table for SIAS ERP
-- Requires pgcrypto extension for gen_random_uuid()

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main products table
CREATE TABLE public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria TEXT NOT NULL,
  subcategoria TEXT DEFAULT '',
  unidad_medida TEXT NOT NULL,
  precio_costo NUMERIC(12, 2) NOT NULL CHECK (precio_costo >= 0),
  precio_venta NUMERIC(12, 2) NOT NULL CHECK (precio_venta >= 0),
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  stock_maximo INTEGER NOT NULL DEFAULT 0 CHECK (stock_maximo >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on codigo
ALTER TABLE public.productos ADD CONSTRAINT productos_codigo_unique UNIQUE (codigo);

-- Check: precio_venta >= precio_costo
ALTER TABLE public.productos ADD CONSTRAINT productos_precio_check CHECK (precio_venta >= precio_costo);

-- Check: stock_minimo <= stock_maximo
ALTER TABLE public.productos ADD CONSTRAINT productos_stock_check CHECK (stock_minimo <= stock_maximo);

-- Index for common searches
CREATE INDEX idx_productos_codigo ON public.productos (codigo);
CREATE INDEX idx_productos_categoria ON public.productos (categoria);
CREATE INDEX idx_productos_activo ON public.productos (activo);

-- Trigger to auto-update actualizado_en
CREATE OR REPLACE FUNCTION public.update_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_productos_actualizado_en
  BEFORE UPDATE ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_actualizado_en();

-- Row Level Security
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Users can read all active products (for now, open read)
CREATE POLICY "Todos pueden leer productos activos"
  ON public.productos
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own products
CREATE POLICY "Usuarios autenticados pueden crear productos"
  ON public.productos
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

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
