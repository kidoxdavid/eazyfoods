import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { LayoutDashboard, Package, MapPin, User, LogOut, Menu, X, ToggleLeft, ToggleRight, DollarSign, BarChart3, Star, MessageSquare, MessageCircle, History, Settings } from 'lucide-react'
import { useState } from 'react'
import api from '../services/api'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { driver, logout, refreshDriver } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { notifications } = useNotifications()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Available Deliveries', href: '/available-deliveries', icon: MapPin, badge: notifications.availableDeliveries },
    { name: 'My Deliveries', href: '/my-deliveries', icon: Package },
    { name: 'Delivery History', href: '/delivery-history', icon: History },
    { name: 'Earnings', href: '/earnings', icon: DollarSign },
    { name: 'Performance', href: '/performance', icon: BarChart3 },
    { name: 'Ratings & Reviews', href: '/ratings', icon: Star },
    { name: 'Support', href: '/support', icon: MessageSquare },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Profile', href: '/profile', icon: User },
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
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">eazyfoods Driver</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200 p-1 rounded-md transition-colors"
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
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{driver?.first_name} {driver?.last_name}</p>
              <p className="text-xs text-gray-500">{driver?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="bg-white shadow border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-4">
              {driver && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Available:</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.put('/driver/availability', null, {
                          params: { is_available: !driver.is_available }
                        })
                        // Refresh driver data to update the UI
                        await refreshDriver()
                      } catch (error) {
                        console.error('Failed to update availability:', error)
                        const errorMessage = error.response?.data?.detail || error.message || 'Failed to update availability'
                        alert(`Failed to update availability: ${errorMessage}`)
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    {driver.is_available ? (
                      <>
                        <ToggleRight className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-600">On</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-400">Off</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

