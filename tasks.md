# Tasks: SIAS ERP Implementation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Project setup and backend core infrastructure | PR 1 | main branch; includes Clasp setup, .gitignore, Code.gs core files |
| 2 | Backend product module and frontend foundation | PR 2 | PR 1 branch; includes product controller, sheet schema, index.html, Vue app structure |
| 3 | Frontend Vue app completion and integration testing | PR 3 | PR 2 branch; includes Pinia store, Axios, Zod, PrimeVue DataTable, Excel export, manual verification |

## Phase 1: Project Setup and Backend Core Infrastructure

- [ ] 1.1 Initialize Clasp project with proper configuration (.clasp.json)
- [ ] 1.2 Create .gitignore file excluding node_modules, dist, and temporary files
- [ ] 1.3 Create Code.gs file with doPost function as entry point for web app
- [ ] 1.4 Implement JWT utilities (generateToken, verifyToken, decodeToken) in Code.gs
- [ ] 1.5 Create TransactionBuffer class for handling batch operations
- [ ] 1.6 Implement RepositoryFactory pattern for dependency injection
- [ ] 1.7 Create BaseRepository abstract class with common CRUD operations
- [ ] 1.8 Implement SheetRepository extending BaseRepository for Google Sheets integration

## Phase 2: Backend Product Module and Frontend Foundation

- [ ] 2.1 Create InventarioProductosController with REST endpoints for product CRUD
- [ ] 2.2 Define product sheet schema with columns: id, nombre, descripcion, precio, stock, categoria, fechaCreacion, fechaActualizacion
- [ ] 2.3 Create index.html with all required CDNs (Vue 3.5, Tailwind CSS, Pinia, Axios, Zod, PrimeVue, etc.)
- [ ] 2.4 Set up basic Vue 3.5 app structure with root component mounting
- [ ] 2.5 Configure Vue Router for navigation between product list and form views

## Phase 3: Frontend Vue App Completion and Integration Testing

- [ ] 3.1 Implement Pinia store for product state management (products, loading, error states)
- [ ] 3.2 Create Axios instance with base URL and JWT token interceptor
- [ ] 3.3 Integrate Zod validation for product form inputs (name, description, price, stock)
- [ ] 3.4 Implement PrimeVue DataTable component for displaying product list with pagination
- [ ] 3.5 Add Excel export functionality using SheetJS library
- [ ] 3.6 Create product form component with validation and submission handling
- [ ] 3.7 Implement error handling and loading states throughout the application
- [ ] 3.8 Manual verification steps:
    - Verify doPost endpoint responds correctly to GET and POST requests
    - Test JWT token generation and validation
    - Confirm product creation via API persists to Google Sheet
    - Validate frontend fetches and displays product list correctly
    - Test product form validation with valid and invalid inputs
    - Verify Excel export generates correct file format
    - Check responsive design on different screen sizes