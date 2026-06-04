// Zod validation for product form inputs
import { z } from 'zod'

// Product schema for validation
export const productSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  categoria: z.string().min(1, 'Categoría es requerida'),
  subcategoria: z.string().optional(),
  unidadMedida: z.string().min(1, 'Unidad de medida es requerida'),
  precioCosto: z.number().positive('Precio de costo debe ser mayor que cero'),
  precioVenta: z.number().positive('Precio de venta debe ser mayor que cero'),
  stockActual: z.number().nonnegative('Stock actual no puede ser negativo'),
  stockMinimo: z.number().nonnegative('Stock mínimo no puede ser negativo'),
  stockMaximo: z.number().nonnegative('Stock máximo no puede ser negativo'),
  activo: z.boolean().default(true)
})

// Refined validation with business rules
export const validatedProductSchema = productSchema.refine(
  (data) => data.precioVenta >= data.precioCosto,
  {
    message: 'Precio de venta debe ser mayor o igual al precio de costo',
    path: ['precioVenta']
  }
).refine(
  (data) => data.stockMinimo <= data.stockMaximo,
  {
    message: 'Stock mínimo no puede ser mayor que stock máximo',
    path: ['stockMaximo']
  }
)

// Type inference for TypeScript
export type ProductFormValues = z.infer<typeof validatedProductSchema>

// Validation function
export const validateProduct = (data) => {
  return validatedProductSchema.safeParse(data)
}

export default validatedProductSchema