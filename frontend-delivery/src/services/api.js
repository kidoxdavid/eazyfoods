import axios from 'axios'

const getApiBaseURL = () => {
  const stored = localStorage.getItem('API_BASE_URL')
  if (stored) return stored
  if (window.API_BASE_URL) return window.API_BASE_URL
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  return '/api/v1'
}

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  // Login-free mode: the portal's chosen account (see components/ActingAs.jsx)
  try {
    const actingAs = localStorage.getItem('acting_as')
    if (actingAs) config.headers['X-Driver-Id'] = actingAs
  } catch { /* storage unavailable */ }
  const token = localStorage.getItem('driver_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // FormData must not have Content-Type set - browser sets multipart/form-data with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  }
)

export default api

