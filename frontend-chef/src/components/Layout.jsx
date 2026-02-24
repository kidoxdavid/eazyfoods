import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import {
  LayoutDashboard,
  Menu,
  X,
  LogOut,
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
  HelpCircle,
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, loading: authLoading } = useAuth()
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
    { name: 'Reviews', href: '/reviews', icon: Star },
    { name: 'Ads', href: '/ads', icon: Megaphone },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Payouts', href: '/payouts', icon: DollarSign },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Support', href: '/support', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
    { name: 'Help', href: '/support', icon: HelpCircle },
  ]

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
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
            {navigation.map((item) => {
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
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center animate-pulse flex-shrink-0">
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
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Logout
            </button>
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

