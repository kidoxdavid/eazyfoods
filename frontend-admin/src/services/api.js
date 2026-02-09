import axios from 'axios'

// Allow overriding API URL via environment variable or localStorage
// For sharing/testing: Set window.API_BASE_URL or localStorage.setItem('API_BASE_URL', 'https://your-ngrok-url.ngrok.io/api/v1')
const getApiBaseURL = () => {
  // Check localStorage first (for easy testing)
  const stored = localStorage.getItem('API_BASE_URL')
  if (stored) {
    console.log('[API] Using localStorage API_BASE_URL:', stored)
    return stored
  }
  
  // Check window variable (for runtime override)
  if (window.API_BASE_URL) {
    console.log('[API] Using window.API_BASE_URL:', window.API_BASE_URL)
    return window.API_BASE_URL
  }
  
  // Check environment variable (for build-time)
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[API] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // Default: use proxy (for local development)
  const defaultURL = '/api/v1'
  console.log('[API] Using default proxy URL:', defaultURL)
  return defaultURL
}

// Get the base URL and log it
const baseURL = getApiBaseURL()
console.log('[API] Initialized with baseURL:', baseURL)

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000, // 10 second timeout
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

