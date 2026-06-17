-- ============================================================
-- DIAGNÓSTICO: ¿por qué los costos quedan en 0?
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase, UNA POR UNA.
-- Copiar y pegar el resultado de cada una.

-- 1. ¿Qué función calcular_costo_receta existe actualmente?
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'calcular_costo_receta';

-- 2. ¿Los precios se dividieron correctamente?
SELECT i.nombre AS ingrediente,
       u.nombre AS unidad_base,
       ip.precio_actual
FROM ingrediente_proveedor ip
JOIN ingredientes i ON i.id = ip.ingrediente_id
JOIN unidades_medida u ON u.id = i.unidad_base_id
WHERE ip.empresa_id = 1
ORDER BY i.nombre;

-- 3. ¿Cuánto da calcular_costo_receta para cada receta?
SELECT r.id, r.nombre,
       public.calcular_costo_receta(r.id) AS costo_calculado,
       r.costo_estimado AS costo_actual
FROM recetas r
WHERE r.empresa_id = 1
ORDER BY r.nombre;

-- 4. ¿Las recetas tienen ingredientes con precio?
SELECT r.nombre AS receta,
       i.nombre AS ingrediente,
       ri.cantidad,
       usimbolo.simbolo AS unidad_receta,
       ubase.nombre AS unidad_base_ingrediente,
       COALESCE(ip_pref.precio_actual, ip_any.precio_actual, 0) AS precio_unitario
FROM recetas r
JOIN receta_ingredientes ri ON ri.receta_id = r.id
JOIN ingredientes i ON i.id = ri.ingrediente_id
JOIN unidades_medida usimbolo ON usimbolo.id = ri.unidad_id
JOIN unidades_medida ubase ON ubase.id = i.unidad_base_id
LEFT JOIN ingrediente_proveedor ip_pref
    ON ip_pref.ingrediente_id = ri.ingrediente_id
   AND ip_pref.es_preferido = true
LEFT JOIN ingrediente_proveedor ip_any
    ON ip_any.ingrediente_id = ri.ingrediente_id
WHERE r.empresa_id = 1
ORDER BY r.nombre, ri.orden;
