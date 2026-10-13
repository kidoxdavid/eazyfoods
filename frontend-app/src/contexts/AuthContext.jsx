import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Login-free identity provider.
 *
 * Authentication is disabled for now: there is no sign-in, no token and no route guard.
 * The API resolves the acting customer on its own (see app/api/v1/dependencies.py).
 * This provider keeps the old `useAuth()` shape so existing components keep working,
 * and exposes `token` as a truthy constant so legacy `token ? ... : ...` checks pass.
 */
const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const PLACEHOLDER = { first_name: 'Guest', last_name: 'Shopper', email: 'guest@eazyfoods.local' }
const noop = async () => ({ success: true })

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(PLACEHOLDER)

  useEffect(() => {
    let cancelled = false
    api.get('/customer/me', { timeout: 10000 })
      .then((res) => { if (!cancelled && res.data) setUser({ ...PLACEHOLDER, ...(res.data.data || res.data) }) })
      .catch(() => { /* keep placeholder */ })
    return () => { cancelled = true }
  }, [])

  const value = {
    user,
    token: 'no-auth',
    loading: false,
    isAuthenticated: true,
    login: noop,
    loginWithGoogle: noop,
    signup: noop,
    register: noop,
    logout: () => {},
    guest: false,
    enterGuestMode: () => {},
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
