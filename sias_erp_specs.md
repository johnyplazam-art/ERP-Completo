# SIAS ERP System - SDD Delta Specs

## Functional Requirements

### Data Models

#### Product Entity
```javascript
{
  id: string, // UUID or auto-generated ID
  codigo: string, // Product code (unique)
  nombre: string, // Product name
  descripcion: string, // Product description
  categoria: string, // Category
  subcategoria: string, // Subcategory
  unidadMedida: string, // Unit of measure (kg, l, unidad, etc.)
  precioCosto: number, // Cost price
  precioVenta: number, // Sale price
  stockActual: number, // Current stock
  stockMinimo: number, // Minimum stock threshold
  stockMaximo: number, // Maximum stock threshold
  activo: boolean, // Active status
  fechaCreacion: string, // Creation date (ISO format)
  fechaActualizacion: string, // Last update date (ISO format)
  creadoPor: string, // User who created
  actualizadoPor: string // User who last updated
}
```

### API Endpoints

#### Create Product
- **URL**: `/api/productos`
- **Method**: `POST`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>`
- **Request Body**:
  ```json
  {
    "codigo": "PROD001",
    "nombre": "Harina Integral",
    "descripcion": "Harina de trigo integral orgánica",
    "categoria": "Ingredientes",
    "subcategoria": "Harinas",
    "unidadMedida": "kg",
    "precioCosto": 2.50,
    "precioVenta": 4.00,
    "stockActual": 100,
    "stockMinimo": 20,
    "stockMaximo": 500,
    "activo": true
  }
  ```
- **Success Response**:
  - **Code**: 201 Created
  - **Content**: 
    ```json
    {
      "success": true,
      "data": {
        "id": "prod_12345",
        "codigo": "PROD001",
        "nombre": "Harina Integral",
        // ... other product fields
      },
      "message": "Producto creado exitosamente"
    }
    ```
- **Error Responses**:
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Invalid or missing JWT
  - 409 Conflict: Product code already exists
  - 500 Internal Server Error: Server error

#### List Products with Pagination
- **URL**: `/api/productos`
- **Method**: `GET`
- **Headers**: 
  - `Authorization: Bearer <jwt_token>`
- **Query Parameters**:
  - `page`: Number (default: 1)
  - `limit`: Number (default: 20, max: 100)
  - `sortBy`: String (default: "nombre")
  - `sortOrder`: String ("asc" or "desc", default: "asc")
  - `filtro`: String (search in nombre, codigo, descripcion)
  - `categoria`: String (filter by category)
  - `activo`: Boolean (filter by active status)
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "success": true,
      "data": {
        "items": [
          {
            "id": "prod_12345",
            "codigo": "PROD001",
            "nombre": "Harina Integral",
            // ... other product fields
          }
          // ... more products
        ],
        "pagination": {
          "page": 1,
          "limit": 20,
          "totalItems": 150,
          "totalPages": 8,
          "hasNext": true,
          "hasPrev": false
        }
      },
      "message": "Productos obtenidos exitosamente"
    }
    ```
- **Error Responses**:
  - 401 Unauthorized: Invalid or missing JWT
  - 400 Bad Request: Invalid query parameters
  - 500 Internal Server Error: Server error

### Validation Rules

#### Product Creation Validation
1. **codigo**: 
   - Required
   - String, max 20 characters
   - Must be unique across all products
   - Format: Alphanumeric and hyphens only

2. **nombre**:
   - Required
   - String, max 100 characters
   - Min 2 characters

3. **descripcion**:
   - Optional
   - String, max 500 characters

4. **categoria**:
   - Required
   - String, max 50 characters

5. **subcategoria**:
   - Optional
   - String, max 50 characters

6. **unidadMedida**:
   - Required
   - Must be one of: "kg", "g", "l", "ml", "unidad", "docena", "paquete", "kg", "lt"

7. **precioCosto**:
   - Required
   - Number, >= 0
   - Maximum 2 decimal places

8. **precioVenta**:
   - Required
   - Number, >= 0
   - Maximum 2 decimal places
   - Must be >= precioCosto (business rule)

9. **stockActual**:
   - Required
   - Integer, >= 0

10. **stockMinimo**:
    - Required
    - Integer, >= 0
    - Must be <= stockMaximo

11. **stockMaximo**:
    - Required
    - Integer, >= 0
    - Must be >= stockMinimo

12. **activo**:
    - Optional
    - Boolean, default: true

## Non-Functional Requirements

### Performance
- **Response Time**: 
  - Create Product: < 800ms for 95% of requests
  - List Products: < 1200ms for 95% of requests (with pagination)
- **Throughput**: 
  - Minimum 50 concurrent users
  - Create Product: 10 requests/second
  - List Products: 20 requests/second
- **Resource Usage**:
  - Memory: < 100MB per instance
  - CPU: < 50% average utilization under normal load

### Security
- **Authentication**: 
  - JWT-based authentication required for all endpoints
  - Token expiration: 24 hours
  - Refresh token mechanism implemented
- **Authorization**:
  - Role-based access control (RBAC)
  - Only users with "producto:create" permission can create products
  - Only users with "producto:read" permission can list products
- **Data Protection**:
  - HTTPS enforcement in production
  - Input sanitization to prevent injection attacks
  - SQL/Sheets query parameterization
  - Sensitive data logging avoidance
- **Rate Limiting**:
  - 100 requests per minute per IP
  - Progressive delays for abusive clients

### Scalability
- **Horizontal Scaling**:
  - Stateless backend design
  - Shared nothing architecture
  - Load balancer compatible
- **Database**:
  - Repository abstraction allows switching between Google Sheets and PostgreSQL
  - Connection pooling for PostgreSQL
  - Batch operations for Sheets API
- **Caching**:
  - CacheService used for frequently accessed data
  - Product catalog caching with 5-minute TTL
  - Cache invalidation on product updates
- **Monitoring**:
  - Logging of key operations (create, read, update, delete)
  - Error tracking and alerting
  - Performance metrics collection

## Acceptance Scenarios

### Use Case 1: Creating a Product

**Scenario 1: Successfully create a new product**
```
Given I am an authenticated user with product creation permissions
And I have valid product data including:
  - codigo: "PROD001"
  - nombre: "Harina Integral"
  - descripcion: "Harina de trigo integral orgánica"
  - categoria: "Ingredientes"
  - subcategoria: "Harinas"
  - unidadMedida: "kg"
  - precioCosto: 2.50
  - precioVenta: 4.00
  - stockActual: 100
  - stockMinimo: 20
  - stockMaximo: 500
  - activo: true
When I send a POST request to /api/productos with the product data
Then the system should return HTTP 201 Created
And the response should contain the created product with an assigned ID
And the product should be persisted in the data store
And subsequent GET requests for the product should return the same data
```

**Scenario 2: Fail to create product with duplicate code**
```
Given I am an authenticated user with product creation permissions
And a product with codigo "PROD001" already exists in the system
When I send a POST request to /api/productos with codigo "PROD001"
Then the system should return HTTP 409 Conflict
And the response should indicate that the product code already exists
And no new product should be created
```

**Scenario 3: Fail to create product with invalid data**
```
Given I am an authenticated user with product creation permissions
When I send a POST request to /api/productos with:
  - codigo: "" (empty)
  - nombre: "A" (too short)
  - precioVenta: 1.00 (less than precioCosto of 2.50)
Then the system should return HTTP 400 Bad Request
And the response should contain validation errors for each invalid field
And no product should be created
```

**Scenario 4: Fail to create product without authentication**
```
Given I am not authenticated (no valid JWT token)
When I send a POST request to /api/productos with valid product data
Then the system should return HTTP 401 Unauthorized
And the response should indicate authentication is required
And no product should be created
```

### Use Case 2: Listing Products with Pagination

**Scenario 1: Successfully list products with default pagination**
```
Given I am an authenticated user with product read permissions
And there are 25 products in the system
When I send a GET request to /api/productos (no query parameters)
Then the system should return HTTP 200 OK
And the response should contain:
  - 20 products (default limit)
  - Pagination info showing page 1 of 2
  - Total items: 25
  - Has next page: true
  - Has previous page: false
```

**Scenario 2: Successfully list products with custom pagination**
```
Given I am an authenticated user with product read permissions
And there are 50 products in the system
When I send a GET request to /api/productos?page=2&limit=10
Then the system should return HTTP 200 OK
And the response should contain:
  - 10 products (items 11-20)
  - Pagination info showing page 2 of 5
  - Total items: 50
  - Has next page: true
  - Has previous page: true
```

**Scenario 3: Successfully list products with filtering**
```
Given I am an authenticated user with product read permissions
And there are products in the system including:
  - Product A: categoria "Ingredientes", nombre "Harina"
  - Product B: categoria "Envases", nombre "Bolsa"
  - Product C: categoria "Ingredientes", nombre "Azúcar"
When I send a GET request to /api/productos?categoria=Ingredientes
Then the system should return HTTP 200 OK
And the response should contain only products with categoria "Ingredientes"
And the response should contain Product A and Product C but not Product B
```

**Scenario 4: Successfully list products with search**
```
Given I am an authenticated user with product read permissions
And there are products in the system including:
  - Product A: nombre "Harina Integral", codigo "PROD001"
  - Product B: nombre "Azúcar Refinado", codigo "PROD002"
When I send a GET request to /api/productos?filtro=harina
Then the system should return HTTP 200 OK
And the response should contain Product A (matches "harina" in nombre)
And the response should not contain Product B (no match)
```

**Scenario 5: Successfully list products with sorting**
```
Given I am an authenticated user with product read permissions
And there are products in the system including:
  - Product A: nombre "Azúcar"
  - Product B: nombre "Harina"
  - Product C: nombre "Leche"
When I send a GET request to /api/productos?sortBy=nombre&sortOrder=asc
Then the system should return HTTP 200 OK
And the response should contain products sorted by nombre in ascending order:
  - First: Product A ("Azúcar")
  - Second: Product B ("Harina")
  - Third: Product C ("Leche")
```

**Scenario 6: Fail to list products without authentication**
```
Given I am not authenticated (no valid JWT token)
When I send a GET request to /api/productos
Then the system should return HTTP 401 Unauthorized
And the response should indicate authentication is required
And no products should be returned
```

**Scenario 7: Handle empty product list**
```
Given I am an authenticated user with product read permissions
And there are no products in the system
When I send a GET request to /api/productos
Then the system should return HTTP 200 OK
And the response should contain:
  - Empty products array
  - Pagination info showing total items: 0
  - Has next page: false
  - Has previous page: false
```