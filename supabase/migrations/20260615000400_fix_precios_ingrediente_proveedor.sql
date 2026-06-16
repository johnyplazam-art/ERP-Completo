-- ============================================================
-- MIGRATION: Fix precios en ingrediente_proveedor
-- Fecha: 2026-06-15
--
-- El seed data tenía precios pensados como "por kilogramo/litro"
-- pero la unidad base de la mayoría de ingredientes es Gramo o
-- Mililitro. Esto hacía que calcular_costo_receta() diera
-- valores 1000x más altos de lo real.
--
-- Ej: Harina 000, precio seed $1.20 (pensando "por kg"),
--     pero base unit = Gramo → $1.20/g en vez de $0.0012/g.
--     Receta usa 1000g → 1000 × $1.20 = $1,200 en vez de $1.20.
-- ============================================================

-- Corregir precios: dividir por 1000 si la unidad base es Gramo o Mililitro
UPDATE public.ingrediente_proveedor ip
SET precio_actual = ROUND(precio_actual / 1000, 6)
FROM public.ingredientes i
JOIN public.unidades_medida u ON u.id = i.unidad_base_id
WHERE i.id = ip.ingrediente_id
  AND u.nombre IN ('Gramo', 'Mililitro')
  AND ip.precio_actual > 0;

-- Recalcular costos de todas las recetas existentes
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.recetas WHERE activa = true
  LOOP
    PERFORM public.calcular_costo_receta(r.id);
  END LOOP;
END $$;
