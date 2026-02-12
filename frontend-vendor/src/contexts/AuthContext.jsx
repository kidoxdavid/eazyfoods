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
    const initAuth = async () => {
      // Safety timeout - always set loading to false after 15 seconds max
      const safetyTimeout = setTimeout(() => {
        setLoading(false)
      }, 15000)

      try {
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          // Fetch user info with timeout
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
      // Add timeout to prevent hanging
      const response = await api.get('/vendors/me', { timeout: 10000 })
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      // Don't logout on error, just set user to null
      // The token might still be valid
      setUser(null)
      // Clear invalid token if it's an auth error
      if (error.response?.status === 401 || error.response?.status === 403) {
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('vendor_id')
        localStorage.removeItem('role')
      }
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async (idToken) => {
    const response = await api.post('/auth/google', { id_token: idToken })
    const { access_token, vendor_id, role } = response.data
    setToken(access_token)
    localStorage.setItem('token', access_token)
    localStorage.setItem('vendor_id', vendor_id)
    localStorage.setItem('role', role)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    await fetchUser()
    return response.data
  }

  const login = async (email, password) => {
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token, vendor_id, role } = response.data
      setToken(access_token)
      localStorage.setItem('token', access_token)
      localStorage.setItem('vendor_id', vendor_id)
      localStorage.setItem('role', role)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      // Fetch user info after login
      try {
        const userResponse = await api.get('/vendors/me')
        setUser(userResponse.data)
        setLoading(false)
      } catch (userError) {
        console.error('Failed to fetch user after login:', userError)
        // Don't fail login if user fetch fails, we still have the token
        setLoading(false)
      }
      
      return response.data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const signup = async (vendorData) => {
    const response = await api.post('/auth/signup', vendorData)
    return response.data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('vendor_id')
    localStorage.removeItem('role')
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

