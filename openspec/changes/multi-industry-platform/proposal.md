# Propuesta: Plataforma Multi-Industria

## Intent

Convertir el erp-completo de un ERP específico de panadería a una **plataforma multi-tenant multi-industria** tipo Odoo, donde una misma instalación soporte múltiples rubros con sus propios módulos, roles y permisos.

## Industrias objetivo

| Industria | Slug | Apps potenciales |
|-----------|------|-----------------|
| Panadería | `panaderia` | producción, recetas, inventario, POS |
| Restaurante | `restaurant` | menú, comandas, cocina, POS, inventario |
| POS | `pos` | ventas, caja, clientes, productos |
| Médico | `medico` | pacientes, turnos, historias clínicas |
| Académico | `academico` | cursos, alumnos, horarios, calificaciones |
| Administración | `administracion` | contabilidad, RRHH, documentos |

## Arquitectura

### Dos niveles de roles

```
NIVEL PLATAFORMA (app 'core' / cross-industria)
  super_admin    → todo el sistema, multi-empresa
  admin          → administra su empresa (usuarios, roles, suscripciones)
  auditor        → logs, reportes de toda la empresa
  supervisor     → métricas y reports cross-app

NIVEL POR INDUSTRIA (app específica)
  PANADERÍA / RESTAURANT
    admin_local, panificador/chef, ayudante, inventario, cajero
  
  POS
    cajero, vendedor, gerente_turno, admin_tienda
  
  MÉDICO
    medico, enfermero, recepcionista, administrativo
  
  ACADÉMICO
    profesor, alumno, preceptor, coordinador

  ADMIN/CONTABILIDAD
    contador, administrativo, gestor
```

### Modelo de datos

```sql
-- Nueva tabla: industrias
CREATE TABLE public.industrias (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,        -- 'panaderia', 'restaurant', 'pos', 'medico', 'academico', 'admin'
  nombre TEXT NOT NULL,              -- 'Panadería', 'Restaurante', etc.
  descripcion TEXT,
  icon VARCHAR(50),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Modificar empresas
ALTER TABLE public.empresas 
  ADD COLUMN industria_principal INT REFERENCES public.industrias(id);

-- Mapeo industria → apps por defecto
CREATE TABLE public.industria_apps (
  industria_id INT REFERENCES public.industrias(id),
  application_id INT REFERENCES public.applications(id),
  es_por_defecto BOOLEAN DEFAULT true,
  PRIMARY KEY (industria_id, application_id)
);
```

### Apps por industria

| Industria | Apps por defecto |
|-----------|-----------------|
| Panadería | panaderia, admin |
| Restaurante | restaurant, admin |
| POS | pos, admin |
| Médico | medico, admin |
| Académico | academico, admin |
| Admin | admin |

### Roles plataforma (app 'core')

Se crea una nueva app `core` con estos roles:
- `super_admin`: acceso cross-tenant (solo dueños de plataforma)
- `admin`: gestión completa de su empresa (usuarios, roles, apps)
- `auditor`: solo lectura de logs y reportes
- `supervisor`: métricas y reports

### Roles por industria

Cada industria define sus roles en `public.roles` con `application_id` correspondiente.

**Panadería** (app_id = panaderia) — ya existe:
- admin, produccion, ventas, usuario, panificador, ayudante_panificador, inventario

**Restaurante** (app_id = restaurant — nueva):
- admin_local: gestión del restaurant
- chef: recetas, menú, producción
- cocinero: ejecución de órdenes
- ayudante_cocina: asistencia
- cajero: cobros

**POS** (app_id = pos — nueva):
- admin_tienda: gestión de tienda
- vendedor: ventas
- cajero: cobros
- gerente_turno: cierres

**Médico** (app_id = medico — nueva):
- medico: pacientes, recetas médicas, historias clínicas
- enfermero: asistencia, signos vitales
- recepcionista: turnos, admisión
- administrativo: facturación, seguros

**Académico** (app_id = academico — nueva):
- profesor: cursos, calificaciones
- alumno: inscripción, notas
- preceptor: asistencia, comunicaciones
- coordinador: planes de estudio

**Admin** (app_id = admin — existe, ampliar):
- contador: libros contables, balances
- administrativo: documentos, RRHH
- gestor: cobranzas, pagos

### Permisos por industria

Cada nueva app registra sus permisos en `public.permissions` siguiendo el patrón `{app}.{entidad}.{accion}`.

Ejemplo para app `medico`:
```
medico.pacientes.read, medico.pacientes.create, medico.pacientes.update
medico.turnos.read, medico.turnos.create, medico.turnos.update
medico.historial_clinico.read
```

### Flujo de registro

1. Usuario ingresa email + password + nombre
2. Selecciona industria principal (paso nuevo)
3. Sistema:
   - Crea empresa con `industria_principal`
   - Crea `empresa_usuarios` como dueño
   - Asigna rol `admin` (plataforma) + rol por defecto de industria
   - Crea suscripción con plan gratuito de esa industria
4. Redirige al dashboard

### Navegación

- Sidebar dinámico: consulta `get_apps_por_suscripcion()` para mostrar apps disponibles
- Cada app tiene su propio menú lateral
- HomeDashboard muestra apps como tarjetas

### Suscripciones

- Los planes existentes tienen `features.apps` que lista qué apps incluye
- Se respeta el modelo actual
- Seed data actualizada: Gratuito (1 industria, 1 app), Básico (1 industria, 2 apps), etc.

## Cambios en base de datos

1. Crear tabla `industrias`
2. Crear tabla `industria_apps`
3. ALTER `empresas` ADD `industria_principal`
4. Insertar industrias seed
5. Crear app `core` con roles plataforma
6. Crear apps para restaurant, pos, medico, academico
7. Crear roles y permisos para cada app nueva
8. Actualizar `handle_new_user()` para flujo multi-industria
9. Actualizar RLS policies para nuevo modelo

## Migración

- Empresas existentes → `industria_principal = panaderia`
- Usuarios existentes → mantienen sus roles actuales
- `handle_new_user()` se reemplaza con la nueva versión

## Riesgos

1. **Complejidad de RLS**: Las policies necesitan verificar industria + app + permiso
2. **Aislamiento de datos**: Cada industria tiene modelos distintos (no comparten tablas de negocio)
3. **Migración**: Cambiar el schema con datos existentes requiere cuidado
4. **Frontend dinámico**: La navegación y componentes deben ser completamente genéricos

## Fuera de scope (próximas iteraciones)

- Implementación completa de cada industria (CRUDs, vistas)
- Módulo de contabilidad cross-industria
- POS con hardware (impresoras, lectores)
- Integración con pasarelas de pago
