import { z } from 'zod'

// ─── Helper: required number from <select> ──────────────
// Los <select> empiezan con :value="null".
// z.preprocess convierte null → undefined para que Zod
// muestre required_error en vez de "Expected number, received null".
function requiredNumber(msg) {
  return z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number({ required_error: msg }).positive(msg)
  )
}

// ─── Catálogos ───────────────────────────────────────

export const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  descripcion: z.string().max(500).default(''),
})

export const unidadMedidaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(50),
  simbolo: z.string().min(1, 'El símbolo es requerido').max(10),
})

export const conversionUnidadSchema = z.object({
  unidad_origen_id: requiredNumber('Seleccioná la unidad origen'),
  unidad_destino_id: requiredNumber('Seleccioná la unidad destino'),
  factor_multiplicacion: z.number().positive('El factor debe ser mayor a 0'),
}).refine(
  data => data.unidad_origen_id !== data.unidad_destino_id,
  { message: 'Las unidades deben ser diferentes', path: ['unidad_destino_id'] }
)

// ─── Ingredientes ────────────────────────────────────

export const ingredienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  categoria_id: requiredNumber('Seleccioná una categoría'),
  unidad_base_id: requiredNumber('Seleccioná una unidad'),
  stock_minimo: z.number().min(0, 'No puede ser negativo').default(0),
  ubicacion: z.string().max(100).default(''),
  perecedero: z.boolean().default(false),
  vida_util_dias: z.number().positive('Debe ser mayor a 0').nullable().optional(),
  activo: z.boolean().default(true),
})

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  contacto: z.string().max(100).default(''),
  telefono: z.string().max(50).default(''),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().max(300).default(''),
})

export const ingredienteProveedorSchema = z.object({
  ingrediente_id: requiredNumber('Seleccioná un ingrediente'),
  proveedor_id: requiredNumber('Seleccioná un proveedor'),
  precio_actual: z.number().min(0, 'El precio no puede ser negativo').default(0),
  plazo_entrega_dias: z.number().min(0).default(0),
  es_preferido: z.boolean().default(false),
})

// ─── Recetas ──────────────────────────────────────────

export const recetaIngredienteSchema = z.object({
  ingrediente_id: requiredNumber('Seleccioná un ingrediente'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidad_id: requiredNumber('Seleccioná una unidad'),
  es_opcional: z.boolean().default(false),
  orden: z.number().int().min(0).default(0),
})

export const recetaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  categoria_id: requiredNumber('Seleccioná una categoría'),
  instrucciones: z.string().default(''),
  tiempo_preparacion_min: z.number().positive('Debe ser mayor a 0').nullable().optional(),
  rendimiento_cantidad: z.number().positive('Debe ser mayor a 0').default(1),
  rendimiento_unidad_id: requiredNumber('Seleccioná una unidad'),
  activa: z.boolean().default(true),
  ingredientes: z.array(recetaIngredienteSchema).min(1, 'Agregá al menos un ingrediente'),
})

// ─── Productos ────────────────────────────────────────

export const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  descripcion: z.string().max(500).default(''),
  categoria_id: requiredNumber('Seleccioná una categoría'),
  receta_id: z.number().positive().nullable().optional(),
  precio_venta: z.number().min(0, 'No puede ser negativo').default(0),
  peso_unitario_gr: z.number().positive('Debe ser mayor a 0').nullable().optional(),
  codigo_barras: z.string().max(50).optional().or(z.literal('')),
  activo: z.boolean().default(true),
})

// ─── Producción ───────────────────────────────────────

export const ordenProduccionDetalleSchema = z.object({
  producto_id: requiredNumber('Seleccioná un producto'),
  receta_id: requiredNumber('Seleccioná una receta'),
  cantidad_programada: z.number().positive('Debe ser mayor a 0'),
  lote: z.string().max(50).default(''),
})

export const ordenProduccionSchema = z.object({
  fecha_programada: z.string().min(1, 'La fecha es requerida'),
  estado: z.enum(['pendiente', 'en_proceso', 'completada', 'cancelada']).default('pendiente'),
  nota: z.string().max(500).default(''),
  detalles: z.array(ordenProduccionDetalleSchema).min(1, 'Agregá al menos un producto'),
})

// ─── Inventario ──────────────────────────────────────

export const movimientoMpSchema = z.object({
  ingrediente_id: requiredNumber('Seleccioná un ingrediente'),
  tipo: z.enum(['ingreso', 'egreso', 'ajuste', 'merma']),
  cantidad: z.number().refine(val => val !== 0, 'La cantidad no puede ser 0'),
  unidad_id: requiredNumber('Seleccioná una unidad'),
  motivo: z.string().max(200).default(''),
  proveedor_id: z.number().positive().nullable().optional(),
  nota: z.string().max(500).default(''),
})

export const movimientoPtSchema = z.object({
  producto_id: requiredNumber('Seleccioná un producto'),
  tipo: z.enum(['ingreso', 'egreso', 'ajuste', 'merma']),
  cantidad: z.number().refine(val => val !== 0, 'La cantidad no puede ser 0'),
  nota: z.string().max(500).default(''),
})

export const mermaSchema = z.object({
  origen: z.enum(['produccion', 'inventario_mp', 'inventario_pt', 'devolucion']),
  ingrediente_id: z.number().positive().nullable().optional(),
  producto_id: z.number().positive().nullable().optional(),
  orden_detalle_id: z.number().positive().nullable().optional(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidad_id: z.number().positive().nullable().optional(),
  tipo: z.enum(['caducidad', 'rotura', 'error_produccion', 'devolucion', 'otro']),
  causa: z.string().max(500).default(''),
}).refine(
  data => data.ingrediente_id || data.producto_id,
  { message: 'Debe especificar ingrediente o producto', path: ['ingrediente_id'] }
)
