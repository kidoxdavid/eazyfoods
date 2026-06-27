import axios from 'axios'

const PROD = 'https://eazyfoods-api.onrender.com/api/v1'

// Called on EVERY request so Capacitor bridge has had time to initialize
function resolveBase() {
  try {
    const stored = localStorage.getItem('API_BASE_URL')
    if (stored?.startsWith('http')) return stored
    if (typeof window !== 'undefined') {
      // Capacitor native platform
      if (window.Capacitor?.isNativePlatform?.()) return PROD
      // Capacitor URL scheme (https://localhost or capacitor://localhost)
      const o = window.location.origin
      if (o === 'https://localhost' || o === 'capacitor://localhost' || o.startsWith('file://')) return PROD
      // Env override
      if (window.API_BASE_URL?.startsWith('http')) return window.API_BASE_URL
    }
    const env = import.meta.env?.VITE_API_BASE_URL
    if (env?.startsWith('http')) return env
    return '/api/v1'
  } catch {
    return PROD
  }
}

const api = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  // Resolve base URL per-request so Capacitor bridge is always ready
  if (!config.url?.startsWith('http')) {
    const base = resolveBase().replace(/\/$/, '')
    const path = (config.url || '').replace(/^\//, '')
    config.url = `${base}/${path}`
  }

  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) delete config.headers['Content-Type']
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    const url = err.config?.url || ''
    const isPublic = /\/(customer\/products|customer\/stores|customer\/categories|auth\/login|auth\/signup|home-products|chefs|promotions|recipes)/.test(url)
    if (err.response?.status === 401 && !isPublic && !url.includes('/customer/me')) {
      localStorage.removeItem('token')
      localStorage.removeItem('customer_id')
      if (!url.includes('/login')) window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
