import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { LayoutDashboard, Package, MapPin, User, LogOut, Menu, X, ToggleLeft, ToggleRight, DollarSign, BarChart3, Star, MessageSquare, MessageCircle, History, Settings, FileText } from 'lucide-react'
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
    { name: 'Documentation', href: '/documentation', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop - match vendor */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - match vendor z-30, shadow-2xl */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">eazyfoods Driver</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200 p-1 rounded-md transition-colors"
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
                  {driver?.first_name} {driver?.last_name}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{driver?.email}</p>
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

      {/* Main content - match vendor */}
      <div className="lg:pl-64">
        <header className="bg-white shadow-sm sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center space-x-2 sm:space-x-4">
              {driver && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Available:</span>
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
                        <ToggleRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <span className="text-xs sm:text-sm text-green-600">On</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        <span className="text-xs sm:text-sm text-gray-400">Off</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {(driver?.document_expired || driver?.document_expiring_soon) && (
          <div className={`mx-3 mt-3 sm:mx-4 sm:mt-4 lg:mx-6 lg:mt-6 rounded-lg p-2.5 sm:p-3 flex items-center justify-between flex-wrap gap-2 ${driver?.document_expired ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="text-xs sm:text-sm">
              {driver?.document_expired
                ? 'One or more documents have expired. You have been deactivated until you resubmit.'
                : 'One or more documents expire within 14 days. Please resubmit to avoid deactivation.'}
              {driver?.expiring_document_names?.length ? ` (${driver.expiring_document_names.join(', ')})` : ''}
            </p>
            <Link to="/documentation" className="text-sm font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap">
              View & resubmit →
            </Link>
          </div>
        )}
        <main className="p-3 sm:p-4 lg:p-6 max-w-full min-w-0 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

