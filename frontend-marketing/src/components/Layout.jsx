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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo - same as vendor: blue bar, white text */}
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">eazyfoods Marketing</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200 p-1 rounded-md transition-colors"
              type="button"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                  className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Marketing Portal</span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

