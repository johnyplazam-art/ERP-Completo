-- Migration: Módulo Panadería — Schema completo
-- Fecha: 2026-06-05
-- Descripción: Crea todas las tablas del módulo de panadería,
-- incluyendo catálogos, recetas, producción, inventario y mermas.

-- ============================================================
-- LIMPIEZA: Eliminar tablas del schema anterior (si existen)
-- ============================================================
DROP TABLE IF EXISTS public.mermas CASCADE;
DROP TABLE IF EXISTS public.movimientos_inventario_pt CASCADE;
DROP TABLE IF EXISTS public.movimientos_inventario_mp CASCADE;
DROP TABLE IF EXISTS public.orden_produccion_detalle CASCADE;
DROP TABLE IF EXISTS public.ordenes_produccion CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.receta_ingredientes CASCADE;
DROP TABLE IF EXISTS public.recetas CASCADE;
DROP TABLE IF EXISTS public.ingrediente_proveedor CASCADE;
DROP TABLE IF EXISTS public.proveedores CASCADE;
DROP TABLE IF EXISTS public.ingredientes CASCADE;
DROP TABLE IF EXISTS public.conversiones_unidades CASCADE;
DROP TABLE IF EXISTS public.unidades_medida CASCADE;
DROP TABLE IF EXISTS public.categorias_receta CASCADE;
DROP TABLE IF EXISTS public.categorias_ingrediente CASCADE;
DROP TABLE IF EXISTS public.categorias_producto CASCADE;

-- ============================================================
-- CATÁLOGOS BASE
-- ============================================================

-- Perfiles extendidos de usuarios (1:1 con auth.users)
CREATE TABLE public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'usuario'
    CHECK (rol IN ('admin', 'produccion', 'ventas', 'usuario')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.categorias_receta (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT DEFAULT ''
);

CREATE TABLE public.categorias_ingrediente (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT DEFAULT ''
);

CREATE TABLE public.categorias_producto (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT DEFAULT ''
);

CREATE TABLE public.unidades_medida (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  simbolo TEXT NOT NULL
);

CREATE TABLE public.conversiones_unidades (
  id SERIAL PRIMARY KEY,
  unidad_origen_id INT NOT NULL REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
  unidad_destino_id INT NOT NULL REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
  factor_multiplicacion NUMERIC(12,6) NOT NULL CHECK (factor_multiplicacion > 0),
  UNIQUE (unidad_origen_id, unidad_destino_id)
);

-- ============================================================
-- INGREDIENTES Y PROVEEDORES
-- ============================================================

CREATE TABLE public.ingredientes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria_id INT NOT NULL REFERENCES public.categorias_ingrediente(id) ON DELETE RESTRICT,
  unidad_base_id INT NOT NULL REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
  stock_minimo NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  ubicacion TEXT DEFAULT '',
  perecedero BOOLEAN NOT NULL DEFAULT false,
  vida_util_dias INT CHECK (vida_util_dias IS NULL OR vida_util_dias > 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredientes_categoria ON public.ingredientes(categoria_id);
CREATE INDEX idx_ingredientes_activo ON public.ingredientes(activo);

CREATE TABLE public.proveedores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  contacto TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  email TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ingrediente_proveedor (
  id SERIAL PRIMARY KEY,
  ingrediente_id INT NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  proveedor_id INT NOT NULL REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  precio_actual NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (precio_actual >= 0),
  plazo_entrega_dias INT DEFAULT 0 CHECK (plazo_entrega_dias >= 0),
  es_preferido BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (ingrediente_id, proveedor_id)
);

-- ============================================================
-- RECETAS
-- ============================================================

CREATE TABLE public.recetas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria_id INT NOT NULL REFERENCES public.categorias_receta(id) ON DELETE RESTRICT,
  instrucciones TEXT DEFAULT '',
  tiempo_preparacion_min INT CHECK (tiempo_preparacion_min IS NULL OR tiempo_preparacion_min > 0),
  rendimiento_cantidad NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (rendimiento_cantidad > 0),
  rendimiento_unidad_id INT NOT NULL REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
  costo_estimado NUMERIC(12,4) DEFAULT 0 CHECK (costo_estimado >= 0),
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recetas_categoria ON public.recetas(categoria_id);
CREATE INDEX idx_recetas_activa ON public.recetas(activa);

CREATE TABLE public.receta_ingredientes (
  id SERIAL PRIMARY KEY,
  receta_id INT NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
  ingrediente_id INT NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12,4) NOT NULL CHECK (cantidad > 0),
  unidad_id INT NOT NULL REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
  es_opcional BOOLEAN NOT NULL DEFAULT false,
  orden INT NOT NULL DEFAULT 0,
  UNIQUE (receta_id, ingrediente_id)
);

CREATE INDEX idx_receta_ingredientes_receta ON public.receta_ingredientes(receta_id);

-- ============================================================
-- PRODUCTOS TERMINADOS
-- ============================================================

CREATE TABLE public.productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria_id INT NOT NULL REFERENCES public.categorias_producto(id) ON DELETE RESTRICT,
  receta_id INT REFERENCES public.recetas(id) ON DELETE SET NULL,
  precio_venta NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  peso_unitario_gr NUMERIC(10,2) CHECK (peso_unitario_gr IS NULL OR peso_unitario_gr > 0),
  codigo_barras TEXT UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX idx_productos_activo ON public.productos(activo);

-- ============================================================
-- ÓRDENES DE PRODUCCIÓN
-- ============================================================

CREATE TABLE public.ordenes_produccion (
  id SERIAL PRIMARY KEY,
  fecha_programada DATE NOT NULL,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada')),
  nota TEXT DEFAULT '',
  usuario_responsable_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordenes_estado ON public.ordenes_produccion(estado);
CREATE INDEX idx_ordenes_fecha ON public.ordenes_produccion(fecha_programada);

CREATE TABLE public.orden_produccion_detalle (
  id SERIAL PRIMARY KEY,
  orden_id INT NOT NULL REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE,
  producto_id INT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  receta_id INT NOT NULL REFERENCES public.recetas(id) ON DELETE RESTRICT,
  cantidad_programada NUMERIC(12,4) NOT NULL CHECK (cantidad_programada > 0),
  cantidad_producida NUMERIC(12,4) DEFAULT 0 CHECK (cantidad_producida >= 0),
  cantidad_merma NUMERIC(12,4) DEFAULT 0 CHECK (cantidad_merma >= 0),
  cantidad_descarte NUMERIC(12,4) DEFAULT 0 CHECK (cantidad_descarte >= 0),
  lote TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada')),
  UNIQUE (orden_id, producto_id)
);

CREATE INDEX idx_orden_detalle_orden ON public.orden_produccion_detalle(orden_id);

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO
-- ============================================================

CREATE TABLE public.movimientos_inventario_mp (
  id SERIAL PRIMARY KEY,
  ingrediente_id INT NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'ajuste', 'merma')),
  cantidad NUMERIC(12,4) NOT NULL CHECK (cantidad != 0),
  unidad_id INT NOT NULL REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo TEXT DEFAULT '',
  proveedor_id INT REFERENCES public.proveedores(id) ON DELETE SET NULL,
  orden_detalle_id INT REFERENCES public.orden_produccion_detalle(id) ON DELETE SET NULL,
  nota TEXT DEFAULT '',
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mov_mp_ingrediente ON public.movimientos_inventario_mp(ingrediente_id);
CREATE INDEX idx_mov_mp_fecha ON public.movimientos_inventario_mp(fecha);
CREATE INDEX idx_mov_mp_tipo ON public.movimientos_inventario_mp(tipo);

CREATE TABLE public.movimientos_inventario_pt (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'ajuste', 'merma')),
  cantidad NUMERIC(12,4) NOT NULL CHECK (cantidad != 0),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  orden_detalle_id INT REFERENCES public.orden_produccion_detalle(id) ON DELETE SET NULL,
  nota TEXT DEFAULT '',
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mov_pt_producto ON public.movimientos_inventario_pt(producto_id);
CREATE INDEX idx_mov_pt_fecha ON public.movimientos_inventario_pt(fecha);

-- ============================================================
-- MERMAS
-- ============================================================

CREATE TABLE public.mermas (
  id SERIAL PRIMARY KEY,
  origen TEXT NOT NULL CHECK (origen IN ('produccion', 'inventario_mp', 'inventario_pt', 'devolucion')),
  ingrediente_id INT REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  producto_id INT REFERENCES public.productos(id) ON DELETE RESTRICT,
  orden_detalle_id INT REFERENCES public.orden_produccion_detalle(id) ON DELETE SET NULL,
  cantidad NUMERIC(12,4) NOT NULL CHECK (cantidad > 0),
  unidad_id INT REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('caducidad', 'rotura', 'error_produccion', 'devolucion', 'otro')),
  causa TEXT DEFAULT '',
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mermas_fecha ON public.mermas(fecha_registro);
CREATE INDEX idx_mermas_origen ON public.mermas(origen);

-- ============================================================
-- FUNCIÓN: Calcular stock actual de un ingrediente
-- ============================================================
CREATE OR REPLACE FUNCTION public.stock_ingrediente(p_ingrediente_id INT)
RETURNS NUMERIC(12,4) AS $$
DECLARE
  v_stock NUMERIC(12,4);
BEGIN
  SELECT COALESCE(SUM(
    CASE WHEN tipo IN ('ingreso') THEN cantidad
         ELSE -ABS(cantidad)
    END
  ), 0) INTO v_stock
  FROM public.movimientos_inventario_mp
  WHERE ingrediente_id = p_ingrediente_id;

  RETURN v_stock;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCIÓN: Calcular stock actual de un producto terminado
-- ============================================================
CREATE OR REPLACE FUNCTION public.stock_producto(p_producto_id INT)
RETURNS NUMERIC(12,4) AS $$
DECLARE
  v_stock NUMERIC(12,4);
BEGIN
  SELECT COALESCE(SUM(
    CASE WHEN tipo IN ('ingreso') THEN cantidad
         ELSE -ABS(cantidad)
    END
  ), 0) INTO v_stock
  FROM public.movimientos_inventario_pt
  WHERE producto_id = p_producto_id;

  RETURN v_stock;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCIÓN: Calcular costo real de una receta
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_costo_receta(p_receta_id INT)
RETURNS NUMERIC(12,4) AS $$
DECLARE
  v_costo NUMERIC(12,4);
BEGIN
  SELECT COALESCE(SUM(
    ri.cantidad * COALESCE(
      (SELECT ip.precio_actual FROM public.ingrediente_proveedor ip
       WHERE ip.ingrediente_id = ri.ingrediente_id AND ip.es_preferido = true
       ORDER BY ip.precio_actual ASC LIMIT 1),
      (SELECT ip.precio_actual FROM public.ingrediente_proveedor ip
       WHERE ip.ingrediente_id = ri.ingrediente_id
       ORDER BY ip.precio_actual ASC LIMIT 1),
      0
    )
  ), 0) INTO v_costo
  FROM public.receta_ingredientes ri
  WHERE ri.receta_id = p_receta_id;

  RETURN v_costo;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_receta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_ingrediente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversiones_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingrediente_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_produccion_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario_mp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario_pt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mermas ENABLE ROW LEVEL SECURITY;

-- Política universal de lectura: todos los usuarios autenticados pueden leer
CREATE POLICY "Lectura universal autenticados"
  ON public.perfiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.categorias_receta FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.categorias_ingrediente FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.categorias_producto FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.unidades_medida FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.conversiones_unidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.ingredientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.proveedores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.ingrediente_proveedor FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.recetas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.receta_ingredientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.productos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.ordenes_produccion FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.orden_produccion_detalle FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.movimientos_inventario_mp FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.movimientos_inventario_pt FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura universal autenticados"
  ON public.mermas FOR SELECT TO authenticated USING (true);

-- Política de escritura: admins y usuarios de producción pueden crear/editar
CREATE POLICY "Escritura admins y produccion"
  ON public.categorias_receta FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.categorias_ingrediente FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.categorias_producto FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.unidades_medida FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.conversiones_unidades FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion insert"
  ON public.ingredientes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion update"
  ON public.ingredientes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.proveedores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.ingrediente_proveedor FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion insert"
  ON public.recetas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion update"
  ON public.recetas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.receta_ingredientes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion insert"
  ON public.productos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion update"
  ON public.productos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion insert"
  ON public.ordenes_produccion FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion update"
  ON public.ordenes_produccion FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.orden_produccion_detalle FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

CREATE POLICY "Escritura admins y produccion"
  ON public.movimientos_inventario_mp FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion', 'ventas')));

CREATE POLICY "Escritura admins y produccion"
  ON public.movimientos_inventario_pt FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion', 'ventas')));

CREATE POLICY "Escritura admins y produccion"
  ON public.mermas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'produccion')));

-- Cada usuario puede leer/actualizar su propio perfil
CREATE POLICY "Propio perfil insert"
  ON public.perfiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Propio perfil update"
  ON public.perfiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- TRIGGER: Crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    'usuario'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
