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
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('admin_token')
    } catch (e) {
      console.error('Error accessing localStorage:', e)
      return null
    }
  })

  useEffect(() => {
    let isMounted = true
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false)
      }
    }, 15000)

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const savedUser = localStorage.getItem('admin_user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch (e) {
          console.error('Error parsing saved user:', e)
        }
      }
      setLoading(false)
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
    }
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
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
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

