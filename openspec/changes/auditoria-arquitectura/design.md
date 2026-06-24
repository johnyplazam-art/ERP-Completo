# Auditoría y Estabilización — Technical Design

## Architecture Decision Records

### ADR-1: Migración única vs incremental

**Decision**: Una sola migración por fase, no una por tabla.

**Rationale**: Las migraciones múltiples para agregar `empresa_id` tabla por
tabla generarían 11 archivos. Una sola migración por fase reduce el ruido y
permite ver el cambio completo. Cada migración es atómica (transactional DDL).

**Tradeoff**: Si una tabla falla, toda la migración se revierte. Pero es el
comportamiento deseado — no queremos tablas con `empresa_id` y otras sin él.

---

### ADR-2: RPC en lugar de trigger para completar_orden()

**Decision**: Usar RPC `completar_orden()` invocado desde el frontend, NO un
trigger automático en `ordenes_produccion`.

**Rationale**: La transición a "completada" requiere lógica de negocio compleja
que depende del contexto (descontar MP, valorizar PT). Un trigger no puede
devolver feedback al frontend fácilmente. El RPC mantiene el control en la
capa de aplicación.

**Tradeoff**: El frontend debe recordar llamar al RPC en vez de solo hacer
UPDATE. Pero ya hay un botón "Completar" en ProduccionView.vue, solo cambia
lo que hace ese botón.

---

### ADR-3: Cache de IP con stale-while-revalidate

**Decision**: Cache en memoria con timestamp, no localStorage ni backend.

**Rationale**: La IP pública rara vez cambia durante una sesión. No necesita
persistencia. Stale-while-revalidate asegura que siempre hay una respuesta
rápida (incluso si es ligeramente vieja).

---

## Component Design

### Migration: 001_add_empresa_id.sql

```sql
-- Add empresa_id to all panaderia tables
-- Step 1: Add column (nullable first)
ALTER TABLE public.ingredientes ADD COLUMN IF NOT EXISTS empresa_id INT;
-- ... (same for all 11 tables)

-- Step 2: Backfill with default empresa
UPDATE public.ingredientes SET empresa_id = 1 WHERE empresa_id IS NULL;
-- ...

-- Step 3: Set NOT NULL
ALTER TABLE public.ingredientes ALTER COLUMN empresa_id SET NOT NULL;
-- ...

-- Step 4: Add FK constraints
ALTER TABLE public.ingredientes
  ADD CONSTRAINT fk_ingredientes_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
-- ...

-- Step 5: Update RLS policies
-- Replace old policies with new ones using user_roles + empresa_id filtering
DROP POLICY IF EXISTS "Escritura admins y produccion" ON public.ingredientes;
CREATE POLICY "ingredientes_select" ON public.ingredientes FOR SELECT TO authenticated
  USING (empresa_id = ANY(public.usuario_empresas_ids()));
CREATE POLICY "ingredientes_insert" ON public.ingredientes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = ANY(public.usuario_empresas_ids())
    AND public.tiene_permiso('ingredientes.create'));
-- ... similar for all tables
```

### RPC: completar_orden()

```sql
CREATE OR REPLACE FUNCTION public.completar_orden(p_orden_id INT)
RETURNS JSONB AS $$
DECLARE
  v_orden RECORD;
  v_detalle RECORD;
  v_ingredientes JSONB;
  v_empresa_id INT;
  v_usuario_id UUID;
BEGIN
  -- 1. Lock the order row
  SELECT * INTO v_orden FROM public.ordenes_produccion
  WHERE id = p_orden_id AND estado = 'en_proceso'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orden no encontrada o no está en proceso');
  END IF;
  
  v_empresa_id := v_orden.empresa_id;
  v_usuario_id := auth.uid();
  
  -- 2. Calculate ingredients needed (uses existing function)
  -- 3. Create MP movements (egreso)
  -- 4. Update order status to completada
  UPDATE public.ordenes_produccion
  SET estado = 'completada', fecha_fin = now()
  WHERE id = p_orden_id;
  
  -- 5. Create PT movements (ingreso) for each detail
  FOR v_detalle IN
    SELECT * FROM public.orden_produccion_detalle
    WHERE orden_id = p_orden_id
  LOOP
    INSERT INTO public.movimientos_inventario_pt
      (producto_id, tipo, cantidad, fecha, precio_unitario,
       nota, creado_por, empresa_id, orden_detalle_id)
    VALUES
      (v_detalle.producto_id, 'ingreso', v_detalle.cantidad_producida, now(),
       v_detalle.costo_unitario_estimado,
       'Auto: orden #' || p_orden_id, v_usuario_id, v_empresa_id, v_detalle.id);
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'orden_id', p_orden_id);
  
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
```

### Helper Functions

```sql
-- Helper: get empresa IDs for current user
CREATE OR REPLACE FUNCTION public.usuario_empresas_ids()
RETURNS INT[] AS $$
  SELECT ARRAY_AGG(empresa_id)
  FROM public.empresa_usuarios
  WHERE usuario_id = auth.uid() AND activo = true;
$$ LANGUAGE sql STABLE;

-- Helper: check permission
CREATE OR REPLACE FUNCTION public.tiene_permiso(p_action TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.action_name = p_action
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Frontend: useAudit.js refactor

```javascript
// Replace simple cache with TTL cache
let ipCache = {
  value: null,
  timestamp: 0,
  staleMs: 30 * 60 * 1000, // 30 min
  refreshing: false,
}

async function resolvePublicIp() {
  const now = Date.now()
  
  // If we have a fresh value, return it
  if (ipCache.value && (now - ipCache.timestamp) < ipCache.staleMs) {
    return ipCache.value
  }
  
  // If we have a stale value, refresh in background
  if (ipCache.value) {
    refreshIp() // fire-and-forget
    return ipCache.value
  }
  
  // No cache at all, fetch synchronously
  return refreshIp()
}

async function refreshIp() {
  if (ipCache.refreshing) return ipCache.value || ''
  ipCache.refreshing = true
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    const d = await r.json()
    ipCache.value = d.ip
    ipCache.timestamp = Date.now()
    return d.ip
  } catch {
    return ipCache.value || ''
  } finally {
    ipCache.refreshing = false
  }
}
```

### Frontend: Global Error Handler

Implementar como plugin de Vue que envuelve `supabase.from()` usando
`supabase.auth.onAuthStateChange` para detectar 401 y un wrapper
de fetch para errores de red.

```javascript
// src/core/supabase-error.js
import { toast } from 'vue-sonner'

export function setupGlobalErrorHandler(router, authStore) {
  // Intercept Supabase errors via wrapper
  const originalFrom = supabase.from.bind(supabase)
  
  return new Proxy(supabase, {
    get(target, prop) {
      if (prop === 'from') {
        return (table) => {
          const query = originalFrom(table)
          return wrapQueryMethods(query)
        }
      }
      return target[prop]
    }
  })
}

function wrapQueryMethods(query) {
  ['select', 'insert', 'update', 'delete', 'upsert'].forEach(method => {
    const original = query[method].bind(query)
    query[method] = function(...args) {
      const builder = original(...args)
      const origThen = builder.then.bind(builder)
      builder.then = function(onFulfilled, onRejected) {
        return origThen(
          onFulfilled,
          (error) => handleError(error) ?? onRejected?.(error)
        )
      }
      return builder
    }
  })
  return query
}
```

### Frontend: formatCurrency fix

```javascript
// In useCurrency.js — change to:
function formatCurrency(value, currencyCode = 'USD') {
  const cfg = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.USD
  return Number(value).toLocaleString(cfg.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,    // was 0
    maximumFractionDigits: 2,    // was 0
  })
}
```

## Database entity relationship

```
empresas (1) ─────< ingredientes
empresas (1) ─────< proveedores
empresas (1) ─────< recetas
empresas (1) ─────< productos
empresas (1) ─────< ordenes_produccion
empresas (1) ─────< movimientos_inventario_mp
empresas (1) ─────< movimientos_inventario_pt
empresas (1) ─────< mermas
empresas (1) ─────< empresa_usuarios >────(1) perfiles
```

## Sequence: completar_orden flow

```
Usuario           ProduccionView        Supabase (RPC)        DB
   │                    │                     │                │
   │  Click "Completar" │                     │                │
   │───────────────────>│                     │                │
   │                    │  completar_orden()  │                │
   │                    │────────────────────>│                │
   │                    │                     │─── LOCK orden ──>
   │                    │                     │─── Calcular MP ─>
   │                    │                     │─── Crear movs ─>
   │                    │                     │─── UPDATE est ─>
   │                    │                     │─── Crear PTs ──>
   │                    │  { success: true }  │                │
   │                    │<────────────────────│                │
   │  toast.success()   │                     │                │
   │<───────────────────│                     │                │
   
   Si falla en cualquier paso:
   │                    │  { success: false,  │                │
   │                    │    error: "..." }    │                │
   │                    │<────────────────────│                │
   │  toast.error()     │                     │                │
   │<───────────────────│                     │                │
   │                    │                     │─── ROLLBACK ───>
```

## Migration execution order

1. `20260622000100_add_empresa_id.sql` — Add empresa_id + backfill + RLS
2. `20260622000200_unified_rls_policies.sql` — Replace all old RLS policies
3. `20260622000300_rpc_completar_orden.sql` — Create completar_orden() RPC
4. `20260622000400_fix_calcular_costo_receta.sql` — Add validation for zero prices

## Rollback Plan

Para cada migración, incluir el DROP/Revert al inicio del archivo:

```sql
-- Revert (comentar o ejecutar si es necesario)
-- DROP POLICY IF EXISTS ... ;
-- ALTER TABLE public.ingredientes DROP COLUMN IF EXISTS empresa_id;
```
