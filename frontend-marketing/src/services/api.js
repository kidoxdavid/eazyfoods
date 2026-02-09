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

api.updateBaseURL = (newURL) => {
  if (newURL) {
    localStorage.setItem('API_BASE_URL', newURL)
  } else {
    localStorage.removeItem('API_BASE_URL')
  }
  api.defaults.baseURL = newURL || '/api/v1'
}

api.getBaseURL = () => api.defaults.baseURL

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

