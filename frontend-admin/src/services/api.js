import axios from 'axios'

// Allow overriding API URL via environment variable or localStorage
// For sharing/testing: Set window.API_BASE_URL or localStorage.setItem('API_BASE_URL', 'https://your-ngrok-url.ngrok.io/api/v1')
const getApiBaseURL = () => {
  const stored = localStorage.getItem('API_BASE_URL')
  if (stored) return stored
  if (window.API_BASE_URL) return window.API_BASE_URL
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  if (typeof window !== 'undefined') {
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    if (isProd) return 'https://eazyfoods-api.onrender.com/api/v1'
  }
  return '/api/v1'
}

// Get the base URL and log it
const baseURL = getApiBaseURL()
console.log('[API] Initialized with baseURL:', baseURL)

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add a method to update the base URL dynamically
api.updateBaseURL = (newURL) => {
  if (newURL) {
    localStorage.setItem('API_BASE_URL', newURL)
  } else {
    localStorage.removeItem('API_BASE_URL')
  }
  // Recreate the axios instance with new base URL
  api.defaults.baseURL = newURL || '/api/v1'
  console.log('[API] Base URL updated to:', api.defaults.baseURL)
}

// Expose a method to get current base URL
api.getBaseURL = () => {
  return api.defaults.baseURL
}

// Request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Log the full URL being requested for debugging
    console.log('[API] Request:', config.method?.toUpperCase(), config.baseURL + config.url)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('[API] Error:', error.response?.status, error.config?.url, error.message)
    
    // Handle network errors (server not reachable)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
      console.error('[API] Network Error - Cannot connect to server. Check if backend is running on port 8000')
      // Don't redirect on network errors - let the component handle it
      error.isNetworkError = true
      error.networkMessage = 'Cannot connect to server. Please ensure the backend server is running on port 8000.'
    }
    
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

