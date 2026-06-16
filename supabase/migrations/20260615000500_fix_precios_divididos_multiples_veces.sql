-- ============================================================
-- MIGRATION: Fix precios que quedaron en 0 por división múltiple
-- Fecha: 2026-06-15
--
-- Si la migración 004 se ejecutó más de una vez, los precios
-- se dividieron por 1000 múltiples veces → quedaron en 0.
--
-- Este script restaura los precios desde los valores del seed
-- y aplica la división por 1000 UNA SOLA VEZ para ingredientes
-- cuya unidad base es Gramo o Mililitro.
-- ============================================================

-- 1. Restaurar precios desde valores conocidos del seed
--    y aplicar la división por 1000 correcta de una vez.
UPDATE public.ingrediente_proveedor ip
SET precio_actual = v.precio_correcto
FROM (
  SELECT i.id AS ingrediente_id,
         CASE
           WHEN u.nombre IN ('Gramo', 'Mililitro') THEN ROUND(v.precio_seed / 1000, 6)
           ELSE v.precio_seed
         END AS precio_correcto
  FROM (VALUES
    ('Harina 000',          1.20),
    ('Harina Integral',     1.80),
    ('Harina 0000',         1.50),
    ('Manteca',             8.50),
    ('Grasa Vacuna',        6.00),
    ('Aceite de Girasol',   2.80),
    ('Azúcar',              1.10),
    ('Leche Entera',        1.50),
    ('Crema de Leche',      4.50),
    ('Huevos',              3.20),
    ('Levadura Fresca',     2.00),
    ('Sal Fina',            0.80),
    ('Cacao Amargo',        5.00),
    ('Chocolate Cobertura', 12.00),
    ('Pechuga de Pollo',    15.00),
    ('Carne Picada de Res', 12.00),
    ('Queso Parmesano',     18.00),
    ('Aceite de Oliva',     9.00),
    ('Arroz',               1.50),
    ('Hongos',              8.00)
  ) AS v (ing_nombre, precio_seed)
  JOIN public.ingredientes i ON i.nombre = v.ing_nombre AND i.empresa_id = 1
  JOIN public.unidades_medida u ON u.id = i.unidad_base_id
) v
WHERE ip.ingrediente_id = v.ingrediente_id
  AND ip.precio_actual = 0;  -- solo afectar los que quedaron en 0

-- 2. Recalcular todas las recetas
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.recetas WHERE activa = true
  LOOP
    PERFORM public.calcular_costo_receta(r.id);
  END LOOP;
END $$;
