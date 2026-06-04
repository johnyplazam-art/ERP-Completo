// Axios instance with JWT token interceptor
import axios from 'axios'
import { useProductStore } from '../stores/productStore'

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: '/', // Base URL for our Google Apps Script web app
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from Pinia store
    const productStore = useProductStore()
    // In a real app, we would get the token from auth store or localStorage
    // For now, we'll use a mock token or none since our API doesn't require auth for product operations
    
    // If we had a token, we would attach it like this:
    // const token = localStorage.getItem('access_token') || productStore.authToken
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common error responses
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        // Unauthorized - redirect to login or refresh token
        console.error('Unauthorized access')
      } else if (error.response.status === 403) {
        // Forbidden
        console.error('Access forbidden')
      } else if (error.response.status === 404) {
        // Not found
        console.error('Resource not found')
      } else if (error.response.status >= 500) {
        // Server error
        console.error('Server error')
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server')
    } else {
      // Error in setting up request
      console.error('Request error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export default axiosInstance