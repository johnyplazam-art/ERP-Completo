/**
 * SIAS ERP System - Google Apps Script Backend
 * Entry point for web app requests
 */

// JWT Configuration
const JWT_SECRET = PropertiesService.getScriptProperties().getProperty('JWT_SECRET') || 'SIAS_ERP_SECRET_KEY_2026'; // Fallback for development
const JWT_EXPIRY_HOURS = 24;

/**
 * Handles HTTP POST requests to the web app
 * @param {Object} e - Event object containing request data
 * @returns {Object} JSON response
 */
function doPost(e) {
  try {
    // Parse the request body
    const data = JSON.parse(e.postData.contents);
    
    // Extract action and parameters
    const action = data.action;
    const params = data.params || {};
    
    let result;
    
    // Route to appropriate handler based on action
    switch (action) {
      case 'createProduct':
        result = handleCreateProduct(params);
        break;
      case 'getProducts':
        result = handleGetProducts(params);
        break;
      case 'updateProduct':
        result = handleUpdateProduct(params);
        break;
      case 'deleteProduct':
        result = handleDeleteProduct(params);
        break;
      case 'authenticate':
        result = handleAuthenticate(params);
        break;
      case 'setup':
        result = handleSetup(params);
        break;
      default:
        result = {
          success: false,
          error: 'Invalid action: ' + action
        };
    }
    
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Wraps an object as a JSON TextOutput for GAS web app
 * @param {Object} data - Data to return as JSON
 * @returns {TextOutput}
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles HTTP GET requests to the web app
 * @param {Object} e - Event object containing request data
 * @returns {Object} JSON response
 */
function doGet(e) {
  try {
    // Extract action from query parameters
    const action = e.parameter.action;
    const params = {};
    
    // Convert all parameters to object
    for (const key in e.parameter) {
      if (key !== 'action') {
        params[key] = e.parameter[key];
      }
    }
    
    let result;
    
    // Route to appropriate handler based on action
    switch (action) {
      case 'getProducts':
        result = handleGetProducts(params);
        break;
      case 'getProduct':
        result = handleGetProduct(params);
        break;
      default:
        result = {
          success: false,
          error: 'Invalid action: ' + action
        };
    }
    
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generates a JWT token
 * @param {Object} payload - Data to encode in the token
 * @returns {string} JWT token
 */
function generateToken(payload) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const exp = Math.floor(Date.now() / 1000) + (JWT_EXPIRY_HOURS * 3600);
  const payloadWithExp = Object.assign({}, payload, { exp });
  
  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payloadWithExp));
  
  const signatureInput = encodedHeader + '.' + encodedPayload;
  const signature = Utilities.computeHmacSha256Signature(signatureInput, JWT_SECRET);
  const encodedSignature = Utilities.base64EncodeWebSafe(signature);
  
  return encodedHeader + '.' + encodedPayload + '.' + encodedSignature;
}

/**
 * Verifies a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded payload if valid, null otherwise
 */
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const encodedHeader = parts[0];
    const encodedPayload = parts[1];
    const encodedSignature = parts[2];
    
    const signatureInput = encodedHeader + '.' + encodedPayload;
    const expectedSignature = Utilities.computeHmacSha256Signature(signatureInput, JWT_SECRET);
    const actualSignature = Utilities.base64DecodeWebSafe(encodedSignature);
    
    if (!Utilities.base64EncodeWebSafe(expectedSignature) === encodedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(encodedPayload)).getDataAsString());
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Decodes a JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload if valid JSON, null otherwise
 */
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const encodedPayload = parts[1];
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(encodedPayload)).getDataAsString());
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * TransactionBuffer for batch operations
 */
class TransactionBuffer {
  constructor() {
    this.queue = [];
  }
  
  /**
   * Add a transaction to the buffer
   * @param {Function} operation - Function to execute
   * @param {Array} args - Arguments for the operation
   */
  add(operation, ...args) {
    this.queue.push({ operation, args });
  }
  
  /**
   * Process all buffered transactions
   * @returns {Array} Results of all operations
   */
  process() {
    const results = [];
    for (const item of this.queue) {
      try {
        const result = item.operation(...item.args);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    this.queue = []; // Clear queue after processing
    return results;
  }
  
  /**
   * Get the number of items in the buffer
   * @returns {number} Queue length
   */
  size() {
    return this.queue.length;
  }
  
  /**
   * Clear the buffer without processing
   */
  clear() {
    this.queue = [];
  }
}

/**
 * RepositoryFactory pattern for dependency injection
 */
const RepositoryFactory = {
  /**
   * Create a repository instance
   * @param {string} type - Type of repository to create
   * @param {Object} dependencies - Dependencies for the repository
   * @returns {Object} Repository instance
   */
  create: function(type, dependencies) {
    switch (type) {
      case 'sheet':
        return new SheetRepository(dependencies.sheetId, dependencies.sheetName);
      default:
        throw new Error('Unknown repository type: ' + type);
    }
  }
};

/**
 * BaseRepository abstract class
 */
class BaseRepository {
  /**
   * @param {string} sheetId - Google Sheet ID
   * @param {string} sheetName - Sheet name/tabs
   */
  constructor(sheetId, sheetName) {
    if (this.constructor === BaseRepository) {
      throw new Error('BaseRepository cannot be instantiated directly');
    }
    this.sheetId = sheetId;
    this.sheetName = sheetName;
  }
  
  /**
   * Get the sheet object
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} Sheet object
   */
  getSheet() {
    const ss = SpreadsheetApp.openById(this.sheetId);
    return ss.getSheetByName(this.sheetName);
  }
  
  /**
   * Abstract method to create an entity
   * @param {Object} data - Entity data
   * @returns {Object} Created entity
   */
  create(data) {
    throw new Error('Method create() must be implemented');
  }
  
  /**
   * Abstract method to find entities
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching entities
   */
  find(criteria) {
    throw new Error('Method find() must be implemented');
  }
  
  /**
   * Abstract method to find an entity by ID
   * @param {string|number} id - Entity ID
   * @returns {Object|null} Found entity or null
   */
  findById(id) {
    throw new Error('Method findById() must be implemented');
  }
  
  /**
   * Abstract method to update an entity
   * @param {string|number} id - Entity ID
   * @param {Object} data - Update data
   * @returns {Object} Updated entity
   */
  update(id, data) {
    throw new Error('Method update() must be implemented');
  }
  
  /**
   * Abstract method to delete an entity
   * @param {string|number} id - Entity ID
   * @returns {boolean} Success status
   */
  delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}

/**
 * SheetRepository for Google Sheets integration
 */
class SheetRepository extends BaseRepository {
  /**
   * @param {string} sheetId - Google Sheet ID
   * @param {string} sheetName - Sheet name/tabs
   */
  constructor(sheetId, sheetName) {
    super(sheetId, sheetName);
  }
  
  /**
   * Get all rows as objects with headers as keys
   * @returns {Array} Array of objects representing rows
   */
  getAllRows() {
    const sheet = this.getSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return [];
    }
    
    const headers = data[0];
    const rows = [];
    
    for (let i = 1; i < data.length; i++) {
      const rowObj = {};
      for (let j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = data[i][j];
      }
      rows.push(rowObj);
    }
    
    return rows;
  }
  
  /**
   * Create a new entity (append row)
   * @param {Object} data - Entity data
   * @returns {Object} Created entity with ID
   */
  create(data) {
    const sheet = this.getSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = [];
    
    // Add ID if not present (timestamp-based)
    const id = data.id || Date.now().toString();
    const rowWithId = Object.assign({ id }, data);
    
    // Build row data matching headers order
    for (const header of headers) {
      rowData.push(rowWithId[header] !== undefined ? rowWithId[header] : '');
    }
    
    sheet.appendRow(rowData);
    
    return Object.assign({}, rowWithId, { id: id });
  }
  
  /**
   * Find entities matching criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching entities
   */
  find(criteria) {
    const allRows = this.getAllRows();
    return allRows.filter(row => {
      for (const key in criteria) {
        if (row[key] !== criteria[key]) {
          return false;
        }
      }
      return true;
    });
  }
  
  /**
   * Find entity by ID
   * @param {string|number} id - Entity ID
   * @returns {Object|null} Found entity or null
   */
  findById(id) {
    const allRows = this.getAllRows();
    return allRows.find(row => row.id == id) || null;
  }
  
  /**
   * Find entity by codigo
   * @param {string} codigo - Product code
   * @returns {Object|null} Found entity or null
   */
  findByCodigo(codigo) {
    const allRows = this.getAllRows();
    return allRows.find(row => row.codigo === codigo) || null;
  }
  
  /**
   * Update entity by ID
   * @param {string|number} id - Entity ID
   * @param {Object} data - Update data
   * @returns {Object} Updated entity
   */
  update(id, data) {
    const sheet = this.getSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    
    // Find row index with matching ID
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == id) { // Assuming ID is in first column
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error('Entity not found with ID: ' + id);
    }
    
    // Update values
    const rowData = values[rowIndex];
    for (const key in data) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        rowData[colIndex] = data[key];
      }
    }
    
    // Update the row in the sheet
    sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
    
    // Return updated entity
    const updatedEntity = {};
    for (let i = 0; i < headers.length; i++) {
      updatedEntity[headers[i]] = rowData[i];
    }
    
    return updatedEntity;
  }
  
  /**
   * Delete entity by ID
   * @param {string|number} id - Entity ID
   * @returns {boolean} Success status
   */
  delete(id) {
    const sheet = this.getSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find row index with matching ID
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == id) { // Assuming ID is in first column
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return false; // Entity not found
    }
    
    // Delete the row
    sheet.deleteRow(rowIndex + 1);
    return true;
  }
}

// Product handling functions using repository pattern
function handleCreateProduct(params) {
  const transactionBuffer = new TransactionBuffer();
  
  try {
    // Validate required fields
    const requiredFields = ['codigo', 'nombre', 'categoria', 'unidadMedida', 'precioCosto', 'precioVenta', 'stockActual', 'stockMinimo', 'stockMaximo'];
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === '') {
        return {
          success: false,
          error: `Missing required field: ${field}`
        };
      }
    }
    
    // Validate numeric fields
    const numericFields = ['precioCosto', 'precioVenta', 'stockActual', 'stockMinimo', 'stockMaximo'];
    for (const field of numericFields) {
      if (isNaN(params[field]) || params[field] < 0) {
        return {
          success: false,
          error: `Invalid value for ${field}: must be a non-negative number`
        };
      }
    }
    
    // Validate business rule: precioVenta >= precioCosto
    if (params.precioVenta < params.precioCosto) {
      return {
        success: false,
        error: 'Sale price must be greater than or equal to cost price'
      };
    }
    
    // Validate business rule: stockMinimo <= stockMaximo
    if (params.stockMinimo > params.stockMaximo) {
      return {
        success: false,
        error: 'Minimum stock cannot be greater than maximum stock'
      };
    }
    
    // Check if product code already exists by searching for codigo field
    const repository = RepositoryFactory.create('sheet', {
      sheetId: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
      sheetName: 'DB_Inventario'
    });
    
    const existingProducts = repository.find({ codigo: params.codigo });
    if (existingProducts.length > 0) {
      return {
        success: false,
        error: 'Product code already exists'
      };
    }
    
    // Set timestamps
    const now = new Date().toISOString();
    const productData = Object.assign({}, params, {
      fechaCreacion: now,
      fechaActualizacion: now,
      activo: params.activo !== undefined ? params.activo : true
    });
    
    // Add create operation to transaction buffer
    transactionBuffer.add(
      (repo, data) => repo.create(data),
      repository,
      productData
    );
    
    // Process transaction buffer
    const results = transactionBuffer.process();
    const createResult = results[0];
    
    if (!createResult.success) {
      throw new Error(createResult.error);
    }
    
    return {
      success: true,
      message: 'Product created successfully',
      data: createResult.data
    };
  } catch (error) {
    // Clear buffer on error
    transactionBuffer.clear();
    return {
      success: false,
      error: error.message
    };
  }
}

function handleGetProducts(params) {
  try {
    // Parse query parameters
    const page = parseInt(params.page) || 1;
    const limit = Math.min(parseInt(params.limit) || 20, 100); // Max 100
    const sortBy = params.sortBy || 'nombre';
    const sortOrder = params.sortOrder || 'asc';
    const filtro = params.filtro || '';
    const categoria = params.categoria || '';
    const activoParam = params.activo;
    
    // Use repository to get products
    const repository = RepositoryFactory.create('sheet', {
      sheetId: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
      sheetName: 'DB_Inventario'
    });
    
    // Get all products
    let allProducts = repository.getAllRows();
    
    // Apply filters
    if (filtro) {
      const searchTerm = filtro.toLowerCase();
      allProducts = allProducts.filter(product => 
        (product.nombre && product.nombre.toLowerCase().includes(searchTerm)) ||
        (product.codigo && product.codigo.toLowerCase().includes(searchTerm)) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm))
      );
    }
    
    if (categoria) {
      allProducts = allProducts.filter(product => product.categoria === categoria);
    }
    
    if (activoParam !== undefined) {
      const activoBool = activoParam === 'true';
      allProducts = allProducts.filter(product => product.activo === activoBool.toString());
    }
    
    // Apply sorting
    const reverse = sortOrder === 'desc';
    allProducts.sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return reverse ? 1 : -1;
      if (a[sortBy] > b[sortBy]) return reverse ? -1 : 1;
      return 0;
    });
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);
    
    // Build pagination info
    const pagination = {
      page: page,
      limit: limit,
      totalItems: allProducts.length,
      totalPages: Math.ceil(allProducts.length / limit),
      hasNext: endIndex < allProducts.length,
      hasPrev: page > 1
    };
    
    return {
      success: true,
      message: 'Products retrieved successfully',
      data: {
        items: paginatedProducts,
        pagination: pagination
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function handleGetProduct(params) {
  try {
    const repository = RepositoryFactory.create('sheet', {
      sheetId: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
      sheetName: 'DB_Inventario'
    });
    
    let product = null;
    if (params.id) {
      product = repository.findById(params.id);
    } else if (params.codigo) {
      product = repository.findByCodigo(params.codigo);
    }
    
    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }
    
    return {
      success: true,
      message: 'Product retrieved successfully',
      data: product
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function handleUpdateProduct(params) {
  const transactionBuffer = new TransactionBuffer();
  
  try {
    // Validate required fields
    if (!params.id && !params.codigo) {
      return {
        success: false,
        error: 'Missing product ID or codigo'
      };
    }
    
    // Validate numeric fields if present
    const numericFields = ['precioCosto', 'precioVenta', 'stockActual', 'stockMinimo', 'stockMaximo'];
    for (const field of numericFields) {
      if (params[field] !== undefined && (isNaN(params[field]) || params[field] < 0)) {
        return {
          success: false,
          error: `Invalid value for ${field}: must be a non-negative number`
        };
      }
    }
    
    // Validate business rule: precioVenta >= precioCosto
    if (params.precioVenta !== undefined && params.precioCosto !== undefined && params.precioVenta < params.precioCosto) {
      return {
        success: false,
        error: 'Sale price must be greater than or equal to cost price'
      };
    }
    
    // Validate business rule: stockMinimo <= stockMaximo
    if (params.stockMinimo !== undefined && params.stockMaximo !== undefined && params.stockMinimo > params.stockMaximo) {
      return {
        success: false,
        error: 'Minimum stock cannot be greater than maximum stock'
      };
    }
    
    // Set update timestamp
    const updateData = Object.assign({}, params, {
      fechaActualizacion: new Date().toISOString()
    });
    
    // Use repository to update product
    const repository = RepositoryFactory.create('sheet', {
      sheetId: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
      sheetName: 'DB_Inventario'
    });
    
    // Resolve the numeric ID from codigo if needed
    let updateId = params.id;
    if (!updateId && params.codigo) {
      const existingProduct = repository.findByCodigo(params.codigo);
      if (!existingProduct) {
        return {
          success: false,
          error: 'Product not found with codigo: ' + params.codigo
        };
      }
      updateId = existingProduct.id;
    }
    
    if (!updateId) {
      return {
        success: false,
        error: 'Missing product identifier'
      };
    }
    
    // Add update operation to transaction buffer
    transactionBuffer.add(
      (repo, id, data) => repo.update(id, data),
      repository,
      updateId,
      updateData
    );
    
    // Process transaction buffer
    const results = transactionBuffer.process();
    const updateResult = results[0];
    
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }
    
    return {
      success: true,
      message: 'Product updated successfully',
      data: updateResult.data
    };
  } catch (error) {
    // Clear buffer on error
    transactionBuffer.clear();
    return {
      success: false,
      error: error.message
    };
  }
}

function handleDeleteProduct(params) {
  const transactionBuffer = new TransactionBuffer();
  
  try {
    // Validate required fields
    if (!params.id && !params.codigo) {
      return {
        success: false,
        error: 'Missing product ID or codigo'
      };
    }
    
    // Use repository to delete product
    const repository = RepositoryFactory.create('sheet', {
      sheetId: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
      sheetName: 'DB_Inventario'
    });
    
    // Resolve the numeric ID from codigo if needed
    let deleteId = params.id;
    if (!deleteId && params.codigo) {
      const existingProduct = repository.findByCodigo(params.codigo);
      if (!existingProduct) {
        return {
          success: false,
          error: 'Product not found with codigo: ' + params.codigo
        };
      }
      deleteId = existingProduct.id;
    }
    
    if (!deleteId) {
      return {
        success: false,
        error: 'Missing product identifier'
      };
    }
    
    // Add delete operation to transaction buffer
    transactionBuffer.add(
      (repo, id) => repo.delete(id),
      repository,
      deleteId
    );
    
    // Process transaction buffer
    const results = transactionBuffer.process();
    const deleteResult = results[0];
    
    if (!deleteResult.success) {
      throw new Error(deleteResult.error);
    }
    
    if (!deleteResult.data) {
      return {
        success: false,
        error: 'Product not found'
      };
    }
    
    return {
      success: true,
      message: 'Product deleted successfully',
      data: { id: params.id || params.codigo }
    };
  } catch (error) {
    // Clear buffer on error
    transactionBuffer.clear();
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handler for system setup: creates spreadsheet and initializes product sheet
 * @param {Object} params - Setup parameters
 * @returns {Object} Setup result
 */
function handleSetup(params) {
  try {
    let sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    let ss;
    
    if (sheetId) {
      // Try to open existing spreadsheet
      try {
        ss = SpreadsheetApp.openById(sheetId);
      } catch (e) {
        // Sheet doesn't exist anymore, create new one
        sheetId = null;
      }
    }
    
    if (!sheetId) {
      // Create a new spreadsheet
      ss = SpreadsheetApp.create('SIAS ERP - Data');
      sheetId = ss.getId();
      
      // Remove default sheets created by GAS (keep at least one)
      const defaultSheets = ss.getSheets();
      for (let i = defaultSheets.length - 1; i > 0; i--) {
        ss.deleteSheet(defaultSheets[i]);
      }
      // Rename the first remaining sheet
      ss.getSheets()[0].setName('DB_Inventario');
      
      // Save the sheet ID
      PropertiesService.getScriptProperties().setProperty('SHEET_ID', sheetId);
    }
    
    // Get or create the product sheet
    let sheet = ss.getSheetByName('DB_Inventario');
    let created = false;
    
    if (!sheet) {
      sheet = ss.insertSheet('DB_Inventario');
      created = true;
    }
    
    // Check if headers are already set (first row has data)
    const lastCol = sheet.getLastColumn();
    const isInitialized = lastCol > 0 && sheet.getRange(1, 1, 1, lastCol).getValues()[0][0] === 'id';
    
    if (!isInitialized) {
      // Define headers based on product entity schema
      const headers = [
        'id',
        'codigo',
        'nombre',
        'descripcion',
        'categoria',
        'subcategoria',
        'unidadMedida',
        'precioCosto',
        'precioVenta',
        'stockActual',
        'stockMinimo',
        'stockMaximo',
        'activo',
        'fechaCreacion',
        'fechaActualizacion',
        'creadoPor',
        'actualizadoPor'
      ];
      
      // Set headers in the first row
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row (bold, background color)
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
                                           .setBackground('#f0f0f0');
    }
    
    // Set the sheetId property if it was just saved
    PropertiesService.getScriptProperties().setProperty('SHEET_ID', sheetId);
    
    return {
      success: true,
      message: created ? 'Sheet created and initialized' : 'Sheet already exists',
      data: {
        sheetId: sheetId,
        sheetName: 'DB_Inventario',
        spreadsheetUrl: ss.getUrl()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
    

/**
 * Handle authentication requests
 * @param {Object} params - Authentication parameters (username, password)
 * @returns {Object} Auth response with token
 */
function handleAuthenticate(params) {
  // Simple mock authentication - in real app, validate against database
  const { username, password } = params;
  
  // Mock validation
  if (username === 'admin' && password === 'password123') {
    const token = generateToken({
      userId: 1,
      username: username,
      role: 'admin'
    });
    
    return {
      success: true,
      message: 'Authentication successful',
      data: {
        token: token,
        expiresIn: JWT_EXPIRY_HOURS * 3600
      }
    };
  } else {
    return {
      success: false,
      error: 'Invalid credentials'
    };
  }
}