# Spec — sistema-roles-odoo

> SDD Delta Specs
> Change: Unificación del sistema de roles Odoo-like + Multi-idioma

## 1. Functional Requirements

### 1.1 Role-Permission Matrix

| Rol | Slug | Dashboard | Ingredientes | Recetas | Órdenes | Inventario | Mermas | Proveedores | Invitar usuarios | Gestionar roles |
|---|---|---|---|---|---|---|---|---|---|---|
| Administrador | `admin` | view | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | ✅ | ✅ |
| Panificador | `panificador` | view | read | CRUD | CRUD | read | create | read | ✅ | ❌ |
| Ayudante Panif. | `ayudante_panificador` | view | read | read | read, update estado | read | read | read | ❌ | ❌ |
| Inventario | `inventario` | view | CRUD | read | read | CRUD | CRUD | CRUD | ❌ | ❌ |
| Producción | `produccion` | view | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | ❌ | ❌ |
| Ventas | `ventas` | view | read | read | read | read, create (egreso) | read | read | ❌ | ❌ |
| Usuario | `usuario` | view | read | read | read | read | read | read | ❌ | ❌ |

### 1.2 Permission Definitions

Each permission maps to an `action_name` in the `permissions` table:

| Action | Category | Description | Roles with access |
|---|---|---|---|
| `dashboard.view` | dashboard | Ver dashboard | all |
| `ingredientes.read` | ingredientes | Ver ingredientes | all |
| `ingredientes.create` | ingredientes | Crear ingredientes | admin, produccion, inventario |
| `ingredientes.update` | ingredientes | Editar ingredientes | admin, produccion, inventario |
| `ingredientes.delete` | ingredientes | Eliminar ingredientes | admin, produccion, inventario |
| `ingredientes.stock` | ingredientes | Ver stock | all |
| `recetas.read` | recetas | Ver recetas | all |
| `recetas.create` | recetas | Crear recetas | admin, produccion, panificador |
| `recetas.update` | recetas | Editar recetas | admin, produccion, panificador |
| `recetas.delete` | recetas | Eliminar recetas | admin, produccion |
| `productos.read` | productos | Ver productos | all |
| `productos.create` | productos | Crear productos | admin, produccion, panificador |
| `productos.update` | productos | Editar productos | admin, produccion, panificador |
| `productos.delete` | productos | Eliminar productos | admin, produccion |
| `ordenes.read` | ordenes | Ver órdenes | all |
| `ordenes.create` | ordenes | Crear órdenes | admin, produccion, panificador |
| `ordenes.update` | ordenes | Editar órdenes | admin, produccion, panificador |
| `ordenes.cancel` | ordenes | Cancelar órdenes | admin, produccion |
| `inventario.read` | inventario | Ver movimientos | all |
| `inventario.create` | inventario | Registrar movimientos | admin, produccion, inventario, ventas (egreso) |
| `mermas.read` | mermas | Ver mermas | all |
| `mermas.create` | mermas | Registrar mermas | admin, produccion, inventario |
| `proveedores.read` | proveedores | Ver proveedores | all |
| `proveedores.create` | proveedores | Crear proveedores | admin, produccion, inventario |
| `proveedores.update` | proveedores | Editar proveedores | admin, produccion, inventario |
| `proveedores.delete` | proveedores | Eliminar proveedores | admin, produccion |
| `usuarios.manage` | admin | Gestionar usuarios y roles | admin |
| `usuarios.invite` | admin | Invitar nuevos usuarios | admin, panificador, produccion |
| `roles.manage` | admin | Gestionar roles y permisos | admin |
| `audit.view` | admin | Ver registros de auditoría | admin |

### 1.3 Multi-Idioma Requirements

- The application SHALL support Spanish (`es`) and English (`en`).
- Default locale SHALL be `es`.
- Fallback locale SHALL be `es` (if a key is missing in `en`, show Spanish).
- The user SHALL be able to switch language via a selector in the AppLayout header.
- The language preference SHALL be persisted in `perfiles.idioma` column.
- On login, the app SHALL set the locale from the user's saved preference.
- Each module SHALL define its own translation keys under its namespace.
- All user-facing strings in templates MUST use `$t()` or the `t()` composable.
- System names (role slugs, permission actions) SHALL NOT be translated, only their display labels.

## 2. Data Requirements

### 2.1 Schema Changes

#### 2.1.1 `user_roles` — Add `empresa_id`

```sql
ALTER TABLE public.user_roles ADD COLUMN empresa_id INT REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Drop old unique, add new one scoped to empresa
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_id_application_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT uq_user_empresa_app UNIQUE (user_id, empresa_id, application_id);

-- NOT NULL after migration
ALTER TABLE public.user_roles ALTER COLUMN empresa_id SET NOT NULL;
```

#### 2.1.2 `empresa_usuarios` — Remove `rol`

```sql
ALTER TABLE public.empresa_usuarios DROP COLUMN rol;
-- Keep: empresa_id, usuario_id, activo, created_at, updated_at
```

#### 2.1.3 `perfiles` — Add `idioma`

```sql
ALTER TABLE public.perfiles ADD COLUMN idioma TEXT NOT NULL DEFAULT 'es'
  CHECK (idioma IN ('es', 'en'));
```

#### 2.1.4 New Roles (seed data)

```sql
INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Panificador', 'panificador', 'Gestiona recetas y producción', id, true
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'panificador');

INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Ayudante de Panificador', 'ayudante_panificador', 'Asiste en producción', id, true
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'ayudante_panificador');

INSERT INTO public.roles (name, slug, description, application_id, is_system)
SELECT 'Inventario', 'inventario', 'Gestiona ingredientes y stock', id, true
FROM public.applications WHERE slug = 'panaderia'
AND NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'inventario');
```

#### 2.1.5 New Permission + Role Mappings

```sql
INSERT INTO public.permissions (action_name, description, category)
VALUES ('usuarios.invite', 'Invitar nuevos usuarios a la aplicación', 'admin')
ON CONFLICT (action_name) DO NOTHING;

-- Grant usuarios.invite to admin, panificador, produccion
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug IN ('admin', 'panificador', 'produccion')
  AND p.action_name = 'usuarios.invite'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Grant permissions for panificador, ayudante_panificador, inventario
-- (see role-permission matrix in section 1.2)
```

### 2.2 Data Migration

```sql
-- 1. Backfill empresa_id in user_roles for existing rows
--    (all existing user_roles belong to empresa_id = 1)
UPDATE public.user_roles SET empresa_id = 1 WHERE empresa_id IS NULL;

-- 2. Migrate existing empresa_usuarios.rol values to user_roles
--    For each active empresa_usuarios record, ensure there's a user_roles entry
INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
SELECT eu.usuario_id, eu.empresa_id, r.id, a.id
FROM public.empresa_usuarios eu
JOIN public.roles r ON r.slug = eu.rol
  AND r.application_id = (SELECT id FROM public.applications WHERE slug = 'panaderia')
CROSS JOIN public.applications a
WHERE a.slug = 'panaderia'
  AND eu.activo = true
ON CONFLICT (user_id, empresa_id, application_id) DO NOTHING;
```

### 2.3 Updated Functions

#### `has_permission()` — empresa-scoped

```sql
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_action_name TEXT,
  p_app_slug TEXT DEFAULT 'panaderia',
  p_empresa_id INT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.applications a ON a.id = ur.application_id
    WHERE ur.user_id = p_user_id
      AND p.action_name = p_action_name
      AND a.slug = p_app_slug
      AND rp.is_active = TRUE
      AND (p_empresa_id IS NULL OR ur.empresa_id = p_empresa_id)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

#### `get_user_permissions()` — empresa-scoped

```sql
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_user_id UUID,
  p_app_slug TEXT DEFAULT 'panaderia',
  p_empresa_id INT DEFAULT NULL
)
RETURNS TABLE(action_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.action_name::TEXT
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  JOIN public.applications a ON a.id = ur.application_id
  WHERE ur.user_id = p_user_id
    AND a.slug = p_app_slug
    AND rp.is_active = TRUE
    AND (p_empresa_id IS NULL OR ur.empresa_id = p_empresa_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

#### `handle_new_user()` — creates user_roles entry

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id INT;
  v_invitation_code TEXT;
  v_empresa_slug TEXT;
  v_app_id INT;
  v_admin_role_id INT;
BEGIN
  -- Insertar perfil básico
  INSERT INTO public.perfiles (id, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1))
  );

  -- Verificar si tiene código de invitación
  v_invitation_code := NEW.raw_user_meta_data->>'invitacion';

  IF v_invitation_code IS NOT NULL THEN
    SELECT id INTO v_empresa_id FROM public.empresas WHERE slug = v_invitation_code AND activa = true;

    IF v_empresa_id IS NOT NULL THEN
      -- Add to empresa as member
      INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo)
      VALUES (v_empresa_id, NEW.id, true);

      -- Assign default role (usuario) in panadería app
      SELECT id INTO v_app_id FROM public.applications WHERE slug = 'panaderia';
      SELECT id INTO v_admin_role_id FROM public.roles WHERE slug = 'usuario' AND application_id = v_app_id;
      INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
      VALUES (NEW.id, v_empresa_id, v_admin_role_id, v_app_id);

      RETURN NEW;
    END IF;
  END IF;

  -- Sin invitación: crear nueva empresa
  v_empresa_slug := 'emp-' || substr(md5(NEW.id::text || extract(epoch from now())::text), 1, 8);

  INSERT INTO public.empresas (nombre, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'empresa', 'Mi Empresa'),
    v_empresa_slug
  )
  RETURNING id INTO v_empresa_id;

  -- Add as admin member
  INSERT INTO public.empresa_usuarios (empresa_id, usuario_id, activo)
  VALUES (v_empresa_id, NEW.id, true);

  -- Assign admin role in panadería app
  SELECT id INTO v_app_id FROM public.applications WHERE slug = 'panaderia';
  SELECT id INTO v_admin_role_id FROM public.roles WHERE slug = 'admin' AND application_id = v_app_id;
  INSERT INTO public.user_roles (user_id, empresa_id, role_id, application_id)
  VALUES (NEW.id, v_empresa_id, v_admin_role_id, v_app_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.4 RLS Policy Updates

#### Write policies use `has_permission()` scoped to empresa

```sql
-- Example pattern for business tables:
DROP POLICY IF EXISTS "empresa_insert" ON public.ingredientes;
CREATE POLICY "empresa_insert" ON public.ingredientes FOR INSERT TO authenticated
  WITH CHECK (
    public.usuario_en_empresa(empresa_id, NULL)
    AND public.has_permission(auth.uid(), 'ingredientes.create', 'panaderia', empresa_id)
  );

-- Similar for UPDATE (check ingredientes.update permission)
-- Similar for DELETE (check ingredientes.delete permission)
```

## 3. UI/UX Requirements

### 3.1 Multi-Idioma Selector

- A language selector SHALL be added to the AppLayout header area (top bar).
- It SHALL display as a button/icon showing the current language flag/code.
- On click, it SHALL show a dropdown with `Español` and `English` options.
- On selection, it SHALL:
  1. Set the vue-i18n locale immediately.
  2. Call an API to update `perfiles.idioma` for the current user.

### 3.2 Permission-Aware UI

- The `Invitar usuario` button in `UsersManagement.vue` SHALL only show if the current user has `usuarios.invite` permission.
- The role selector in the users table SHALL only show roles that the current user's role is allowed to assign.
  - Admin can assign any role.
  - Panificador can assign: ayudante_panificador, usuario.
  - Produccion can assign: usuario.
- Navigation items in the sidebar SHALL be filtered by permissions (e.g., show "Usuarios" only if user has `usuarios.manage` or `usuarios.invite`).

### 3.3 Translation File Structure

```
src/i18n/
  index.js              ← configures vue-i18n with dynamic locale loading
  es.json               ← Spanish translations (all modules)
  en.json               ← English translations (all modules)
```

Key namespacing convention:
```json
{
  "nav": {
    "home": "Inicio",
    "panaderia": "Panadería",
    "inventario": "Inventario",
    "recetas": "Recetas",
    "produccion": "Producción",
    "usuarios": "Usuarios"
  },
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "create": "Crear",
    "search": "Buscar",
    "loading": "Cargando...",
    "noResults": "Sin resultados"
  },
  "roles": {
    "admin": "Administrador",
    "panificador": "Panificador",
    "ayudante_panificador": "Ayudante de Panificador",
    "inventario": "Inventario",
    "produccion": "Producción",
    "ventas": "Ventas",
    "usuario": "Usuario"
  },
  "users": {
    "title": "Usuarios",
    "invite": "Invitar usuario",
    "copied": "Enlace copiado",
    "activate": "Activar",
    "deactivate": "Desactivar",
    "active": "Activo",
    "inactive": "Inactivo"
  },
  "language": {
    "es": "Español",
    "en": "English",
    "select": "Idioma"
  }
}
```

## 4. Scenarios

### 4.1 SC-001: Login as Admin
**Given** a user with admin role in empresa "Panadería La Central"
**When** the user logs in
**Then** the dashboard loads
**And** the user sees all navigation items
**And** the user sees the "Invitar usuario" button
**And** the user can change any user's role to any available role

### 4.2 SC-002: Login as Panificador
**Given** a user with panificador role in empresa "Panadería La Central"
**When** the user logs in
**Then** the dashboard loads
**And** the user sees navigation: Dashboard, Recetas, Órdenes, Productos
**And** the user sees the "Invitar usuario" button
**And** the user CANNOT see "Usuarios" in navigation (no `usuarios.manage`)
**And** the user CAN create and edit recetas
**And** the user CANNOT delete recetas

### 4.3 SC-003: Login as Ayudante de Panificador
**Given** a user with ayudante_panificador role
**When** the user logs in
**Then** the user sees only read options for recetas and órdenes
**And** the user CAN update the estado of an orden (mark as completed)
**And** the user does NOT see "Invitar usuario"
**And** the user does NOT see "Usuarios" in navigation

### 4.4 SC-004: Switch Language
**Given** a logged-in user
**When** the user clicks the language selector and selects "English"
**Then** all UI text changes to English immediately
**And** the preference is saved to the user's profile
**When** the user logs out and logs in again
**Then** the UI loads in English

### 4.5 SC-005: Invite User (Panificador)
**Given** a logged-in user with panificador role
**When** the user clicks "Invitar usuario"
**Then** a link is copied to clipboard
**And** when a new user signs up with that link
**Then** the new user joins the empresa with `usuario` role
**And** the new user has `ayudante_panificador` role in Panadería app

### 4.6 SC-006: Switch Empresa
**Given** a user belonging to two empresas (Empresa A as admin, Empresa B as usuario)
**When** the user switches from Empresa A to Empresa B in the sidebar selector
**Then** the role and permissions update to match Empresa B
**And** the user sees only the navigation items permitted by the usuario role
**And** the user does NOT see "Invitar usuario" in Empresa B

### 4.7 SC-007: Data Isolation
**Given** two empresas (A and B) with their own ingredients
**When** a user from Empresa A queries ingredients
**Then** only ingredients belonging to Empresa A are returned
**And** the user cannot see ingredients from Empresa B even if they belong to both empresas
