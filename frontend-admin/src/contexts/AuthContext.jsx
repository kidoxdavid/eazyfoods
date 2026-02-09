import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('admin_token'))

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      try {
        const savedUser = localStorage.getItem('admin_user')
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      } catch (e) {
        console.error('Error loading saved user:', e)
        localStorage.removeItem('admin_user')
        localStorage.removeItem('admin_token')
      }
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    try {
      const response = await api.post('/admin/auth/login-json', {
        email,
        password
      })
      
      const { access_token, admin } = response.data
      setToken(access_token)
      setUser(admin)
      localStorage.setItem('admin_token', access_token)
      localStorage.setItem('admin_user', JSON.stringify(admin))
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      return { success: true }
    } catch (error) {
      // Check for network errors
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
        return {
          success: false,
          error: 'Cannot connect to server. Please ensure the backend server is running on port 8000.'
        }
      }
      
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Login failed'
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

