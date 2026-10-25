import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { makeHttp } from '../../http'

const AuthContext = createContext()
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
const { raw } = makeHttp('vendor')

/** The vendor window has its own sign-in; this reads it and shapes the person like the original portal expected. */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try {
      const me = await raw('GET', '/auth/me')
      if (!me) { setUser(null); return }
      const v = await api.get('/vendors/me').then((r) => r.data).catch(() => ({}))
      setUser({ ...v, id: me.id, email: me.email, role: 'store_owner', acting_vendor: me.acting_vendor, staff_signup: me.staff_signup })
    } catch { setUser(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const logout = async () => { await raw('POST', '/auth/logout', {}).catch(() => {}); setUser(null); window.location.href = '/vendor/signin' }
  return <AuthContext.Provider value={{ user, token: user ? 'session' : null, loading, isAuthenticated: !!user, reload: load, logout }}>{children}</AuthContext.Provider>
}
