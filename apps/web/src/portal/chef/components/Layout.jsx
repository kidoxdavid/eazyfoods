import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { makeHttp } from '../../http'
import {
  Receipt,
  LayoutDashboard,
  Menu,
  X,
  User,
  Star,
  Settings as SettingsIcon,
  ChefHat,
  Image as ImageIcon,
  BarChart3,
  MessageSquare,
  MessageCircle,
  Megaphone,
  UtensilsCrossed,
  ShoppingCart,
  Tag,
  DollarSign,
  FileText,
  Store,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react'

const { raw } = makeHttp('vendor')

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, loading: authLoading, logout } = useAuth()
  // Admins can hide menu items and post a notice for this area (Control centre).
  const [cfg, setCfg] = useState(null)
  const [badges, setBadges] = useState({})
  useEffect(() => { const load = () => raw('GET', '/vendor/badges').then(setBadges).catch(() => {}); load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])
  useEffect(() => { raw('GET', '/portal-config/vendor').then(setCfg).catch(() => {}) }, [])
  const { ordersCount, newOrderAlert, dismissNewOrderAlert } = useNotifications()

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Profile', href: '/profile', icon: ChefHat },
    { name: 'Documentation', href: '/documentation', icon: FileText },
    { name: 'Cuisines', href: '/cuisines', icon: UtensilsCrossed },
    { name: 'Orders', href: ordersCount > 0 ? '/orders?status=new' : '/orders', icon: ShoppingCart, badge: ordersCount },
    { name: 'Promotions', href: '/promotions', icon: Tag },
    { name: 'Gallery', href: '/gallery', icon: ImageIcon },
    { name: 'Storefront', href: '/storefront', icon: Store },
    { name: 'Questions', href: '/questions', icon: HelpCircle, badge: badges['/vendor/questions'] },
    { name: 'Reviews', href: '/reviews', icon: Star },
    { name: 'Ads', href: '/ads', icon: Megaphone },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Payouts', href: '/payouts', icon: DollarSign },
    { name: 'Statement', href: '/statement', icon: Receipt },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Support', href: '/support', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ]

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo / header - same as vendor: enough height and padding so not compressed */}
          <div className="relative flex items-center justify-center min-h-[4rem] py-4 px-4 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 44px)', paddingBottom: '1rem' }}>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate text-center">eazyfoods Chef</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-2 top-[50%] -translate-y-1/2 lg:hidden text-white hover:text-gray-200 p-1 rounded-md transition-colors w-8 h-8 flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Navigation - scroll so user section stays visible */}
          <nav className="flex-1 px-2 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto min-h-0">
            {navigation.filter((item) => !(cfg?.hidden_nav || []).includes('/vendor' + (item.href === '/' ? '' : item.href.split('?')[0]))).map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <Icon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-700 text-white text-xs font-bold rounded-full min-w-[20px] text-center animate-pulse flex-shrink-0">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User section - match vendor: always visible at bottom, clear Logout */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="flex items-center px-3 sm:px-4 py-2 mb-2">
              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0 ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                  {user?.chef_name || 'Chef'}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <a href="/" className="block px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-primary-700">← Back to the shop</a>
            <button onClick={logout} className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-700 hover:bg-red-50 rounded-lg">Sign out</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 44px)' }}>
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="flex-1" />
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">
              {user?.chef_name || 'Chef Portal'}
            </span>
          </div>
        </header>

        {cfg?.notice && (
          <div role="note" className={`px-4 py-2 text-xs sm:text-sm border-b ${cfg.notice_tone === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-primary-50 border-primary-100 text-primary-800'}`}>{cfg.notice}</div>
        )}
        {user?.acting_vendor && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-3">
            <span>Admin mode: you are viewing this portal as {user.chef_name || 'a kitchen'}.</span>
            <button className="font-semibold underline" onClick={async () => { await fetch('/api/admin/control/act-as', { method: 'DELETE', credentials: 'include', headers: { 'x-area': 'vendor' } }).catch(() => {}); window.location.href = '/admin/vendors' }}>Exit and go back to admin</button>
          </div>
        )}
        {/* Pending approval */}
        {user && user.verification_status !== 'verified' && (
          <div className="px-4 py-2 text-xs sm:text-sm bg-amber-50 border-b border-amber-200 text-amber-900" role="status">
            {user.application_status === 'draft' ? 'Finish setting up and submit your application. The checklist on your dashboard shows what is left.'
              : user.application_status === 'submitted' ? 'Your application is being reviewed. We will tell you as soon as you are approved.'
              : 'Your account is not active. Contact EAZyfoods support.'}
          </div>
        )}
        {/* New order toast */}
        {newOrderAlert && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-primary-600 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
            <span className="font-medium">New order received!</span>
            <button onClick={dismissNewOrderAlert} className="text-white/90 hover:text-white text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Page content - responsive padding and overflow for tables on mobile */}
        <main className="p-3 sm:p-4 lg:p-6 max-w-full overflow-x-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

