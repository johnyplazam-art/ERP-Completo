// Excel export functionality using SheetJS
import * as XLSX from 'xlsx'

/**
 * Export products to Excel format
 * @param {Array} products - Array of product objects
 * @param {string} filename - Name of the Excel file (without extension)
 * @returns {void} - Triggers download
 */
export const exportToExcel = (products, filename = 'productos') => {
  try {
    // If no products, show message and return
    if (!products || products.length === 0) {
      alert('No hay productos para exportar')
      return
    }

    // Prepare data for Excel - map to desired columns
    const excelData = products.map(product => ({
      'ID': product.id || '',
      'Código': product.codigo || '',
      'Nombre': product.nombre || '',
      'Descripción': product.descripcion || '',
      'Categoría': product.categoria || '',
      'Subcategoría': product.subcategoria || '',
      'Unidad de Medida': product.unidadMedida || '',
      'Precio de Costo': product.precioCosto ? parseFloat(product.precioCosto) : 0,
      'Precio de Venta': product.precioVenta ? parseFloat(product.precioVenta) : 0,
      'Stock Actual': product.stockActual || 0,
      'Stock Mínimo': product.stockMinimo || 0,
      'Stock Máximo': product.stockMaximo || 0,
      'Activo': product.activo ? 'Sí' : 'No',
      'Fecha de Creación': product.fechaCreacion || '',
      'Fecha de Actualización': product.fechaActualizacion || ''
    }))

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')
    
    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' })
    
    // Create download link
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}.xlsx`)
    
    // Append to body and trigger click
    document.body.appendChild(link)
    link.click()
    
    // Clean up
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    alert('Error al exportar a Excel: ' + error.message)
  }
}

/**
 * Export products to CSV format (alternative)
 * @param {Array} products - Array of product objects
 * @param {string} filename - Name of the CSV file (without extension)
 * @returns {void} - Triggers download
 */
export const exportToCSV = (products, filename = 'productos') => {
  try {
    if (!products || products.length === 0) {
      alert('No hay productos para exportar')
      return
    }

    // Define CSV headers
    const headers = [
      'ID', 'Código', 'Nombre', 'Descripción', 'Categoría', 'Subcategoría',
      'Unidad de Medida', 'Precio de Costo', 'Precio de Venta', 'Stock Actual',
      'Stock Mínimo', 'Stock Máximo', 'Activo', 'Fecha de Creación', 'Fecha de Actualización'
    ]

    // Prepare data
    const csvData = products.map(product => [
      product.id || '',
      product.codigo || '',
      product.nombre || '',
      product.descripcion || '',
      product.categoria || '',
      product.subcategoria || '',
      product.unidadMedida || '',
      product.precioCosto ? parseFloat(product.precioCosto) : 0,
      product.precioVenta ? parseFloat(product.precioVenta) : 0,
      product.stockActual || 0,
      product.stockMinimo || 0,
      product.stockMaximo || 0,
      product.activo ? 'Sí' : 'No',
      product.fechaCreacion || '',
      product.fechaActualizacion || ''
    ])

    // Combine headers and data
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

  } catch (error) {
    console.error('Error exporting to CSV:', error)
    alert('Error al exportar a CSV: ' + error.message)
  }
}

export default {
  exportToExcel,
  exportToCSV
}