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
  const [driver, setDriver] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('driver_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      // Safety timeout - always set loading to false after 15 seconds max
      const safetyTimeout = setTimeout(() => {
        setLoading(false)
      }, 15000)

      try {
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          await fetchDriver()
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

  const fetchDriver = async () => {
    try {
      // Add timeout to prevent hanging
      const response = await api.get('/driver/me', { timeout: 10000 })
      setDriver(response.data)
    } catch (error) {
      console.error('Failed to fetch driver:', error)
      // Only clear token on auth errors, not network errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        setToken(null)
        localStorage.removeItem('driver_token')
        localStorage.removeItem('driver_id')
      }
      setDriver(null)
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async (idToken) => {
    const response = await api.post('/driver/auth/google', { id_token: idToken })
    const { access_token, driver_id } = response.data
    setToken(access_token)
    localStorage.setItem('driver_token', access_token)
    localStorage.setItem('driver_id', driver_id)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    await fetchDriver()
    return response.data
  }

  const login = async (email, password) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)

    const response = await api.post('/driver/auth/login', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const { access_token, driver_id } = response.data
    setToken(access_token)
    localStorage.setItem('driver_token', access_token)
    localStorage.setItem('driver_id', driver_id)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

    await fetchDriver()
    return response.data
  }

  const logout = () => {
    setToken(null)
    setDriver(null)
    localStorage.removeItem('driver_token')
    localStorage.removeItem('driver_id')
    delete api.defaults.headers.common['Authorization']
  }

  const refreshDriver = async () => {
    if (token) {
      await fetchDriver()
    }
  }

  const value = {
    driver,
    token,
    login,
    loginWithGoogle,
    logout,
    loading,
    refreshDriver,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

