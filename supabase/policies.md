# Políticas RLS Recomendadas (Multi-tenancy)

Para garantizar la seguridad de los datos entre empresas, cada tabla debe tener habilitada la Row Level Security (RLS) y seguir este patrón.

## Patrón General

Todas las tablas que contienen `empresa_id` deben tener una política que verifique que el usuario autenticado pertenece a esa empresa.

### 1. Verificación de pertenencia a empresa
```sql
-- Política para SELECT
CREATE POLICY "Usuarios solo ven datos de su empresa" ON nombre_tabla
FOR SELECT
USING (
  empresa_id = (SELECT empresa_id FROM empresa_usuarios WHERE usuario_id = auth.uid())
);
```

## Políticas por Tabla

### Catálogos y Maestros (Ingredientes, Productos, Recetas, Proveedores)

| Tabla | Política Recomendada |
|---|---|
| `categorias_receta` | SELECT, INSERT, UPDATE, DELETE restrictos por `empresa_id` |
| `unidades_medida` | SELECT (público/global), INSERT, UPDATE, DELETE por `empresa_id` |
| `ingredientes` | SELECT, INSERT, UPDATE, DELETE restrictos por `empresa_id` |
| `proveedores` | SELECT, INSERT, UPDATE, DELETE restrictos por `empresa_id` |
| `recetas` | SELECT, INSERT, UPDATE, DELETE restrictos por `empresa_id` |
| `productos` | SELECT, INSERT, UPDATE, DELETE restrictos por `empresa_id` |

### Transaccionales (Movimientos e Inventario)

| Tabla | Política Recomendada |
|---|---|
| `movimientos_inventario_mp` | SELECT, INSERT restrictos por `empresa_id`. El UPDATE/DELETE debe ser restringido a roles administrativos. |
| `ordenes_produccion` | SELECT, INSERT, UPDATE (cambio de estado) por `empresa_id` y rol `produccion`. |
| `orden_produccion_detalle` | SELECT, INSERT restringidos por `empresa_id`. |

## Consideraciones de Seguridad Adicionales

1. **Auditoría**: Asegurar que los triggers de auditoría funcionen para cada acción (INSERT, UPDATE, DELETE) sobre estas tablas.
2. **Roles Granulares**: Utilizar la tabla `user_permissions` para permitir o denegar acciones específicas (ej. `ingredientes.delete`) incluso si el usuario pertenece a la empresa.
3. **No usar `anon`**: Asegurarse de que las políticas para `authenticated` usuarios sean estrictas y no dependan de la clave anónima.
