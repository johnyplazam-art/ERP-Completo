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
-- 3b. CATEGORÍAS DE INGREDIENTES — GASTRONOMÍA
-- ============================================================
INSERT INTO public.categorias_ingrediente (nombre, descripcion) VALUES
  ('Carnes y aves',            'Carne vacuna, pollo, cerdo, pescados, mariscos'),
  ('Verduras y hortalizas',    'Cebolla, ajo, zanahoria, tomate, lechuga, papa, morrón'),
  ('Pastas, arroces y legumbres', 'Fideos, arroz, lentejas, garbanzos, quinoa'),
  ('Hierbas y condimentos',    'Perejil, laurel, orégano, pimienta, romero, tomillo'),
  ('Quesos y fiambres',        'Queso parmesano, queso crema, jamón, salame, mozzarella')
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
-- 4b. CATEGORÍAS DE RECETAS — GASTRONOMÍA
-- ============================================================
INSERT INTO public.categorias_receta (nombre, descripcion) VALUES
  ('Entradas y aperitivos',  'Entradas frías y calientes, tapas, bruschettas, finger food'),
  ('Sopas y cremas',         'Sopas, cremas, locro, guisos, caldos'),
  ('Ensaladas',              'Ensaladas frescas, wok, bowl, coleslaw'),
  ('Pastas y arroces',       'Pastas secas, frescas, risottos, arroces, gnocchi'),
  ('Carnes y aves',          'Platos principales con carne vacuna, pollo, cerdo, cordero'),
  ('Pescados y mariscos',    'Pescados de mar y río, mariscos, frutos de mar'),
  ('Guarniciones',           'Purés, papas, vegetales salteados, arroz blanco'),
  ('Salsas y aderezos',      'Salsas base, emulsionadas, aderezos, marinadas'),
  ('Postres y dulces',       'Flan, mousse, helado, ensalada de frutas, compotas')
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
-- 6. USUARIO SEMILLA (necesario para FK creado_por en recetas)
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_sent_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'seed@panaderia.local',
  '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre":"Usuario Semilla"}',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. INGREDIENTES DE EJEMPLO
-- ============================================================
INSERT INTO public.ingredientes (nombre, categoria_id, unidad_base_id, activo, stock_minimo, perecedero, empresa_id)
SELECT v.nombre, c.id, u.id, v.activo, v.stock_minimo, v.perecedero, 1
FROM (VALUES
  ('Harina 000',            'Harinas y derivados',     'Gramo',   true, 10000, false),
  ('Harina Integral',       'Harinas y derivados',     'Gramo',   true,  5000, false),
  ('Harina 0000',           'Harinas y derivados',     'Gramo',   true,  5000, false),
  ('Manteca',               'Grasas y aceites',        'Gramo',   true,  2000, true ),
  ('Grasa Vacuna',          'Grasas y aceites',        'Gramo',   true,  2000, true ),
  ('Aceite de Girasol',     'Grasas y aceites',        'Mililitro', true, 1000, false),
  ('Azúcar',                'Azúcares y edulcorantes', 'Gramo',   true,  5000, false),
  ('Azúcar Impalpable',     'Azúcares y edulcorantes', 'Gramo',   true,  2000, false),
  ('Miel',                  'Azúcares y edulcorantes', 'Gramo',   true,  1000, false),
  ('Leche Entera',          'Lácteos y huevos',        'Mililitro', true, 2000, true ),
  ('Crema de Leche',        'Lácteos y huevos',        'Mililitro', true, 1000, true ),
  ('Huevos',                'Lácteos y huevos',        'Unidad',  true,    30, true ),
  ('Levadura Fresca',       'Levaduras e impulsadores', 'Gramo',  true,   500, true ),
  ('Levadura Seca',         'Levaduras e impulsadores', 'Gramo',  true,   200, false),
  ('Polvo de Hornear',      'Levaduras e impulsadores', 'Gramo',  true,   500, false),
  ('Sal Fina',              'Sal y especias',           'Gramo',  true,  1000, false),
  ('Canela Molida',         'Sal y especias',           'Gramo',  true,   100, false),
  ('Esencia de Vainilla',   'Saborizantes y esencias',  'Mililitro', true, 100, false),
  ('Cacao Amargo',          'Chocolate y cacao',        'Gramo',  true,  1000, false),
  ('Chocolate Cobertura',   'Chocolate y cacao',        'Gramo',  true,  1000, true ),
  ('Agua',                  'Agua y líquidos',          'Mililitro', true,10000, false),
  ('Pasas de Uva',          'Frutas y vegetales',       'Gramo',  true,  1000, false),
  ('Nueces',                'Frutos secos y semillas',  'Gramo',  true,  1000, false),
  ('Dulce de Leche',        'Rellenos y coberturas',    'Gramo',  true,  2000, true ),
  ('Salvado de Trigo',      'Harinas y derivados',      'Gramo',  true,  1000, false),
  ('Leche en Polvo',        'Lácteos y huevos',         'Gramo',  true,  1000, false),
  ('Ralladura de Limón',    'Frutas y vegetales',       'Gramo',  true,    50, true )
) AS v (nombre, cat_nombre, unidad_nombre, activo, stock_minimo, perecedero)
JOIN public.categorias_ingrediente c ON c.nombre = v.cat_nombre
JOIN public.unidades_medida u ON u.nombre = v.unidad_nombre
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredientes i WHERE i.nombre = v.nombre AND i.empresa_id = 1
);

-- ============================================================
-- 7b. INGREDIENTES GASTRONÓMICOS
-- ============================================================
INSERT INTO public.ingredientes (nombre, categoria_id, unidad_base_id, activo, stock_minimo, perecedero, empresa_id)
SELECT v.nombre, c.id, u.id, v.activo, v.stock_minimo, v.perecedero, 1
FROM (VALUES
  ('Pechuga de Pollo',     'Carnes y aves',             'Gramo',     true,  5000, true ),
  ('Carne Picada de Res',  'Carnes y aves',             'Gramo',     true,  5000, true ),
  ('Cebolla',              'Verduras y hortalizas',     'Gramo',     true,  5000, true ),
  ('Ajo',                  'Verduras y hortalizas',     'Gramo',     true,   200, true ),
  ('Zanahoria',            'Verduras y hortalizas',     'Gramo',     true,  3000, true ),
  ('Tomate',               'Verduras y hortalizas',     'Gramo',     true,  5000, true ),
  ('Lechuga',              'Verduras y hortalizas',     'Unidad',    true,    10, true ),
  ('Papa',                 'Verduras y hortalizas',     'Gramo',     true, 10000, true ),
  ('Morrón Rojo',          'Verduras y hortalizas',     'Gramo',     true,  2000, true ),
  ('Apio',                 'Verduras y hortalizas',     'Gramo',     true,  1000, true ),
  ('Queso Parmesano',      'Quesos y fiambres',         'Gramo',     true,  1000, true ),
  ('Pan Rallado',          'Harinas y derivados',       'Gramo',     true,  2000, false),
  ('Aceite de Oliva',      'Grasas y aceites',          'Mililitro', true,  1000, false),
  ('Limón',                'Frutas y vegetales',        'Gramo',     true,  1000, true ),
  ('Pimienta Negra',       'Hierbas y condimentos',     'Gramo',     true,   100, false),
  ('Orégano',              'Hierbas y condimentos',     'Gramo',     true,    50, false),
  ('Laurel',               'Hierbas y condimentos',     'Gramo',     true,    30, false),
  ('Perejil',              'Hierbas y condimentos',     'Gramo',     true,   200, true ),
  ('Fideos Spaghetti',     'Pastas, arroces y legumbres', 'Gramo',   true,  3000, false),
  ('Arroz',                'Pastas, arroces y legumbres', 'Gramo',   true,  5000, false),
  ('Puré de Tomate',       'Verduras y hortalizas',     'Mililitro', true,  2000, false)
) AS v (nombre, cat_nombre, unidad_nombre, activo, stock_minimo, perecedero)
JOIN public.categorias_ingrediente c ON c.nombre = v.cat_nombre
JOIN public.unidades_medida u ON u.nombre = v.unidad_nombre
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredientes i WHERE i.nombre = v.nombre AND i.empresa_id = 1
);

-- ============================================================
-- 7c. MÁS INGREDIENTES GASTRONÓMICOS
-- ============================================================
INSERT INTO public.ingredientes (nombre, categoria_id, unidad_base_id, activo, stock_minimo, perecedero, empresa_id)
SELECT v.nombre, c.id, u.id, v.activo, v.stock_minimo, v.perecedero, 1
FROM (VALUES
  ('Tapas de Empanada',    'Harinas y derivados',       'Unidad',    true,    50, false),
  ('Aceitunas Verdes',     'Verduras y hortalizas',     'Gramo',     true,  1000, true ),
  ('Pimentón',             'Hierbas y condimentos',     'Gramo',     true,   100, false),
  ('Comino',               'Hierbas y condimentos',     'Gramo',     true,   100, false),
  ('Hongos',               'Verduras y hortalizas',     'Gramo',     true,  1000, true ),
  ('Vino Blanco',          'Agua y líquidos',           'Mililitro', true,  1000, false)
) AS v (nombre, cat_nombre, unidad_nombre, activo, stock_minimo, perecedero)
JOIN public.categorias_ingrediente c ON c.nombre = v.cat_nombre
JOIN public.unidades_medida u ON u.nombre = v.unidad_nombre
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingredientes i WHERE i.nombre = v.nombre AND i.empresa_id = 1
);
-- ============================================================
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Pan Francés', c.id,
  '1. Disolver levadura en agua tibia con una pizca de azúcar. Reposar 10 min.
2. Mezclar harina con sal. Agregar levadura activada y el resto del agua.
3. Amasar 10-15 min hasta obtener masa lisa y elástica.
4. Primer levado: 1 hora o hasta duplicar volumen.
5. Desgasificar, dividir en piezas de 250g, formar bollos alargados.
6. Segundo levado: 45 min.
7. Hacer cortes diagonales con cuchillo filoso.
8. Hornear a 220°C con vapor durante 25-30 min hasta dorado.',
  180, 6, u.id, 1500.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Panes artesanales' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Pan Francés' AND empresa_id = 1);

INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Pan de Molde Integral', c.id,
  '1. Activar levadura en agua tibia con azúcar. Reposar 10 min.
2. Mezclar harinas, salvado, leche en polvo y sal.
3. Agregar levadura, manteca derretida y agua. Amasar 10 min.
4. Primer levado: 1 h o hasta duplicar.
5. Desgasificar, formar cilindro y colocar en molde enmantecado.
6. Segundo levado: 45 min hasta que llegue al borde del molde.
7. Hornear a 180°C por 35-40 min.',
  150, 2, u.id, 2000.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Panes de molde' AND u.nombre = 'Pieza'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Pan de Molde Integral' AND empresa_id = 1);

INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Medialunas de Manteca', c.id,
  '1. Mezclar harina, azúcar, sal y levadura desmenuzada.
2. Agregar leche tibia, huevos y esencia de vainilla. Unir sin amasar.
3. Estirar en rectángulo, colocar manteca pomada en el centro.
4. Tapar con la masa, sellar bordes. Dar 3 pliegues simples (como hojaldre).
5. Reposar en heladera 30 min entre pliegue y pliegue.
6. Estirar a 5mm, cortar triángulos de 10cm de base.
7. Enrollar desde la base hacia la punta, formar medialuna.
8. Segundo levado: 2 h.
9. Pintar con huevo batido. Hornear a 190°C por 15-18 min.
10. Al salir, pintar con almíbar (agua + azúcar hervidos).',
  300, 24, u.id, 4500.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Facturas y medialunas' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Medialunas de Manteca' AND empresa_id = 1);

INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Galletitas de Chocolate', c.id,
  '1. Batir manteca pomada con azúcar hasta cremar.
2. Agregar huevo y esencia de vainilla. Batir.
3. Mezclar harina, cacao amargo y polvo de hornear. Tamizar.
4. Incorporar secos a la mezcla anterior sin amasar de más.
5. Agregar chips de chocolate (opcional).
6. Reposar en heladera 30 min.
7. Formar bolitas, colocar en placa con separación.
8. Hornear a 180°C por 12-15 min (deben estar blandas al sacar).
9. Dejar enfriar en placa 5 min, luego pasar a rejilla.',
  60, 30, u.id, 2800.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Galletitas y masitas' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Galletitas de Chocolate' AND empresa_id = 1);

INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Budín de Vainilla', c.id,
  '1. Batir manteca pomada con azúcar hasta cremar (blanco y esponjoso).
2. Agregar huevos de a uno, incorporando bien cada vez.
3. Agregar esencia de vainilla y ralladura de limón.
4. Tamizar harina con polvo de hornear. Incorporar alternando con leche.
5. Enharinar pasas (si se agregan) para que no se hundan.
6. Verter en molde de budín enmantecado y enharinado.
7. Hornear a 170°C por 40-45 min (probar con palillo).
8. Reposar 10 min, desmoldar y enfriar sobre rejilla.',
  90, 1, u.id, 3500.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Budines y muffins' AND u.nombre = 'Pieza'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Budín de Vainilla' AND empresa_id = 1);

INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Masa de Pizza Clásica', c.id,
  '1. Disolver levadura en agua tibia con azúcar. Reposar 10 min.
2. Mezclar harina con sal. Agregar levadura activada y aceite.
3. Amasar 8-10 min hasta masa lisa y elástica.
4. Primer levado: 1 h o hasta duplicar.
5. Desgasificar, dividir en bollos de 250g.
6. Estirar en discos de 30cm diámetro.
7. Precocinar 5 min a 200°C si se va a congelar.
8. Si es consumo inmediato, cubrir y llevar directamente al horno.',
  120, 4, u.id, 1800.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Pre-pizzas y pizzas' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Masa de Pizza Clásica' AND empresa_id = 1);

-- ============================================================
-- 8b. RECETAS GASTRONÓMICAS
-- ============================================================

-- 8b-i. Ensalada César (categoría: Ensaladas)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Ensalada César', c.id,
  '1. Hervir el huevo 1 min, enfriar y reservar (para la salsa).
2. Cortar pan en cubos, rociar con aceite de oliva y tostar en sartén o horno.
3. Salpimentar la pechuga de pollo y cocinar a la plancha 6-8 min por lado. Dejar reposar y filetear.
4. Para la salsa César: licuar yema de huevo, jugo de limón, ajo, mostaza (opcional) y queso parmesano. Agregar aceite de oliva en hilo hasta emulsionar.
5. Cortar lechuga, mezclar con la salsa, agregar pollo fileteado y croutons.
6. Espolvorear queso parmesano por encima.',
  30, 2, u.id, 4500.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Ensaladas' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Ensalada César' AND empresa_id = 1);

-- 8b-ii. Milanesa de Pollo con Puré (categoría: Carnes y aves)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Milanesa de Pollo con Puré', c.id,
  '1. Salpimentar las pechugas de pollo. Pasarlas por huevo batido y luego por pan rallado.
2. Calentar abundante aceite a 170°C. Freír las milanesas 3-4 min por lado hasta doradas.
3. Escurrir sobre papel absorbente.
4. PARA EL PURÉ: Pelar papas, cortar en cubos y hervir en agua con sal hasta que estén tiernas (15-20 min).
5. Hacer puré con pisapapas. Agregar manteca, leche caliente y sal. Batir hasta cremoso.',
  45, 4, u.id, 5500.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Carnes y aves' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Milanesa de Pollo con Puré' AND empresa_id = 1);

-- 8b-iii. Salsa Bolognesa (categoría: Salsas y aderezos)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Salsa Bolognesa', c.id,
  '1. Picar cebolla, ajo y zanahoria en cubos muy pequeños (brunoise).
2. Calentar aceite en una olla. Rehogar la cebolla hasta transparente (5 min).
3. Agregar ajo y zanahoria. Cocinar 3 min más.
4. Agregar carne picada, desmenuzando con cuchara de madera. Cocinar hasta que pierda el color rosado.
5. Agregar puré de tomate, laurel, orégano, sal y pimienta.
6. Cocinar a fuego bajo 30-40 min, revolviendo cada tanto. Rectificar sal.
7. Si queda muy ácida, agregar una pizca de azúcar.',
  60, 6, u.id, 3200.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Salsas y aderezos' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Salsa Bolognesa' AND empresa_id = 1);

-- 8b-iv. Flan Casero (categoría: Postres y dulces)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Flan Casero', c.id,
  '1. CARAMELO: poner azúcar en una olla a fuego medio hasta que se disuelva y tome color ámbar. Verter en el molde, cubriendo fondo y paredes.
2. Mezclar leche, huevos, azúcar y esencia de vainilla. Batir suavemente sin hacer espuma.
3. Verter la mezcla sobre el caramelo.
4. Cocinar a baño maría en horno a 160°C por 50-60 min (hasta que al insertar un cuchillo salga limpio).
5. Dejar enfriar a temperatura ambiente, luego heladera mínimo 4 h.
6. Desmoldar pasando un cuchillo por el borde y volteando sobre un plato.',
  70, 1, u.id, 2800.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Postres y dulces' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Flan Casero' AND empresa_id = 1);

-- ============================================================
-- 8c. MÁS RECETAS GASTRONÓMICAS
-- ============================================================

-- 8c-i. Empanadas de Carne (categoría: Entradas y aperitivos)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Empanadas de Carne', c.id,
  '1. PICADO: hervir 2 huevos 10 min, enfriar y picar. Picar cebolla en cubos chicos.
2. RELLENO: calentar aceite, rehogar cebolla hasta transparente. Agregar carne picada y cocinar hasta que pierda el color.
3. Agregar comino, pimentón, sal y pimienta. Cocinar 5 min. Retirar del fuego.
4. Agregar aceitunas picadas, pasas de uva y huevo picado. Mezclar bien. Dejar enfriar.
5. ARMADO: colocar 1 cda. de relleno en el centro de cada tapa. Humedecer borde, cerrar y repulgar.
6. Pintar con huevo batido. Hornear a 200°C por 15-18 min hasta doradas.',
  90, 12, u.id, 6000.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Entradas y aperitivos' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Empanadas de Carne' AND empresa_id = 1);

-- 8c-ii. Pastel de Papas (categoría: Carnes y aves)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Pastel de Papas', c.id,
  '1. RELLENO: picar cebolla, ajo y morrón en cubos. Calentar aceite y rehogar.
2. Agregar carne picada, desmenuzar. Cocinar hasta dorar.
3. Agregar puré de tomate, laurel, sal, pimienta y comino. Cocinar 15 min a fuego bajo.
4. Opcional: agregar aceitunas y pasas. Reservar.
5. PURÉ: pelar y cortar papas en cubos. Hervir en agua con sal hasta tiernas (15-20 min).
6. Hacer puré, agregar manteca, leche caliente y 1 huevo. Batir hasta cremoso. Salpimentar.
7. ARMADO: en fuente para horno, colocar capa de relleno. Cubrir con puré. Decorar con tenedor.
8. Pintar con huevo batido. Hornear a 200°C por 30 min hasta que el puré esté dorado.',
  90, 1, u.id, 7000.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Carnes y aves' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Pastel de Papas' AND empresa_id = 1);

-- 8c-iii. Risotto de Hongos (categoría: Pastas y arroces)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Risotto de Hongos', c.id,
  '1. Limpiar y filetear los hongos. Picar cebolla y ajo finamente.
2. CALDO: calentar agua con sal (o caldo de verduras) y mantener a fuego bajo.
3. En una olla amplia, calentar aceite de oliva y rehogar cebolla hasta transparente (5 min).
4. Agregar ajo y hongos. Cocinar 5 min hasta que los hongos suelten su agua.
5. Agregar arroz y revolver 1 min hasta que los granos estén transparentes.
6. Verter vino blanco, revolver hasta que se evapore el alcohol.
7. Agregar caldo caliente de a cucharones, revolviendo constantemente. Esperar a que se absorba cada cucharón antes de agregar el siguiente (18-20 min).
8. Cuando el arroz esté al dente, retirar del fuego. Agregar manteca y queso parmesano. Mezclar enérgicamente (mantecatura).
9. Reposar 2 min tapado. Servir con perejil picado y parmesano rallado.',
  45, 4, u.id, 5500.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Pastas y arroces' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Risotto de Hongos' AND empresa_id = 1);

-- 8c-iv. Mousse de Chocolate (categoría: Postres y dulces)
INSERT INTO public.recetas (nombre, categoria_id, instrucciones, tiempo_preparacion_min, rendimiento_cantidad, rendimiento_unidad_id, costo_estimado, creado_por, empresa_id)
SELECT 'Mousse de Chocolate', c.id,
  '1. Derretir el chocolate cobertura a baño maría o en microondas (golpes de 30 seg). Dejar entibiar.
2. Separar claras de yemas. Batir las claras a punto nieve con la mitad del azúcar. Reservar.
3. En otro bowl, batir las yemas con el resto del azúcar hasta que estén pálidas y espumosas.
4. Agregar el chocolate derretido a las yemas. Mezclar suavemente.
5. Batir la crema de leche a medio punto (no muy firme).
6. Incorporar la crema a la mezcla de chocolate con movimientos envolventes.
7. Incorporar las claras a nieve en dos tandas, con movimientos envolventes y suaves.
8. Verter en copas o en un bowl grande. Llevar a heladera mínimo 4 h (ideal 6 h).
9. Decorar con crema batida, cacao en polvo o virutas de chocolate antes de servir.',
  30, 6, u.id, 3800.00,
  'a0000000-0000-0000-0000-000000000001', 1
FROM public.categorias_receta c, public.unidades_medida u
WHERE c.nombre = 'Postres y dulces' AND u.nombre = 'Unidad'
  AND NOT EXISTS (SELECT 1 FROM recetas WHERE nombre = 'Mousse de Chocolate' AND empresa_id = 1);
-- ============================================================
-- Referencias por nombre con JOIN para resolver IDs.
-- ============================================================

-- 9a. Pan Francés
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Pan Francés' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Harina 000',      1000, 'Gramo',     false, 1),
  ('Sal Fina',          20, 'Gramo',     false, 2),
  ('Levadura Fresca',   40, 'Gramo',     false, 3),
  ('Agua',             600, 'Mililitro', false, 4)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9b. Pan de Molde Integral
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Pan de Molde Integral' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Harina Integral',  400, 'Gramo',     false, 1),
  ('Harina 000',       200, 'Gramo',     false, 2),
  ('Salvado de Trigo',  80, 'Gramo',     false, 3),
  ('Leche en Polvo',    30, 'Gramo',     false, 4),
  ('Manteca',           50, 'Gramo',     false, 5),
  ('Azúcar',            20, 'Gramo',     false, 6),
  ('Sal Fina',          12, 'Gramo',     false, 7),
  ('Levadura Fresca',   30, 'Gramo',     false, 8),
  ('Agua',             420, 'Mililitro', false, 9)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9c. Medialunas de Manteca
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Medialunas de Manteca' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Harina 000',           1000, 'Gramo',     false, 1),
  ('Manteca',              400, 'Gramo',     false, 2),
  ('Azúcar',               120, 'Gramo',     false, 3),
  ('Leche Entera',         300, 'Mililitro', false, 4),
  ('Huevos',                 2, 'Unidad',    false, 5),
  ('Sal Fina',              10, 'Gramo',     false, 6),
  ('Levadura Fresca',       50, 'Gramo',     false, 7),
  ('Esencia de Vainilla',    5, 'Mililitro', false, 8)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9d. Galletitas de Chocolate
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Galletitas de Chocolate' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Harina 000',         300, 'Gramo',     false, 1),
  ('Manteca',            150, 'Gramo',     false, 2),
  ('Azúcar',             150, 'Gramo',     false, 3),
  ('Azúcar Impalpable',   50, 'Gramo',     false, 4),
  ('Huevos',               1, 'Unidad',    false, 5),
  ('Cacao Amargo',        40, 'Gramo',     false, 6),
  ('Polvo de Hornear',     5, 'Gramo',     false, 7),
  ('Esencia de Vainilla',  5, 'Mililitro', false, 8),
  ('Chocolate Cobertura',100, 'Gramo',     true,  9)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9e. Budín de Vainilla
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Budín de Vainilla' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Harina 000',          250, 'Gramo',     false, 1),
  ('Manteca',             150, 'Gramo',     false, 2),
  ('Azúcar',              200, 'Gramo',     false, 3),
  ('Huevos',                3, 'Unidad',    false, 4),
  ('Leche Entera',         80, 'Mililitro', false, 5),
  ('Polvo de Hornear',     10, 'Gramo',     false, 6),
  ('Esencia de Vainilla',  10, 'Mililitro', false, 7),
  ('Ralladura de Limón',    5, 'Gramo',     false, 8),
  ('Pasas de Uva',         60, 'Gramo',     true,  9)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9f. Masa de Pizza Clásica
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Masa de Pizza Clásica' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Harina 000',         1000, 'Gramo',     false, 1),
  ('Agua',               600,  'Mililitro', false, 2),
  ('Aceite de Girasol',   60,  'Mililitro', false, 3),
  ('Sal Fina',            20,  'Gramo',     false, 4),
  ('Azúcar',              10,  'Gramo',     false, 5),
  ('Levadura Fresca',     40,  'Gramo',     false, 6)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- ============================================================
-- 9g. Ensalada César
-- ============================================================
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Ensalada César' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Pechuga de Pollo',  200, 'Gramo',     false, 1),
  ('Lechuga',             1, 'Unidad',    false, 2),
  ('Queso Parmesano',    50, 'Gramo',     false, 3),
  ('Pan Rallado',        30, 'Gramo',     false, 4),
  ('Aceite de Oliva',    60, 'Mililitro', false, 5),
  ('Huevos',              1, 'Unidad',    false, 6),
  ('Limón',              30, 'Gramo',     false, 7),
  ('Ajo',                10, 'Gramo',     false, 8),
  ('Sal Fina',            5, 'Gramo',     false, 9),
  ('Pimienta Negra',      2, 'Gramo',     false, 10)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9h. Milanesa de Pollo con Puré
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Milanesa de Pollo con Puré' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Pechuga de Pollo',  400, 'Gramo',     false, 1),
  ('Huevos',              2, 'Unidad',    false, 2),
  ('Pan Rallado',       150, 'Gramo',     false, 3),
  ('Papa',              500, 'Gramo',     false, 4),
  ('Manteca',            50, 'Gramo',     false, 5),
  ('Leche Entera',      100, 'Mililitro', false, 6),
  ('Sal Fina',           10, 'Gramo',     false, 7),
  ('Pimienta Negra',      3, 'Gramo',     false, 8),
  ('Aceite de Girasol', 500, 'Mililitro', false, 9)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9i. Salsa Bolognesa
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Salsa Bolognesa' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Carne Picada de Res', 500, 'Gramo',     false, 1),
  ('Cebolla',            150, 'Gramo',     false, 2),
  ('Ajo',                 10, 'Gramo',     false, 3),
  ('Zanahoria',          100, 'Gramo',     false, 4),
  ('Puré de Tomate',     400, 'Mililitro', false, 5),
  ('Aceite de Girasol',   30, 'Mililitro', false, 6),
  ('Sal Fina',            10, 'Gramo',     false, 7),
  ('Orégano',              3, 'Gramo',     false, 8),
  ('Laurel',               1, 'Gramo',     false, 9),
  ('Pimienta Negra',       2, 'Gramo',     false, 10)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9j. Flan Casero
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Flan Casero' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Huevos',              6,  'Unidad',    false, 1),
  ('Leche Entera',      1000, 'Mililitro', false, 2),
  ('Azúcar',            200,  'Gramo',     false, 3),
  ('Esencia de Vainilla', 10, 'Mililitro', false, 4)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9k. Empanadas de Carne
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Empanadas de Carne' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Carne Picada de Res',  500, 'Gramo',     false, 1),
  ('Cebolla',             250, 'Gramo',     false, 2),
  ('Huevos',                3, 'Unidad',    false, 3),
  ('Aceitunas Verdes',     50, 'Gramo',     false, 4),
  ('Pasas de Uva',         30, 'Gramo',     true,  5),
  ('Pimentón',              5, 'Gramo',     false, 6),
  ('Comino',                3, 'Gramo',     false, 7),
  ('Sal Fina',              8, 'Gramo',     false, 8),
  ('Pimienta Negra',        2, 'Gramo',     false, 9),
  ('Aceite de Girasol',    30, 'Mililitro', false, 10),
  ('Tapas de Empanada',    12, 'Unidad',    false, 11)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9l. Pastel de Papas
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Pastel de Papas' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Carne Picada de Res',  600, 'Gramo',     false, 1),
  ('Papa',                1000, 'Gramo',     false, 2),
  ('Cebolla',             200, 'Gramo',     false, 3),
  ('Ajo',                  10, 'Gramo',     false, 4),
  ('Morrón Rojo',          80, 'Gramo',     false, 5),
  ('Puré de Tomate',      200, 'Mililitro', false, 6),
  ('Huevos',                2, 'Unidad',    false, 7),
  ('Leche Entera',        100, 'Mililitro', false, 8),
  ('Manteca',              40, 'Gramo',     false, 9),
  ('Aceite de Girasol',    30, 'Mililitro', false, 10),
  ('Laurel',                1, 'Gramo',     false, 11),
  ('Sal Fina',             12, 'Gramo',     false, 12),
  ('Pimienta Negra',        3, 'Gramo',     false, 13),
  ('Comino',                2, 'Gramo',     false, 14)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9m. Risotto de Hongos
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Risotto de Hongos' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Arroz',              400,  'Gramo',     false, 1),
  ('Hongos',             200,  'Gramo',     false, 2),
  ('Cebolla',            100,  'Gramo',     false, 3),
  ('Ajo',                  5,  'Gramo',     false, 4),
  ('Vino Blanco',        150,  'Mililitro', false, 5),
  ('Agua',              1000,  'Mililitro', false, 6),
  ('Queso Parmesano',     60,  'Gramo',     false, 7),
  ('Manteca',             30,  'Gramo',     false, 8),
  ('Aceite de Oliva',     30,  'Mililitro', false, 9),
  ('Sal Fina',            10,  'Gramo',     false, 10),
  ('Pimienta Negra',       2,  'Gramo',     false, 11),
  ('Perejil',              5,  'Gramo',     true,  12)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;

-- 9n. Mousse de Chocolate
INSERT INTO public.receta_ingredientes (receta_id, ingrediente_id, cantidad, unidad_id, es_opcional, orden, empresa_id)
SELECT r.id, i.id, cat.cantidad, u.id, cat.es_opcional, cat.orden, 1
FROM (SELECT id FROM recetas WHERE nombre = 'Mousse de Chocolate' AND empresa_id = 1) r
CROSS JOIN (VALUES
  ('Chocolate Cobertura', 200, 'Gramo',     false, 1),
  ('Huevos',                4, 'Unidad',    false, 2),
  ('Crema de Leche',      200, 'Mililitro', false, 3),
  ('Azúcar',              100, 'Gramo',     false, 4),
  ('Esencia de Vainilla',   5, 'Mililitro', false, 5)
) AS cat (ing_nombre, cantidad, unidad_nombre, es_opcional, orden)
JOIN ingredientes i ON i.nombre = cat.ing_nombre AND i.empresa_id = 1
JOIN unidades_medida u ON u.nombre = cat.unidad_nombre
ON CONFLICT (receta_id, ingrediente_id) DO NOTHING;
-- ============================================================
-- 10. PROVEEDORES Y PRECIOS
-- ============================================================
INSERT INTO public.proveedores (nombre, contacto, telefono, activo, empresa_id)
SELECT v.nombre, v.contacto, v.telefono, true, 1
FROM (VALUES
  ('Distribuidora del Plata SRL', 'Carlos Gómez', '011-4567-8901'),
  ('Harinas del Sur SA',          'María Fernández', '011-4123-4567'),
  ('Lácteos La Serenísima',      'Pedro Martínez', '011-4789-0123'),
  ('Distribuidora de Carnes ABC', 'Lucía Rodríguez', '011-4890-1234'),
  ('Especias y Condimentos Ltd',  'José López', '011-4901-2345')
) AS v (nombre, contacto, telefono)
WHERE NOT EXISTS (SELECT 1 FROM public.proveedores WHERE nombre = v.nombre AND empresa_id = 1);

-- Ingrediente-Proveedor: precios realistas (por unidad base del ingrediente)
INSERT INTO public.ingrediente_proveedor (ingrediente_id, proveedor_id, precio_actual, plazo_entrega_dias, es_preferido, empresa_id)
SELECT i.id, p.id, v.precio, v.plazo, v.preferido, 1
FROM (VALUES
  ('Harina 000',           'Harinas del Sur SA',          1.20,   3,  true),
  ('Harina Integral',      'Harinas del Sur SA',          1.80,   5,  true),
  ('Harina 0000',          'Harinas del Sur SA',          1.50,   3,  false),
  ('Manteca',              'Lácteos La Serenísima',        8.50,   2,  true),
  ('Grasa Vacuna',         'Distribuidora del Plata SRL',  6.00,   7,  true),
  ('Aceite de Girasol',    'Distribuidora del Plata SRL',  2.80,   5,  true),
  ('Azúcar',               'Distribuidora del Plata SRL',  1.10,   3,  true),
  ('Leche Entera',         'Lácteos La Serenísima',        1.50,   2,  true),
  ('Crema de Leche',       'Lácteos La Serenísima',        4.50,   2,  false),
  ('Huevos',               'Distribuidora del Plata SRL',  3.20,   2,  true),
  ('Levadura Fresca',      'Distribuidora del Plata SRL',  2.00,   3,  true),
  ('Sal Fina',             'Especias y Condimentos Ltd',   0.80,  10,  true),
  ('Cacao Amargo',         'Distribuidora del Plata SRL',  5.00,   7,  true),
  ('Chocolate Cobertura',  'Distribuidora del Plata SRL',  12.00,  7,  true),
  ('Pechuga de Pollo',     'Distribuidora de Carnes ABC',  15.00,  2,  true),
  ('Carne Picada de Res',  'Distribuidora de Carnes ABC',  12.00,  2,  true),
  ('Queso Parmesano',      'Lácteos La Serenísima',        18.00,  5,  true),
  ('Aceite de Oliva',      'Distribuidora del Plata SRL',  9.00,   7,  true),
  ('Arroz',                'Distribuidora del Plata SRL',  1.50,   5,  true),
  ('Hongos',               'Distribuidora del Plata SRL',  8.00,   3,  true)
) AS v (ing_nombre, prov_nombre, precio, plazo, preferido)
JOIN public.ingredientes i ON i.nombre = v.ing_nombre AND i.empresa_id = 1
JOIN public.proveedores p ON p.nombre = v.prov_nombre AND p.empresa_id = 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingrediente_proveedor ip
  WHERE ip.ingrediente_id = i.id AND ip.proveedor_id = p.id
);
-- ============================================================
SELECT '✅ Seed completado' AS resultado,
       (SELECT COUNT(*) FROM public.unidades_medida) AS unidades,
       (SELECT COUNT(*) FROM public.conversiones_unidades) AS conversiones,
       (SELECT COUNT(*) FROM public.categorias_ingrediente) AS categorias_ingredientes,
       (SELECT COUNT(*) FROM public.categorias_receta) AS categorias_recetas,
       (SELECT COUNT(*) FROM public.categorias_producto) AS categorias_productos,
       (SELECT COUNT(*) FROM public.ingredientes WHERE empresa_id = 1) AS ingredientes,
       (SELECT COUNT(*) FROM public.recetas WHERE empresa_id = 1) AS recetas,
       (SELECT COUNT(*) FROM public.receta_ingredientes WHERE empresa_id = 1) AS relaciones,
       (SELECT COUNT(*) FROM public.recetas r JOIN public.categorias_receta c ON c.id = r.categoria_id
        WHERE c.nombre IN ('Ensaladas','Carnes y aves','Salsas y aderezos','Postres y dulces','Entradas y aperitivos','Pastas y arroces')) AS recetas_gastronomicas,
       (SELECT COUNT(*) FROM public.proveedores WHERE empresa_id = 1) AS proveedores,
       (SELECT COUNT(*) FROM public.ingrediente_proveedor WHERE empresa_id = 1) AS precios_ingredientes;
