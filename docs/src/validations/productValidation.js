// Since we are using CDN, we can't import Zod directly in .js module easily without bundler.
// For simplicity, we will define validation rules as objects and use Zod from global scope.
// However, to keep the module system, we'll export a function that uses window.zod if available.
// Alternatively, we can rely on inline validation in components using the global zod.
// For this implementation, we'll create a helper that returns the schema.

export const productSchema = window.zod.object({
  codigo: window.zod.string().min(1, 'Código es requerido'),
  nombre: window.zod.string().min(1, 'Nombre es requerido'),
  descripcion: window.zod.string().optional(),
  categoria: window.zod.string().min(1, 'Categoría es requerida'),
  subcategoria: window.zod.string().optional(),
  unidadMedida: window.zod.string().min(1, 'Unidad de medida es requerida'),
  precioCosto: window.zod.number().min(0, 'Precio costo debe ser mayor o igual a cero'),
  precioVenta: window.zod.number().min(0, 'Precio venta debe ser mayor o igual a cero'),
  stockActual: window.zod.number().min(0, 'Stock actual debe ser mayor o igual a cero'),
  stockMinimo: window.zod.number().min(0, 'Stock mínimo debe ser mayor o igual a cero'),
  stockMaximo: window.zod.number().min(0, 'Stock máximo debe ser mayor o igual a cero'),
  activo: window.zod.union([window.zod.boolean(), window.zod.string()]).transform(val => 
    typeof val === 'string' ? val === 'true' : val
  ).default(true)
}).refine(data => data.precioVenta >= data.precioCosto, {
  message: 'Precio de venta debe ser mayor o igual al precio de costo',
  path: ['precioVenta']
}).refine(data => data.stockMinimo <= data.stockMaximo, {
  message: 'Stock mínimo no puede ser mayor que stock máximo',
  path: ['stockMinimo']
});

// Validation helper
export function validateProduct(data) {
  const result = productSchema.safeParse(data);
  if (!result.success) {
    const errors = {};
    result.error.errors.forEach(err => {
      // Use the first error for each field (simple approach)
      if (!errors.err.path[0]) {
        errors[err.path[0]] = err.message;
      }
    });
    return { valid: false, errors };
  }
  return { valid: true, data: result.data };
}