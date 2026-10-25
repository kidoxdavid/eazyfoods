import { useEffect, useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { Menu, X, User } from 'lucide-react'
import { call, getArea } from './client'
import { Spinner, Toasts } from './ui'

/** The original portals' sidebar and top bar, shared by the marketing and admin apps: sign-out, a link back to the shop, red pending badges, hidden menu items and a notice posted from the Control centre. */
export function useSession() {
  const [state, setState] = useState({ user: undefined })
  useEffect(() => { call('GET', '/auth/me').then((u) => setState({ user: u })).catch(() => setState({ user: null })) }, [])
  return state.user
}

export default function StaffShell({ brand, nav, badgesPath, children, titleOf }) {
  const user = useSession()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [cfg, setCfg] = useState(null)
  const [badges, setBadges] = useState({})
  const area = getArea()

  useEffect(() => { call('GET', `/portal-config/${area}`).then(setCfg).catch(() => {}) }, [area])
  useEffect(() => {
    if (!badgesPath || !user) return
    const load = () => call('GET', badgesPath).then(setBadges).catch(() => {})
    load(); const t = setInterval(load, 30000); window.addEventListener('refresh-notifications', load)
    return () => { clearInterval(t); window.removeEventListener('refresh-notifications', load) }
  }, [badgesPath, user])
  useEffect(() => { setOpen(false) }, [location.pathname])

  if (user === undefined) return <Spinner className="min-h-screen" />
  if (user === null) return <Navigate to="/signin" replace />

  const hidden = new Set(cfg?.hidden_nav || [])
  const visible = nav.filter((i) => !hidden.has(`/${area}${i.href === '/' ? '' : i.href}`))
  const isActive = (href) => (href === '/' ? location.pathname === '/' : location.pathname === href || location.pathname.startsWith(`${href}/`))
  const logout = async () => { await call('POST', '/auth/logout', {}).catch(() => {}); window.location.href = `/${area}/signin` }
  let lastGroup = null

  return (
    <div className="min-h-screen bg-gray-50">
      {open && <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-20 lg:hidden" onClick={() => setOpen(false)} />}
      <aside aria-label="Menu" className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">{brand}</h1>
            <button onClick={() => setOpen(false)} className="lg:hidden text-white hover:text-gray-200 p-1 rounded-md" aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
          <nav className="flex-1 px-2 sm:px-4 py-4 space-y-1 overflow-y-auto min-h-0">
            {visible.map((item) => {
              const Icon = item.icon
              const heading = item.group && item.group !== lastGroup ? item.group : null
              lastGroup = item.group ?? lastGroup
              const badge = item.badge ? badges[item.badge] : 0
              return (
                <div key={item.href + item.name}>
                  {heading && <p className="px-3 sm:px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide uppercase text-gray-500">{heading}</p>}
                  <Link to={item.href} className={`flex items-center justify-between px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(item.href) ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <div className="flex items-center min-w-0 flex-1"><Icon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" /><span className="truncate">{item.name}</span></div>
                    {badge > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center animate-pulse flex-shrink-0" aria-label={`${badge} waiting`}>{badge > 99 ? '99+' : badge}</span>}
                  </Link>
                </div>
              )
            })}
          </nav>
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="flex items-center px-3 sm:px-4 py-2 mb-1">
              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 flex items-center justify-center"><User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" /></div>
              <div className="flex-1 min-w-0 ml-2 sm:ml-3"><p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user.full_name}</p><p className="text-[10px] sm:text-xs text-gray-500 truncate">{user.email}</p></div>
            </div>
            <a href="/" className="block px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-primary-700">← Back to the shop</a>
            <button onClick={logout} className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-700 hover:bg-red-50 rounded-lg">Sign out</button>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="bg-white shadow-sm sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
            <button onClick={() => setOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100" aria-label="Open menu"><Menu className="h-5 w-5 sm:h-6 sm:w-6" /></button>
            <div className="flex-1" />
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[160px] sm:max-w-none">{titleOf ? titleOf(user) : user.full_name}</span>
          </div>
        </header>
        {cfg?.notice && <div role="note" className={`px-4 py-2 text-xs sm:text-sm border-b ${cfg.notice_tone === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-primary-50 border-primary-100 text-primary-800'}`}>{cfg.notice}</div>}
        <main className="p-3 sm:p-4 lg:p-6 max-w-full min-w-0"><div className="space-y-3 sm:space-y-4 lg:space-y-6">{children}</div></main>
      </div>
      <Toasts />
    </div>
  )
}
