import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [token, setToken]   = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [guest, setGuest]   = useState(() => localStorage.getItem('guest_mode') === '1')

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
    localStorage.removeItem('guest_mode')
    if (r.data.customer_id) localStorage.setItem('customer_id', r.data.customer_id)
    setToken(t)
    setGuest(false)
    setUser(r.data.user || r.data)
    return r.data
  }

  const register = async (name, email, password) => {
    // Split "First Last" into separate fields the API expects
    const parts = name.trim().split(/\s+/)
    const first_name = parts[0]
    const last_name = parts.slice(1).join(' ') || '.'
    const r = await api.post('/customer/auth/signup', { first_name, last_name, email, password })

    // If SMTP isn't configured, the API returns a verification_link.
    // Auto-verify so the user can log in immediately.
    if (r.data?.verification_link) {
      try {
        const url = new URL(r.data.verification_link)
        const verifyToken = url.searchParams.get('token')
        if (verifyToken) {
          await api.get(`/customer/auth/verify-email?token=${verifyToken}`)
        }
      } catch (_) {}
    }

    return login(email, password)
  }

  const enterGuestMode = () => {
    localStorage.setItem('guest_mode', '1')
    setGuest(true)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('customer_id')
    localStorage.removeItem('guest_mode')
    setToken(null)
    setUser(null)
    setGuest(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, guest, login, register, logout, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
