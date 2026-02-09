import axios from 'axios'

// Allow overriding API URL via localStorage (for testing/sharing)
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
console.log('[API] Initialized with baseURL:', apiBaseURL)

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000, // 30 second timeout (increased for slow queries)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Customer app: use 'token' from localStorage (customer JWT from /customer/auth/login)
const CUSTOMER_TOKEN_KEY = 'token'
const CUSTOMER_ID_KEY = 'customer_id'

// Add token to requests if available
api.interceptors.request.use((config) => {
  // Allow callers to pass token explicitly (e.g. checkout) so we use the same token as AuthContext
  const explicitToken = config.headers?.Authorization?.replace(/^Bearer\s+/i, '') || null
  const token = explicitToken || localStorage.getItem(CUSTOMER_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Log request for debugging
  console.log('[API Request]', {
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
    console.log('[API Response]', {
      url: response.config?.url,
      status: response.status,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
      dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null,
      hasProducts: !!(response.data?.products),
      productsCount: response.data?.products?.length || 0
    })
    return response
  },
  (error) => {
    // Log errors for debugging
    const errorDetails = {
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
    }
    console.error('[API Error]', errorDetails)
    
    // If it's a network error, provide more helpful message
    if (errorDetails.isNetworkError) {
      console.error('[API Error] Backend server may not be running. Please check:')
      console.error('  1. Is the backend server running on http://localhost:8000?')
      console.error('  2. Check backend terminal for errors')
      console.error('  3. Try: python3 run.py')
    }
    
    // Don't redirect to login for public endpoints (products, stores, categories, driver signup)
    const url = error.config?.url || ''
    const isPublicEndpoint = url.includes('/customer/products') || 
                            url.includes('/customer/stores') || 
                            url.includes('/customer/categories') ||
                            url.includes('/driver/auth/signup')
    
    if (error.response?.status === 401 && !isPublicEndpoint) {
      // Only redirect if we're not already on the login page
      // and if the request wasn't for /customer/me (to avoid redirect loops)
      if (!url.includes('/login') && !url.includes('/customer/me')) {
        // Use a friendlier message for auth errors (backend returns "Could not validate credentials")
        const isAuthError = error.response?.data?.detail?.toLowerCase?.().includes('credential')
        if (isAuthError) {
          error.userMessage = 'Your session has expired or the link was opened in a different browser. Please log in again.'
        }
        localStorage.removeItem(CUSTOMER_TOKEN_KEY)
        localStorage.removeItem(CUSTOMER_ID_KEY)
        // Only redirect if not already on login/signup pages
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

