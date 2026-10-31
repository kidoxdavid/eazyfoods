import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { makeHttp } from '../../http'
import api from '../services/api'

const AuthContext = createContext()
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
const { raw } = makeHttp('vendor')

/** The kitchen's sign-in is the vendor window; this reads it and shapes the cook the way the original chef portal expects. */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try {
      const me = await raw('GET', '/auth/me')
      if (!me) { setUser(null); return }
      const p = await api.get('/chef/profile').then((r) => r.data).catch(() => ({}))
      setUser({ ...p, id: me.id, email: me.email, acting_vendor: me.acting_vendor })
    } catch { setUser(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const logout = async () => { await raw('POST', '/auth/logout', {}).catch(() => {}); window.location.href = '/kitchen/signin' }
  return <AuthContext.Provider value={{ user, token: user ? 'session' : null, loading, isAuthenticated: !!user, reload: load, logout }}>{children}</AuthContext.Provider>
}
