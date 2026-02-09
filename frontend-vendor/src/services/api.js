import axios from 'axios'

// Allow overriding API URL via localStorage (for testing/sharing)
const getApiBaseURL = () => {
  // Check localStorage first (for easy testing)
  const stored = localStorage.getItem('API_BASE_URL')
  if (stored) return stored
  
  // Check window variable (for runtime override)
  if (window.API_BASE_URL) return window.API_BASE_URL
  
  // Check environment variable (for build-time)
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  
  // Default: use proxy (for local development)
  return '/api/v1'
}

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
const token = localStorage.getItem('token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('vendor_id')
      localStorage.removeItem('role')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

