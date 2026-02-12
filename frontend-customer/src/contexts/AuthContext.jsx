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
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    // Check localStorage on mount
    const storedToken = localStorage.getItem('token')
    if (storedToken && !token) {
      setToken(storedToken)
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      // Safety timeout - always set loading to false after 15 seconds max
      const safetyTimeout = setTimeout(() => {
        setLoading(false)
      }, 15000)

      try {
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          await fetchUser()
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setLoading(false)
      } finally {
        clearTimeout(safetyTimeout)
      }
    }
    initAuth()
  }, [token])

  const fetchUser = async () => {
    try {
      // Call the /customer/me endpoint to verify token and get user data
      // Add timeout to prevent hanging
      const response = await api.get('/customer/me', { timeout: 10000 })
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      // If token is invalid, clear it and logout
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
      } else {
        // For other errors (network, timeout), still set loading to false but keep token
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async (idToken) => {
    const response = await api.post('/customer/auth/google', { id_token: idToken })
    const { access_token, customer_id } = response.data
    setToken(access_token)
    localStorage.setItem('token', access_token)
    localStorage.setItem('customer_id', customer_id)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    await fetchUser()
    return response.data
  }

  const login = async (email, password) => {
    // Use URLSearchParams for proper form-urlencoded format
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)

    const response = await api.post('/customer/auth/login', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const { access_token, customer_id } = response.data
    setToken(access_token)
    localStorage.setItem('token', access_token)
    localStorage.setItem('customer_id', customer_id)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

    await fetchUser()
    return response.data
  }

  const signup = async (customerData) => {
    const response = await api.post('/customer/auth/signup', customerData)
    return response.data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setLoading(false)
    localStorage.removeItem('token')
    localStorage.removeItem('customer_id')
    delete api.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    token,
    login,
    loginWithGoogle,
    signup,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

