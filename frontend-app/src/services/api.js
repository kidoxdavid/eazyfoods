import axios from 'axios'

const PRODUCTION_API_URL = 'https://eazyfoods-api.onrender.com/api/v1'

const getBaseURL = () => {
  const stored = localStorage.getItem('API_BASE_URL')
  if (stored?.startsWith('http')) return stored
  if (typeof window !== 'undefined') {
    if (window.API_BASE_URL?.startsWith('http')) return window.API_BASE_URL
    if (window.Capacitor?.isNativePlatform?.()) return PRODUCTION_API_URL
    if (['https://localhost', 'capacitor://localhost'].includes(window.location.origin))
      return PRODUCTION_API_URL
  }
  const env = import.meta.env.VITE_API_BASE_URL
  if (env?.startsWith('http')) return env
  return '/api/v1'
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) delete config.headers['Content-Type']
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    const url = err.config?.url || ''
    const isPublic = /\/(customer\/products|customer\/stores|customer\/categories|auth\/login|auth\/signup)/.test(url)
    if (err.response?.status === 401 && !isPublic) {
      localStorage.removeItem('token')
      localStorage.removeItem('customer_id')
      if (!url.includes('/login') && !url.includes('/customer/me'))
        window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
