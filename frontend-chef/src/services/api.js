import axios from 'axios'

const getApiBaseURL = () => {
  // Check localStorage first (for easy testing)
  const stored = localStorage.getItem('API_BASE_URL')
  if (stored) {
    // Ensure it's a relative path for proxy to work, unless it's an absolute URL
    if (stored.startsWith('http://') || stored.startsWith('https://')) {
      return stored
    }
    return stored.startsWith('/') ? stored : `/${stored}`
  }
  
  // Check window variable (for runtime override)
  if (window.API_BASE_URL) {
    if (window.API_BASE_URL.startsWith('http://') || window.API_BASE_URL.startsWith('https://')) {
      return window.API_BASE_URL
    }
    return window.API_BASE_URL.startsWith('/') ? window.API_BASE_URL : `/${window.API_BASE_URL}`
  }
  
  // Check environment variable (for build-time)
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      return envUrl
    }
    return envUrl.startsWith('/') ? envUrl : `/${envUrl}`
  }
  
  // Default: use proxy (for local development) - MUST be relative for Vite proxy to work
  return '/api/v1'
}

const apiBaseURL = getApiBaseURL()
console.log('[Chef API] Initialized with baseURL:', apiBaseURL)

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Log request for debugging
  console.log('[Chef API Request]', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
    params: config.params
  })
  
  return config
})

// Handle responses and errors
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log('[Chef API Response]', {
      url: response.config?.url,
      status: response.status,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data
    })
    return response
  },
  (error) => {
    // Log errors for debugging
    console.error('[Chef API Error]', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      isNetworkError: error.code === 'ERR_NETWORK' || error.message === 'Network Error',
      isTimeout: error.code === 'ECONNABORTED'
    })
    
    // Show user-friendly error message for network issues
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Network Error: Backend may not be running or proxy not configured correctly')
      console.error('Please check:')
      console.error('1. Is the backend server running on http://localhost:8000?')
      console.error('2. Is the Vite dev server proxy configured correctly?')
      console.error('3. Check browser console Network tab for failed requests')
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('chef_id')
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

