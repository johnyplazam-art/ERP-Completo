export default [
  {
    path: '',
    name: 'panaderia-dashboard',
    component: () => import('./views/DashboardView.vue'),
    meta: { title: 'Panadería' },
  },
  {
    path: 'recetas',
    name: 'panaderia-recetas',
    component: () => import('./views/RecetasView.vue'),
    meta: { title: 'Recetas' },
  },
  {
    path: 'recetas/nueva',
    name: 'panaderia-recetas-nueva',
    component: () => import('./views/RecetaFormView.vue'),
    meta: { title: 'Nueva Receta' },
  },
  {
    path: 'recetas/:id',
    name: 'panaderia-recetas-editar',
    component: () => import('./views/RecetaFormView.vue'),
    meta: { title: 'Editar Receta' },
  },
  {
    path: 'inventario',
    name: 'panaderia-inventario',
    component: () => import('./views/InventarioView.vue'),
    meta: { title: 'Inventario' },
  },
  {
    path: 'produccion',
    name: 'panaderia-produccion',
    component: () => import('./views/ProduccionView.vue'),
    meta: { title: 'Producción' },
  },
  {
    path: 'produccion/nueva',
    name: 'panaderia-produccion-nueva',
    component: () => import('./views/OrdenFormView.vue'),
    meta: { title: 'Nueva Orden' },
  },

  // Productos
  {
    path: 'productos',
    name: 'panaderia-productos',
    component: () => import('./views/ProductosView.vue'),
    meta: { title: 'Productos' },
  },
  {
    path: 'productos/nuevo',
    name: 'panaderia-productos-nuevo',
    component: () => import('./views/ProductoFormView.vue'),
    meta: { title: 'Nuevo Producto' },
  },
  {
    path: 'productos/:id',
    name: 'panaderia-productos-editar',
    component: () => import('./views/ProductoFormView.vue'),
    meta: { title: 'Editar Producto' },
  },

  // Proveedores
  {
    path: 'proveedores',
    name: 'panaderia-proveedores',
    component: () => import('./views/ProveedoresView.vue'),
    meta: { title: 'Proveedores' },
  },
  {
    path: 'proveedores/nuevo',
    name: 'panaderia-proveedores-nuevo',
    component: () => import('./views/ProveedorFormView.vue'),
    meta: { title: 'Nuevo Proveedor' },
  },
  {
    path: 'proveedores/:id',
    name: 'panaderia-proveedores-editar',
    component: () => import('./views/ProveedorFormView.vue'),
    meta: { title: 'Editar Proveedor' },
  },

  // Ingredientes (bajo /inventario)
  {
    path: 'inventario/nuevo',
    name: 'panaderia-ingrediente-nuevo',
    component: () => import('./views/IngredienteFormView.vue'),
    meta: { title: 'Nuevo Ingrediente' },
  },
  {
    path: 'inventario/:id(\\d+)',
    name: 'panaderia-ingrediente-editar',
    component: () => import('./views/IngredienteFormView.vue'),
    meta: { title: 'Editar Ingrediente' },
  },
]
