import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import {
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  Star,
  Power,
  Clock,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vendorInfo, setVendorInfo] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchVendorInfo()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Set default stats on error
      setStats({
      today_orders: 0,
      pending_orders: 0,
      low_stock_alerts: 0,
      expiring_products_count: 0,
      today_revenue: 0,
      week_revenue: 0,
      month_revenue: 0,
      average_rating: null,
      total_reviews: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchVendorInfo = async () => {
    try {
      const response = await api.get('/vendors/me')
      setVendorInfo(response.data)
    } catch (error) {
      console.error('Failed to fetch vendor info:', error)
    }
  }

  const toggleStatus = async () => {
    if (statusLoading) return
    
    setStatusLoading(true)
    try {
      const newStatus = vendorInfo.status === 'active' ? 'inactive' : 'active'
      await api.put('/vendors/me', { status: newStatus })
      setVendorInfo({ ...vendorInfo, status: newStatus })
      alert(`Store is now ${newStatus === 'active' ? 'active' : 'inactive'}. ${newStatus === 'active' ? 'Your products will be visible to customers.' : 'Your products will be hidden from customers.'}`)
    } catch (error) {
      console.error('Failed to update status:', error)
      alert(error.response?.data?.detail || 'Failed to update store status')
    } finally {
      setStatusLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  // Ensure stats is always defined
  const safeStats = stats || {
      today_orders: 0,
      pending_orders: 0,
      low_stock_alerts: 0,
      expiring_products_count: 0,
      today_revenue: 0,
      week_revenue: 0,
      month_revenue: 0,
      average_rating: null,
      total_reviews: 0
  }

  const statCards = [
    {
      title: "Today's Orders",
      value: safeStats.today_orders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Orders',
      value: safeStats.pending_orders || 0,
      icon: Package,
      color: 'bg-yellow-500',
    },
    {
      title: 'Low Stock Alerts',
      value: safeStats.low_stock_alerts || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'Expiring Products',
      value: safeStats.expiring_products_count || 0,
      icon: Clock,
      color: 'bg-orange-500',
      link: '/products?filter=expiring',
      description: 'Expiring within 1 month',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(parseFloat(safeStats.today_revenue || 0)),
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Week Revenue',
      value: formatCurrency(parseFloat(safeStats.week_revenue || 0)),
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'Month Revenue',
      value: formatCurrency(parseFloat(safeStats.month_revenue || 0)),
      icon: DollarSign,
      color: 'bg-indigo-500',
    },
  ]

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            {vendorInfo ? vendorInfo.business_name : 'Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1">
            {vendorInfo ? `${vendorInfo.city}, ${vendorInfo.state || ''}` : "Welcome back! Here's what's happening today."}
          </p>
        </div>
        
        {/* Store Status Toggle - aligned right like driver and chef */}
        {vendorInfo && (
          <div className="flex items-center justify-between space-x-3 sm:space-x-4 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <Power className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${vendorInfo.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-700">Store Status</p>
                <p className={`text-[10px] sm:text-xs ${vendorInfo.status === 'active' ? 'text-green-600' : 'text-gray-500'} truncate`}>
                  {vendorInfo.status === 'active' ? 'Active - Visible to customers' : 'Inactive - Hidden from customers'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleStatus}
              disabled={statusLoading}
              className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                vendorInfo.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'
              } ${statusLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={vendorInfo.status === 'active'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  vendorInfo.status === 'active' ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          const CardContent = (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">{stat.value}</p>
                  {stat.description && (
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{stat.description}</p>
                  )}
                </div>
                <div className={`${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-white" />
                </div>
              </div>
            </div>
          )
          
          if (stat.link) {
            return (
              <Link key={index} to={stat.link} className="block">
                {CardContent}
              </Link>
            )
          }
          
          return <div key={index}>{CardContent}</div>
        })}
      </div>

      {/* Rating Card */}
      {safeStats.average_rating && parseFloat(safeStats.average_rating) > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Store Rating</p>
              <div className="flex items-center flex-wrap gap-1 sm:gap-2 mt-2">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current flex-shrink-0" />
                <span className="text-xl sm:text-2xl font-bold text-gray-900">
                  {parseFloat(safeStats.average_rating).toFixed(1)}
                </span>
                <span className="text-xs sm:text-sm text-gray-600">
                  ({safeStats.total_reviews} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link
            to="/products/new"
            className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mb-2" />
            <p className="text-sm sm:text-base font-medium text-gray-900">Add New Product</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Create a new product listing</p>
          </Link>
          <Link
            to="/orders"
            className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mb-2" />
            <p className="text-sm sm:text-base font-medium text-gray-900">View Orders</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage incoming orders</p>
          </Link>
          <Link
            to="/inventory"
            className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors sm:col-span-2 lg:col-span-1"
          >
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mb-2" />
            <p className="text-sm sm:text-base font-medium text-gray-900">Check Inventory</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">View stock levels and alerts</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

