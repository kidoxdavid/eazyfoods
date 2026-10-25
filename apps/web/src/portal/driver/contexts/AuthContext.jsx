import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { makeHttp } from '../../http'
import api from '../services/api'

const AuthContext = createContext()
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
const { raw } = makeHttp('driver')

/** The driver window has its own sign-in; this reads it and shapes the driver the way the original portal expects. */
export const AuthProvider = ({ children }) => {
  const [driver, setDriver] = useState(null)
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try {
      const me = await raw('GET', '/auth/me')
      if (!me) { setAccount(null); setDriver(null); return }
      setAccount(me)
      const d = await api.get('/driver/me').then((r) => r.data).catch(() => null)
      setDriver(d ? { ...d, email: d.email || me.email } : null)
    } catch { setAccount(null); setDriver(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const logout = async () => { await raw('POST', '/auth/logout', {}).catch(() => {}); window.location.href = '/driver/signin' }
  return <AuthContext.Provider value={{ driver, account, token: account ? 'session' : null, loading, isAuthenticated: !!account, refreshDriver: load, logout }}>{children}</AuthContext.Provider>
}
