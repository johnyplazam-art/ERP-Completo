-- ============================================================
-- SEED: Catálogo inicial para módulo Panadería
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- NOTA: Este seed asume que las migraciones ya están aplicadas.
-- Si reiniciás la base con `supabase db reset`, Supabase
-- ejecutará este archivo automáticamente después de las migraciones.
-- ============================================================

-- ============================================================
-- 1. UNIDADES DE MEDIDA
-- ============================================================
INSERT INTO public.unidades_medida (nombre, simbolo) VALUES
  ('Kilogramo',    'kg'),
  ('Gramo',        'g'),
  ('Litro',        'L'),
  ('Mililitro',    'mL'),
  ('Unidad',       'ud'),
  ('Docena',       'doc'),
  ('Cucharada',    'cda'),
  ('Cucharadita',  'cdta'),
  ('Taza',         'tza'),
  ('Libra',        'lb'),
  ('Pieza',        'pz'),
  ('Paquete',      'pq'),
  ('Atado',        'atado'),
  ('Sobre',        'sobre'),
  ('Lata',         'lata')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 2. CONVERSIONES ENTRE UNIDADES
-- ============================================================
INSERT INTO public.conversiones_unidades
  (unidad_origen_id, unidad_destino_id, factor_multiplicacion)
SELECT
  (SELECT id FROM public.unidades_medida WHERE nombre = origen),
  (SELECT id FROM public.unidades_medida WHERE nombre = destino),
  factor
FROM (VALUES
  ('Kilogramo',     'Gramo',     1000),
  ('Gramo',         'Kilogramo', 0.001),
  ('Litro',         'Mililitro', 1000),
  ('Mililitro',     'Litro',     0.001),
  ('Docena',        'Unidad',    12),
  ('Unidad',        'Docena',    0.0833333),
  ('Libra',         'Kilogramo', 0.453592),
  ('Kilogramo',     'Libra',     2.20462),
  ('Taza',          'Mililitro', 240),
  ('Mililitro',     'Taza',      0.00416667),
  ('Cucharada',     'Mililitro', 15),
  ('Mililitro',     'Cucharada', 0.0666667),
  ('Cucharadita',   'Mililitro', 5),
  ('Mililitro',     'Cucharadita', 0.2),
  ('Cucharada',     'Cucharadita', 3),
  ('Cucharadita',   'Cucharada', 0.333333)
) AS t(origen, destino, factor)
ON CONFLICT (unidad_origen_id, unidad_destino_id) DO NOTHING;

-- ============================================================
-- 3. CATEGORÍAS DE INGREDIENTES
-- ============================================================
INSERT INTO public.categorias_ingrediente (nombre, descripcion) VALUES
  ('Harinas y derivados',       'Harina de trigo, maíz, centeno, almidones, féculas'),
  ('Grasas y aceites',          'Manteca, margarina, aceites vegetales, grasa vacuna'),
  ('Azúcares y edulcorantes',   'Azúcar común, impalpable, rubia, miel, glucosa'),
  ('Lácteos y huevos',          'Leche, crema, manteca, huevos, yogur'),
  ('Levaduras e impulsadores',  'Levadura fresca, seca, polvo de hornear, bicarbonato'),
  ('Sal y especias',            'Sal fina, entrefina, canela, esencia de vainilla'),
  ('Frutas y vegetales',        'Frutas frescas, deshidratadas, purés, vegetales'),
  ('Chocolate y cacao',         'Cacao en polvo, chocolate cobertura, baño'),
  ('Saborizantes y esencias',   'Esencias naturales, saborizantes, extractos'),
  ('Conservantes y mejoradores', 'Conservantes, mejoradores de masa, antimoho'),
  ('Rellenos y coberturas',     'Dulce de leche, mermeladas, cremas, glaseados'),
  ('Frutos secos y semillas',   'Almendras, nueces, semillas de amapola, sésamo'),
  ('Colorantes',                'Colorantes alimentarios naturales y artificiales'),
  ('Agua y líquidos',           'Agua, jugos, licores, café')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 4. CATEGORÍAS DE RECETAS
-- ============================================================
INSERT INTO public.categorias_receta (nombre, descripcion) VALUES
  ('Panes artesanales',     'Pan de campo, masa madre, pan casero'),
  ('Panes de molde',        'Pan lactal, pan de salvado, pan integral'),
  ('Panificados dulces',    'Pan dulce, budín, brioche'),
  ('Facturas y medialunas', 'Medialunas, vigilantes, cañoncitos, sacramentos'),
  ('Tortas y bizcochos',    'Tortas clásicas, bizcochuelos, rolled cakes'),
  ('Galletitas y masitas',  'Masitas secas, cookies, pasta flora'),
  ('Budines y muffins',     'Budín inglés, muffins, cupcakes'),
  ('Masas para tartas',     'Masa quebrada, masa de tarta, masa hojaldre'),
  ('Pre-pizzas y pizzas',   'Masa de pizza, pre-pizza, fugazzeta'),
  ('Pastelería fina',       'Postres, petit fours, masas finas'),
  ('Salados',               'Empanadas, tapas, grisines, pan de miga'),
  ('Especiales y temporada', 'Productos de estación, rosca de pascua, panettone')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 5. CATEGORÍAS DE PRODUCTOS (para la venta)
-- ============================================================
INSERT INTO public.categorias_producto (nombre, descripcion) VALUES
  ('Panes',                'Panes artesanales, de molde, especiales'),
  ('Pan dulce y budines',  'Pan dulce, budín inglés, panettone'),
  ('Facturas',             'Medialunas, vigilantes, cañoncitos, sacramentos'),
  ('Tortas enteras',       'Tortas clásicas y de temporada enteras'),
  ('Porciones de torta',   'Porciones individuales de torta'),
  ('Galletitas y masitas', 'Masitas secas, cookies, pasta flora'),
  ('Pizzas y pre-pizzas',  'Pizzas enteras, pre-pizzas, fugazzeta'),
  ('Salados',              'Empanadas, tapas, grisines, pan de miga'),
  ('Temporada',            'Productos de estación y ediciones limitadas'),
  ('Pan rallado y rebozador', 'Pan rallado, rebozador, migas')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT '✅ Seed completado' AS resultado,
       (SELECT COUNT(*) FROM public.unidades_medida) AS unidades,
       (SELECT COUNT(*) FROM public.conversiones_unidades) AS conversiones,
       (SELECT COUNT(*) FROM public.categorias_ingrediente) AS categorias_ingredientes,
       (SELECT COUNT(*) FROM public.categorias_receta) AS categorias_recetas,
       (SELECT COUNT(*) FROM public.categorias_producto) AS categorias_productos;
