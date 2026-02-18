import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { 
  LayoutDashboard, Store, Users, User, Package, ShoppingBag, 
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
    { name: 'Categories', href: '/vendors/categories', icon: Tag },
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
          className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
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

          <nav className="flex-1 px-2 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = item.href === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
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

          <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center px-3 sm:px-4 py-2 mb-2">
              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0 ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{user?.email}</p>
                {user?.role && <p className="text-[10px] sm:text-xs text-primary-600 mt-0.5 truncate">{user?.role}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              type="button"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
              type="button"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="flex-1" />
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">
              {user?.first_name} {user?.last_name}
            </span>
          </div>
        </header>

        <main className="p-3 sm:p-4 lg:p-6 max-w-full overflow-x-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

