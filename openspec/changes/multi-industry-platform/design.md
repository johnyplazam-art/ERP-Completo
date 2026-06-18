# Diseño Técnico: Plataforma Multi-Industria

## Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                    CAPA PLATAFORMA                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  Auth    │ │ Empresas │ │ Usuarios │ │  Roles  │ │
│  │ (Supabase)│ │          │ │          │ │  Core   │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Planes   │ │Suscrip.  │ │  Industrias          │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────┤
│               CAPA POR INDUSTRIA                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │Panadería │ │Restaurant│ │   POS    │ │ Médico  │ │
│  │ app_id=1 │ │ app_id=N │ │ app_id=M │ │ app_id=X│ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐                           │
│  │Académico │ │   Admin  │                           │
│  └──────────┘ └──────────┘                           │
└─────────────────────────────────────────────────────┘
```

### Separación de responsabilidades

- **Tablas de plataforma**: empresas, empresa_usuarios, user_roles, roles, permissions, role_permissions, applications, industrias, industria_apps, planes, suscripciones, audit_logs
- **Tablas por industria**: Cada industria tiene sus propias tablas de negocio (ingredientes, recetas, pacientes, cursos, etc.) con `empresa_id` para multi-tenant

## Base de Datos — Migraciones

### Migración 001: industrias + industria_apps

```sql
-- ============================================================
-- MIGRACIÓN: Multi-Industria
-- Fecha: 2026-06-17
-- ============================================================

CREATE TABLE IF NOT EXISTS public.industrias (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icon VARCHAR(50) DEFAULT 'pi pi-building',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.industria_apps (
  industria_id INT NOT NULL REFERENCES public.industrias(id) ON DELETE CASCADE,
  application_id INT NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  es_por_defecto BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (industria_id, application_id)
);

ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS industria_principal INT REFERENCES public.industrias(id),
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
```

### Migración 002: Seed industrias

```sql
INSERT INTO public.industrias (slug, nombre, descripcion, icon) VALUES
  ('panaderia', 'Panadería', 'Panadería y pastelería artesanal e industrial', 'pi pi-shop'),
  ('restaurant', 'Restaurante', 'Restaurantes, bares y afines', 'pi pi-building'),
  ('pos', 'Punto de Venta', 'Tiendas y comercios minoristas', 'pi pi-shopping-cart'),
  ('medico', 'Centro Médico', 'Consultorios, clínicas y centros de salud', 'pi pi-heart'),
  ('academico', 'Institución Académica', 'Colegios, institutos y centros de formación', 'pi pi-book'),
  ('administracion', 'Administración', 'Gestión administrativa y contable', 'pi pi-calculator')
ON CONFLICT (slug) DO NOTHING;
```

### Migración 003: Apps nuevas

```sql
-- App core (roles plataforma)
INSERT INTO public.applications (name, slug, description, is_active)
SELECT 'Core', 'core', 'Roles y funciones de plataforma', true
WHERE NOT EXISTS (SELECT 1 FROM public.applications WHERE slug = 'core');

-- Apps por industria
INSERT INTO public.applications (name, slug, description, is_active) 
SELECT * FROM (VALUES
  ('Restaurante', 'restaurant', 'Módulo de gestión de restaurantes', true),
  ('Punto de Venta', 'pos', 'Módulo de punto de venta', true),
  ('Médico', 'medico', 'Módulo de gestión médica', true),
  ('Académico', 'academico', 'Módulo de gestión académica', true)
) AS v(name, slug, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.applications WHERE slug = v.slug);
```

### Migración 004: Roles plataforma (app core)

```sql
DO $$
DECLARE v_core_id INT;
BEGIN
  SELECT id INTO v_core_id FROM public.applications WHERE slug = 'core';
  
  -- Roles
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Super Admin', 'super_admin', 'Acceso total a toda la plataforma', v_core_id, true),
    ('Admin', 'admin', 'Administración de la empresa', v_core_id, true),
    ('Auditor', 'auditor', 'Solo lectura de logs y reportes', v_core_id, true),
    ('Supervisor', 'supervisor', 'Métricas y reportes cross-app', v_core_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;
  
  -- Permisos core
  INSERT INTO public.permissions (action_name, description, category) VALUES
    ('core.empresas.view', 'Ver datos de la empresa', 'core'),
    ('core.empresas.manage', 'Gestionar empresa', 'core'),
    ('core.usuarios.view', 'Ver usuarios', 'core'),
    ('core.usuarios.manage', 'Gestionar usuarios y roles', 'core'),
    ('core.usuarios.invite', 'Invitar usuarios', 'core'),
    ('core.suscripciones.view', 'Ver suscripciones', 'core'),
    ('core.suscripciones.manage', 'Gestionar suscripciones', 'core'),
    ('core.audit.view', 'Ver auditoría', 'core')
  ON CONFLICT (action_name) DO NOTHING;
  
  -- Asignar todos los permisos core a super_admin y admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM public.roles r, public.permissions p
  WHERE r.application_id = v_core_id
    AND r.slug IN ('super_admin', 'admin')
    AND p.action_name LIKE 'core.%'
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );
END $$;
```

### Migración 005: Roles por industria

```sql
DO $$
DECLARE
  v_rest_id INT; v_pos_id INT; v_med_id INT; v_acad_id INT; v_admin_id INT;
BEGIN
  SELECT id INTO v_rest_id FROM public.applications WHERE slug = 'restaurant';
  SELECT id INTO v_pos_id FROM public.applications WHERE slug = 'pos';
  SELECT id INTO v_med_id FROM public.applications WHERE slug = 'medico';
  SELECT id INTO v_acad_id FROM public.applications WHERE slug = 'academico';
  SELECT id INTO v_admin_id FROM public.applications WHERE slug = 'admin';
  
  -- Restaurant roles
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Admin Local', 'admin_local', 'Gestión del restaurante', v_rest_id, true),
    ('Chef', 'chef', 'Gestión de menú y cocina', v_rest_id, true),
    ('Cocinero', 'cocinero', 'Ejecución de órdenes', v_rest_id, true),
    ('Ayudante Cocina', 'ayudante_cocina', 'Asistencia en cocina', v_rest_id, true),
    ('Cajero', 'cajero', 'Cobros y cierre de caja', v_rest_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;
  
  -- POS roles
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Admin Tienda', 'admin_tienda', 'Gestión de tienda', v_pos_id, true),
    ('Vendedor', 'vendedor', 'Ventas y atención', v_pos_id, true),
    ('Cajero', 'cajero_pos', 'Cobros POS', v_pos_id, true),
    ('Gerente Turno', 'gerente_turno', 'Cierres y reportes', v_pos_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;
  
  -- Médico roles
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Médico', 'medico', 'Atención de pacientes', v_med_id, true),
    ('Enfermero', 'enfermero', 'Asistencia médica', v_med_id, true),
    ('Recepcionista', 'recepcionista', 'Turnos y admisión', v_med_id, true),
    ('Administrativo', 'administrativo_med', 'Facturación y seguros', v_med_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;
  
  -- Académico roles
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Profesor', 'profesor', 'Dictado de cursos', v_acad_id, true),
    ('Alumno', 'alumno', 'Inscripción y notas', v_acad_id, true),
    ('Preceptor', 'preceptor', 'Asistencia y comunicaciones', v_acad_id, true),
    ('Coordinador', 'coordinador', 'Planes de estudio', v_acad_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;
  
  -- Admin roles (adicionales)
  INSERT INTO public.roles (name, slug, description, application_id, is_system) VALUES
    ('Contador', 'contador', 'Libros contables y balances', v_admin_id, true),
    ('Administrativo', 'administrativo', 'Documentos y RRHH', v_admin_id, true),
    ('Gestor', 'gestor', 'Cobranzas y pagos', v_admin_id, true)
  ON CONFLICT (slug, application_id) DO NOTHING;
END $$;
```

### Migración 006: industria_apps mapping

```sql
INSERT INTO public.industria_apps (industria_id, application_id, es_por_defecto)
SELECT i.id, a.id, true
FROM public.industrias i, public.applications a
WHERE 
  (i.slug = 'panaderia' AND a.slug IN ('panaderia', 'admin'))
  OR (i.slug = 'restaurant' AND a.slug IN ('restaurant', 'admin'))
  OR (i.slug = 'pos' AND a.slug IN ('pos', 'admin'))
  OR (i.slug = 'medico' AND a.slug IN ('medico', 'admin'))
  OR (i.slug = 'academico' AND a.slug IN ('academico', 'admin'))
  OR (i.slug = 'administracion' AND a.slug IN ('admin'))
ON CONFLICT DO NOTHING;
```

### Migración 007: Actualizar handle_new_user()

La función `handle_new_user()` se modifica para:
1. Recibir `industria` desde `raw_user_meta_data`
2. Si no se especifica, default `panaderia`
3. Crear empresa con `industria_principal`
4. Provisionar apps por defecto
5. Asignar rol `admin` (core) + rol por defecto de industria

### Migración 008: RLS actualizadas

- `empresas`: SELECT para miembros de la empresa, INSERT solo para auth
- `industrias`: SELECT universal (catálogo), solo super_admin escribe
- `industria_apps`: SELECT universal, solo super_admin escribe

## Frontend — Componentes

### Nuevo componente: IndustrySelector.vue

```
Props: modelValue (industria slug seleccionada)
Emits: update:modelValue

Template: Grid de tarjetas con icono + nombre de cada industria activa

Estados:
  - Carga: skeleton cards
  - Vacío: no hay industrias disponibles
  - Error: mensaje de error con retry
```

### Modificaciones

**RegisterView.vue**: Agregar paso de selección de industria entre datos personales y creación.

**AppLayout.vue**: Sidebar dinámico que filtra según apps disponibles + permisos del usuario.

**HomeDashboard.vue**: Mostrar tarjetas de apps según suscripción.

### Integración con suscripciones

El componente `AdminPlanes.vue` ya funciona. Solo verificar que:
- Al crear plan, se pueda seleccionar qué industrias incluye
- `features.apps` contenga los slugs de apps

## Flujo de registro detallado

```
1. POST /signup → auth.signUp({ email, password, options: { data: { nombre, industria } } })
2. Trigger on_auth_user_created → handle_new_user()
3. handle_new_user():
   a. Crear perfil
   b. Obtener industria de raw_user_meta_data->>'industria' (default 'panaderia')
   c. Si industria no existe → error
   d. Crear empresa con industria_principal
   e. Crear empresa_usuarios como dueño
   f. Obtener apps por defecto de industria desde industria_apps
   g. Para cada app por defecto:
      - Asignar rol admin (core) si app = 'core'
      - Asignar rol por defecto de industria
   h. Crear suscripción gratuita
```

## Permisos RLS

### industrias
```sql
CREATE POLICY "industrias_select" ON public.industrias FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "industrias_insert" ON public.industrias FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.slug = 'super_admin'
        AND ur.application_id = (SELECT id FROM public.applications WHERE slug = 'core'))
  );
```

### empresas (actualizar policy existente)
```sql
CREATE POLICY "empresas_select" ON public.empresas FOR SELECT TO authenticated
  USING (
    id IN (SELECT empresa_id FROM public.empresa_usuarios WHERE usuario_id = auth.uid() AND activo = true)
  );
```

## Consideraciones de seguridad

1. **Aislamiento**: Un usuario de empresa panadería NO debe ver datos de empresa médico aunque sea admin
2. **Role escalation**: Solo `super_admin` puede asignar `super_admin` (protegido en RLS)
3. **Suscripciones**: Si expira, se desactivan miembros y empresa (ya implementado en `expiar_suscripciones()`)
4. **Auditoría**: Todas las operaciones CRUD importantes quedan registradas (ya implementado)

## Tests

### Tests de unidad nuevos
- `industrias`: CRUD factory tests
- `industria_apps`: mapping tests
- `handle_new_user`: multi-industria registration tests

### Tests de integración
- Registro con industria → verificar empresa creada con industria correcta
- Migración de datos existentes → verificar backward compatibility
- RLS con multi-app → verificar aislamiento

## Plan de implementación

| Fase | Migraciones | Frontend | Dependencias |
|------|------------|----------|--------------|
| 1: Schema | 001-003 (industrias, apps, seed) | — | — |
| 2: Roles | 004-006 (roles, permisos, mapeo) | — | Fase 1 |
| 3: Registro | 007 (handle_new_user) | IndustrySelector, RegisterView | Fase 2 |
| 4: RLS | 008 (policies) | — | Fase 1 |
| 5: UI dinámica | — | AppLayout, HomeDashboard | Fase 3 |
| 6: Tests | — | Tests unit + integración | Fase 1-5 |
