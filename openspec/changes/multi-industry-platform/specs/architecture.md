# Specs: Plataforma Multi-Industria

## Functional Requirements

### FR1: Multi-industria
El sistema debe soportar las siguientes industrias: panadería, restaurante, POS, médico, académico, administración. Cada industria se identifica por un slug único y tiene nombre, descripción, icono.

### FR2: Roles por industria
Cada industria define sus propios roles y permisos en la tabla `roles` con `application_id` correspondiente. Un usuario puede tener roles en múltiples industrias dentro de la misma empresa.

### FR3: Roles plataforma (cross-industria)
Existe un conjunto de roles de plataforma que funcionan para todas las industrias:
- `super_admin`: acceso cross-tenant (solo dueños de plataforma)
- `admin`: gestión completa de su empresa (usuarios, roles, apps)
- `auditor`: solo lectura de logs y reportes
- `supervisor`: métricas y reportes cross-app

Estos roles viven en la app `core`.

### FR4: Registro con selección de industria
El flujo de registro debe:
1. Pedir email, password, nombre
2. Preguntar industria principal (selector visual con iconos)
3. Crear empresa con `industria_principal`
4. Provisionar apps por defecto de esa industria
5. Asignar rol `admin` (plataforma) + rol por defecto de industria
6. Crear suscripción gratuita

### FR5: Navegación dinámica
El sidebar debe mostrar solo las apps disponibles según:
- Suscripción activa de la empresa (`get_apps_por_suscripcion`)
- Roles del usuario en cada app
- Cada app tiene su propio menú lateral

### FR6: Suscripciones controlan acceso
El sistema de suscripciones existente determina qué apps están disponibles para una empresa. Plan gratuito = 1 industria, planes pagos = más industrias.

## Non-Functional Requirements

### NFR1: RLS escalable
Las RLS policies deben verificar industria + app + permiso sin causar recursión ni degradación.

### NFR2: Aislamiento de datos
Cada industria maneja sus propios modelos de datos en tablas separadas. No hay tablas compartidas entre industrias (excepto las de plataforma: empresas, usuarios, roles, suscripciones).

### NFR3: Migración backward-compatible
Empresas existentes se migran con `industria_principal = panaderia`. Usuarios existentes mantienen sus roles. Ninguna migración debe romper datos existentes.

## Data Model

### industrias
```sql
CREATE TABLE public.industrias (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icon VARCHAR(50) DEFAULT 'pi pi-building',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### industria_apps
```sql
CREATE TABLE public.industria_apps (
  industria_id INT NOT NULL REFERENCES public.industrias(id) ON DELETE CASCADE,
  application_id INT NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  es_por_defecto BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (industria_id, application_id)
);
```

### empresas (alter)
```sql
ALTER TABLE public.empresas 
  ADD COLUMN industria_principal INT REFERENCES public.industrias(id),
  ADD COLUMN config JSONB DEFAULT '{}';
```

### Seed: industrias
```sql
INSERT INTO public.industrias (slug, nombre, descripcion, icon) VALUES
  ('panaderia', 'Panadería', 'Panadería y pastelería artesanal e industrial', 'pi pi-building'),
  ('restaurant', 'Restaurante', 'Restaurantes, bares y afines', 'pi pi-building'),
  ('pos', 'Punto de Venta', 'Tiendas y comercios minoristas', 'pi pi-shopping-cart'),
  ('medico', 'Centro Médico', 'Consultorios, clínicas y centros de salud', 'pi pi-heart'),
  ('academico', 'Institución Académica', 'Colegios, institutos y centros de formación', 'pi pi-book'),
  ('administracion', 'Administración', 'Gestión administrativa y contable', 'pi pi-calculator');
```

### Seed: industria_apps
```sql
-- Panadería → panaderia + admin
INSERT INTO public.industria_apps (industria_id, application_id, es_por_defecto)
SELECT i.id, a.id, true
FROM public.industrias i, public.applications a
WHERE i.slug = 'panaderia' AND a.slug IN ('panaderia', 'admin');
-- Restaurant → restaurant (nueva) + admin
-- (similar para cada industria)
```

### Roles plataforma (app core)
Se crea app `core` si no existe. Roles:
- `super_admin`: super_admin
- `admin`: admin
- `auditor`: auditor
- `supervisor`: supervisor

### Apps nuevas por industria
Cada industria necesita una app en `applications`:
- `restaurant` → Módulo de restaurante
- `pos` → Punto de venta
- `medico` → Gestión médica
- `academico` → Gestión académica

## Acceptance Scenarios

### AS1: Registro multi-industria
**Dado** un usuario nuevo sin cuenta
**Cuando** se registra y selecciona "Restaurante"
**Entonces** se crea empresa con industria_principal = restaurant
**Y** se provisionan apps: restaurant, admin
**Y** se asignan roles: admin (plataforma), admin_local (restaurant)
**Y** se crea suscripción gratuita

### AS2: Migración existente
**Dado** una empresa existente con datos de panadería
**Cuando** se ejecuta la migración
**Entonces** industria_principal = panaderia
**Y** todos los usuarios mantienen sus roles actuales
**Y** las apps existentes siguen funcionando

### AS3: Aislamiento de roles
**Dado** un usuario admin de una empresa de panadería
**Cuando** intenta asignar un rol de médico a otro usuario
**Entonces** el sistema rechaza la operación
**Y** solo puede asignar roles de las apps que su empresa tiene habilitadas

### AS4: Suscripción vencida
**Dado** una empresa con suscripción expirada
**Cuando** un usuario intenta acceder
**Entonces** no ve ninguna app en el dashboard
**Y** ve un mensaje de suscripción vencida

## Schema Changes Summary

| Migration | Cambio |
|-----------|--------|
| 001 | CREATE industrias + industria_apps |
| 002 | ALTER empresas (industria_principal, config) |
| 003 | Seed industrias, industria_apps |
| 004 | CREATE app core + roles platforma |
| 005 | CREATE apps: restaurant, pos, medico, academico |
| 006 | Roles y permisos para cada nueva app |
| 007 | Actualizar handle_new_user() |
| 008 | Actualizar RLS policies |
