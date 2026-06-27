import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState(() => localStorage.getItem('guest_mode') === '1')

  useEffect(() => {
    if (token) {
      api.get('/customer/me')
        .then(r => {
          const u = r.data?.data || r.data
          setUser(u)
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('customer_id')
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const r = await api.post('/customer/auth/login', { email, password })
    const t = r.data.access_token
    if (!t) throw new Error('No access token returned from server')
    localStorage.setItem('token', t)
    localStorage.removeItem('guest_mode')
    if (r.data.customer_id) localStorage.setItem('customer_id', r.data.customer_id)
    setToken(t)
    setGuest(false)
    // Fetch full user profile
    try {
      const me = await api.get('/customer/me')
      setUser(me.data?.data || me.data)
    } catch {
      setUser(r.data.user || r.data)
    }
    return r.data
  }

  const register = async (name, email, password) => {
    const parts = name.trim().split(/\s+/)
    const first_name = parts[0]
    const last_name = parts.slice(1).join(' ') || '.'

    // Create the account
    const r = await api.post('/customer/auth/signup', {
      first_name,
      last_name,
      email,
      password,
    })

    // Auto-verify when SMTP is not configured (backend puts link in response)
    if (r.data?.verification_link) {
      try {
        const url = new URL(r.data.verification_link)
        const tok = url.searchParams.get('token')
        if (tok) await api.get(`/customer/auth/verify-email?token=${tok}`)
      } catch (_) {
        // Not fatal — account is already created with is_email_verified=True
      }
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
