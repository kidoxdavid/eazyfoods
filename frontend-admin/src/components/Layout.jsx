import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { 
  LayoutDashboard, Store, Users, Package, ShoppingBag, 
  LogOut, Menu, X, BarChart3, Settings, MessageSquare, MessageCircle, Star,
  Tag, Activity, Shield, Truck, MapPin, Megaphone, ScanLine, ChefHat
} from 'lucide-react'
import { useState } from 'react'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { notifications } = useNotifications()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Vendors', href: '/vendors', icon: Store, badge: notifications.pendingVendors },
    { name: 'Chefs', href: '/chefs', icon: ChefHat },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Barcode', href: '/barcode', icon: ScanLine },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Drivers', href: '/drivers', icon: Truck, badge: notifications.pendingDrivers },
    { name: 'Deliveries', href: '/deliveries', icon: MapPin },
    { name: 'Promotions', href: '/promotions', icon: Tag, badge: notifications.pendingPromotions },
    { name: 'Marketing', href: '/marketing', icon: Megaphone, badge: notifications.pendingAds },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Reviews', href: '/reviews', icon: Star },
    { name: 'Support', href: '/support', icon: MessageSquare, badge: notifications.pendingSupport },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Activity Logs', href: '/activity', icon: Activity },
    { name: 'Admin Users', href: '/admin-users', icon: Shield },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo - same as vendor: blue bar, white text */}
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">eazyfoods Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200 p-1 rounded-md transition-colors"
              type="button"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <nav className="flex-1 p-2 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              // For dashboard, exact match. For others, check if pathname starts with href
              const isActive = item.href === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
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

          <div className="p-3 sm:p-4 border-t">
            <div className="mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <p className="text-xs text-primary-600 mt-1">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700 lg:hidden"
              type="button"
              aria-label="Toggle menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1"></div>
            <div className="text-sm text-gray-600 hidden sm:block">
              {user?.first_name} {user?.last_name}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

