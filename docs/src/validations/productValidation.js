import { z } from 'zod'

export const productSchema = z.object({
  codigo: z.string().min(1, 'C\u00f3digo es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  categoria: z.string().min(1, 'Categor\u00eda es requerida'),
  subcategoria: z.string().optional(),
  unidadMedida: z.string().min(1, 'Unidad de medida es requerida'),
  precioCosto: z.number().min(0, 'Precio costo debe ser mayor o igual a cero'),
  precioVenta: z.number().min(0, 'Precio venta debe ser mayor o igual a cero'),
  stockActual: z.number().min(0, 'Stock actual debe ser mayor o igual a cero'),
  stockMinimo: z.number().min(0, 'Stock m\u00ednimo debe ser mayor o igual a cero'),
  stockMaximo: z.number().min(0, 'Stock m\u00e1ximo debe ser mayor o igual a cero'),
  activo: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === 'string' ? val === 'true' : val
  ).default(true)
}).refine(data => data.precioVenta >= data.precioCosto, {
  message: 'Precio de venta debe ser mayor o igual al precio de costo',
  path: ['precioVenta']
}).refine(data => data.stockMinimo <= data.stockMaximo, {
  message: 'Stock m\u00ednimo no puede ser mayor que stock m\u00e1ximo',
  path: ['stockMinimo']
})

export function validateProduct(data) {
  const result = productSchema.safeParse(data)
  if (!result.success) {
    const errors = {}
    result.error.errors.forEach(err => {
      const field = err.path[0]
      if (!errors[field]) {
        errors[field] = err.message
      }
    })
    return { valid: false, errors }
  }
  return { valid: true, data: result.data }
}
