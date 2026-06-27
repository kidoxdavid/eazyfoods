import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [token, setToken]   = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.get('/customer/me')
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('token'); setToken(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const r = await api.post('/customer/auth/login', { email, password })
    const t = r.data.access_token
    localStorage.setItem('token', t)
    if (r.data.customer_id) localStorage.setItem('customer_id', r.data.customer_id)
    setToken(t)
    setUser(r.data.user || r.data)
    return r.data
  }

  const register = async (name, email, password) => {
    const r = await api.post('/customer/auth/signup', { full_name: name, email, password })
    return login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('customer_id')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
