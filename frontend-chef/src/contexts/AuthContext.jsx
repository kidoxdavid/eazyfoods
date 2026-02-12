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
      const response = await api.get('/chef/auth/me', { timeout: 10000 })
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
      if (error.response?.status === 401 || error.response?.status === 403) {
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('chef_id')
      }
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async (idToken) => {
    const response = await api.post('/chef/auth/google', { id_token: idToken })
    const { access_token, chef } = response.data
    setToken(access_token)
    localStorage.setItem('token', access_token)
    if (chef?.id) localStorage.setItem('chef_id', chef.id)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    await fetchUser()
    return response.data
  }

  const login = async (email, password) => {
    try {
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)

      const response = await api.post('/chef/auth/login', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token, chef } = response.data
      setToken(access_token)
      localStorage.setItem('token', access_token)
      if (chef?.id) {
        localStorage.setItem('chef_id', chef.id)
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      try {
        const userResponse = await api.get('/chef/auth/me')
        setUser(userResponse.data)
        setLoading(false)
      } catch (userError) {
        console.error('Failed to fetch user after login:', userError)
        setLoading(false)
      }
      
      return response.data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const signup = async (chefData) => {
    const response = await api.post('/chef/auth/signup', chefData)
    return response.data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('chef_id')
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

