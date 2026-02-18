import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { 
  LayoutDashboard, Megaphone, Mail, Image, BarChart3, 
  LogOut, Menu, X, FileText, Palette, Target, Users, 
  FlaskConical, Share2, Bell, Workflow, DollarSign, Settings, Shield, Utensils, Calendar
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
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone, badge: notifications.campaigns },
    { name: 'Ads', href: '/ads', icon: Image, badge: notifications.ads },
    { name: 'Email Campaigns', href: '/email-campaigns', icon: Mail },
    { name: 'Email Templates', href: '/email-templates', icon: FileText },
    { name: 'Audiences', href: '/audiences', icon: Users },
    { name: 'Segments', href: '/segments', icon: Target },
    { name: 'A/B Testing', href: '/ab-testing', icon: FlaskConical },
    { name: 'Social Media', href: '/social-media', icon: Share2 },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Automation', href: '/automation', icon: Workflow },
    { name: 'Budget', href: '/budget', icon: DollarSign, badge: notifications.budgets },
    { name: 'Recipes & Meal Plans', href: '/recipes-meal-plans', icon: Utensils },
    { name: 'Content Library', href: '/content-library', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Admin Control', href: '/admin-control', icon: Shield },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">eazyfoods Marketing</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200 p-1 rounded-md transition-colors"
              type="button"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 sm:px-4 sm:py-6 space-y-1 overflow-y-auto">
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
                  className={`flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[18px] sm:min-w-[20px] text-center animate-pulse flex-shrink-0">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 sm:p-4 border-t">
            <div className="mb-2 sm:mb-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center sm:justify-start space-x-2 px-3 sm:px-4 py-2 sm:py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs sm:text-sm font-medium"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="flex-1" />
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">Marketing Portal</span>
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

