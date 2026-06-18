-- Migration: multi_industria_registro
-- Description: Update handle_new_user to support multi-industry registration flow
-- Date: 2026-06-18

-- Ensure the function exists or recreate it to update the logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_industria_slug TEXT;
    v_industria_id UUID;
    v_empresa_id UUID;
    v_app_id UUID;
    v_rol_id UUID;
    v_user_id UUID := new.id;
BEGIN
    -- 1. Obtener la industria desde los metadatos del usuario
    -- Default a 'panaderia' si no se proporciona o es inválida
    v_industria_slug := coalesce(new.raw_user_meta_data->>'industria', 'panaderia');

    SELECT id INTO v_industria_id FROM industrias WHERE slug = v_industria_slug;

    -- Si la industria no existe, forzamos panaderia
    IF v_industria_id IS NULL THEN
        SELECT id INTO v_industria_id FROM industrias WHERE slug = 'panaderia';
        v_industria_slug := 'panaderia';
    END IF;

    -- 2. Crear la empresa asociada a esta industria
    INSERT INTO empresas (nombre, industria_principal, config)
    VALUES (
        split_part(new.raw_user_meta_data->>'empresa_nombre', ' ', 1) || ' ' || split_part(new.raw_user_meta_data->>'empresa_nombre', ' ', 2),
        v_industria_id,
        jsonb_build_object('created_by', v_user_id, 'setup_complete', true)
    )
    RETURNING id INTO v_empresa_id;

    -- 3. Crear la relación empresa_usuarios (el usuario es el dueño)
    INSERT INTO empresa_usuarios (empresa_id, usuario_id, es_dueno, rol_id)
    VALUES (
        v_empresa_id,
        v_user_id,
        true,
        (SELECT id FROM roles WHERE slug = 'admin' AND app_id = (SELECT id FROM applications WHERE slug = 'core'))
    );

    -- 4. Asignar roles automáticos por industria en sus respectivas apps
    -- Buscamos las apps que pertenecen a la industria elegida
    FOR v_app_id IN 
        SELECT id FROM industria_apps WHERE industria_id = v_industria_id
    LOOP
        -- Intentamos asignar el rol por defecto de esa app para la industria
        -- La lógica de nombres de roles debe coincidir con la migración de roles (T2.2)
        -- Ejemplo: 'admin_local' para restaurant, 'admin_tienda' para pos, etc.
        
        -- Nota: Para simplificar en esta migración, buscaremos un rol que tenga el slug de la app
        -- pero que sea el rol de 'admin' para esa app específica.
        -- En una implementación real, esto vendría de una tabla de configuración.
        
        -- Intentamos un match por patrón de slug si existe un rol predefinido
        -- Por ahora, usaremos una lógica de mapeo manual basada en la migración anterior
        
        IF v_industria_slug = 'panaderia' THEN
             -- Panadería ya tiene su rol admin configurado por defecto
             NULL; 
        ELSIF v_industria_slug = 'restaurant' AND v_app_id = (SELECT id FROM applications WHERE slug = 'restaurant') THEN
             -- Asignar admin_local
             INSERT INTO empresa_usuarios (empresa_id, usuario_id, es_dueno, rol_id)
             VALUES (v_empresa_id, v_user_id, false, (SELECT id FROM roles WHERE slug = 'admin_local' AND app_id = v_app_id))
             ON CONFLICT DO NOTHING;
        ELSIF v_industria_slug = 'pos' AND v_app_id = (SELECT id FROM applications WHERE slug = 'pos') THEN
             INSERT INTO empresa_usuarios (empresa_id, usuario_id, es_dueno, rol_id)
             VALUES (v_empresa_id, v_user_id, false, (SELECT id FROM roles WHERE slug = 'admin_tienda' AND app_id = v_app_id))
             ON CONFLICT DO NOTHING;
        ELSIF v_industria_slug = 'medico' AND v_app_id = (SELECT id FROM applications WHERE slug = 'medico') THEN
             INSERT INTO empresa_usuarios (empresa_id, usuario_id, es_dueno, rol_id)
             VALUES (v_empresa_id, v_user_id, false, (SELECT id FROM roles WHERE slug = 'medico' AND app_id = v_app_id))
             ON CONFLICT DO NOTHING;
        ELSIF v_industria_slug = 'academico' AND v_app_id = (SELECT id FROM applications WHERE slug = 'academico') THEN
             INSERT INTO empresa_usuarios (empresa_id, usuario_id, es_dueno, rol_id)
             VALUES (v_empresa_id, v_user_id, false, (SELECT id FROM roles WHERE slug = 'profesor' AND app_id = v_app_id))
             ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- 5. Crear suscripción inicial (gratuita)
    -- Asumimos que existe un plan 'gratis' o similar en la tabla planes
    INSERT INTO suscripciones (empresa_id, plan_id, estado, fecha_inicio)
    SELECT v_empresa_id, id, 'activa', now()
    FROM planes WHERE slug = 'gratis'
    LIMIT 1;

    RETURN NEW;
END;
$$;

-- Re-trigger the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
