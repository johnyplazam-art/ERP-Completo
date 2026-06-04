import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
import { saveAs } from 'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js'

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the output file
 * @param {string} sheetName - Name of the worksheet (optional)
 */
export const exportToExcel = (data, filename = 'export.xlsx', sheetName = 'Sheet1') => {
  try {
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data)
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    
    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    
    // Save file
    saveAs(new Blob([wbout], {type: 'application/octet-stream'}), filename)
    
    return true
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return false
  }
}

/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the output file
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  try {
    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(data))
    
    // Save file
    saveAs(new Blob([csv], {type: 'text/csv;charset=utf-8;'}), filename)
    
    return true
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    return false
  }
}