// ─── Barrel: re-exporta todas las funciones de base de datos
// por dominio. Reemplaza el antiguo database.js.
// Uso: import { fetchIngredientes, createReceta } from '../composables'

export {
  fetchCategoriasReceta,
  createCategoriaReceta,
  updateCategoriaReceta,
  deleteCategoriaReceta,
  fetchCategoriasIngrediente,
  createCategoriaIngrediente,
  updateCategoriaIngrediente,
  deleteCategoriaIngrediente,
  fetchCategoriasProducto,
  createCategoriaProducto,
  updateCategoriaProducto,
  deleteCategoriaProducto,
  fetchUnidadesMedida,
  createUnidadMedida,
  updateUnidadMedida,
  deleteUnidadMedida,
  fetchConversionesUnidades,
  createConversionUnidad,
  updateConversionUnidad,
  deleteConversionUnidad,
} from './catalogos'

export {
  fetchIngredientes,
  countIngredientes,
  fetchIngrediente,
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
  fetchPrecioIngrediente,
} from './ingredientes'

export {
  fetchProveedores,
  countProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  fetchIngredientesProveedor,
  fetchProveedoresByIngrediente,
  createIngredienteProveedor,
  updateIngredienteProveedor,
  deleteIngredienteProveedor,
} from './proveedores'

export {
  fetchRecetas,
  countRecetas,
  fetchRecetaById,
  createReceta,
  updateReceta,
  deleteReceta,
  calcularCostoRecetaRPC,
  calcularCostoProducto,
} from './recetas'

export {
  fetchProductos,
  countProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  fetchPrecioCostoProducto,
  generarProductosFaltantes,
} from './productos'

export {
  fetchOrdenProduccion,
  updateOrdenProduccion,
  fetchOrdenesProduccion,
  countOrdenesProduccion,
  createOrdenProduccion,
  updateOrdenEstado,
  calcularIngredientesNecesarios,
  descontarIngredientesOrden,
} from './ordenes'

export {
  fetchMovimientosMp,
  countMovimientosMp,
  crearMovimientoMp,
  fetchMovimientosPt,
  countMovimientosPt,
  crearMovimientoPt,
  fetchProductosConStock,
  fetchStockProducto,
  fetchStockValorizadoTotal,
  fetchStockValorizado,
  fetchStockIngrediente,
} from './stock'

export {
  fetchMermas,
  createMerma,
  updateMerma,
  deleteMerma,
  countMermas,
} from './mermas'

export {
  fetchAuditLogs,
} from './auditoria'
