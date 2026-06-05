import axios from 'https://cdn.jsdelivr.net/npm/axios@1.6.7/dist/axios.esm.js'

// Create axios instance with base URL from deployment
// Replace the placeholder with your actual Google Apps Script Web App URL
const api = axios.create({
  baseURL: 'https://script.google.com/macros/s/AKfycbxs0CIPDsUejIPun-vP6d8dMpI5-Ix6M7YdS5XLnh-LM2aEx_4ShDwGH9f0o-N1-DXtkQ/exec',
  timeout: 10000
})

// Request interceptor to attach JWT token from localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sias_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle 401 Unauthorized (token expired/invalid)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear token and optionally redirect to login
      localStorage.removeItem('sias_token')
      // You could dispatch an event or redirect here
      // For simplicity, we just let the error propagate
    }
    return Promise.reject(error)
  }
)

export default api