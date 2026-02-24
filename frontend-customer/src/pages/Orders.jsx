import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Package, Clock, CheckCircle, XCircle, Sparkles, TrendingUp, Users, Navigation } from 'lucide-react'
import { formatDateTime } from '../utils/format'
import PrivateRoute from '../components/PrivateRoute'
import PageBanner from '../components/PageBanner'
import { OrderCardSkeleton } from '../components/SkeletonLoader'

const Orders = () => {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [token])

  const fetchOrders = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const response = await api.get('/customer/orders', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // API returns array directly or { orders: [...] } or { items: [...] }
      const raw = response.data
      const list = Array.isArray(raw)
        ? raw
        : (raw?.orders ?? raw?.items ?? [])
      setOrders(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      let errMsg = typeof detail === 'string' ? detail : (err?.message || 'Could not load orders')
      if (status === 401) {
        errMsg = 'Session expired. Please log in again to view your orders.'
      }
      setError(errMsg)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-primary-100 text-primary-800',
      accepted: 'bg-yellow-100 text-yellow-800',
      picking: 'bg-nude-200',
      ready: 'bg-primary-200 text-primary-800',
      picked_up: 'bg-primary-200 text-primary-800',
      delivered: 'bg-primary-300 text-primary-900',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }
  
  const getStatusTextColor = (status) => {
    if (status === 'picking') {
      return { color: '#ff6b35' } // Vibrant orange
    }
    return {}
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
      case 'picked_up':
        return <CheckCircle className="h-5 w-5" />
      case 'cancelled':
        return <XCircle className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <PrivateRoute>
        <div className="w-full">
          <PageBanner
            title="My Orders"
            subtitle="Track and manage your orders"
            icon={Package}
            placement="orders_top_banner"
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <OrderCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </PrivateRoute>
    )
  }

  const totalOrders = orders.length
  const activeOrders = orders.filter(o =>
    ['new', 'accepted', 'picking', 'ready'].includes(o.status)
  )
  const deliveredOrders = orders.filter(o =>
    ['delivered', 'picked_up'].includes(o.status)
  )
  const firstActiveOrderId = activeOrders[0]?.id

  const scrollToActiveOrder = () => {
    if (!firstActiveOrderId) return
    const el = document.getElementById(`order-${firstActiveOrderId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2')
      }, 2000)
    }
  }

  return (
    <PrivateRoute>
      <div className="w-full">
        {/* Banner Header with Ad Support */}
        <PageBanner
          title="My Orders"
          subtitle="View and track your order history"
          placement="orders_top_banner"
          defaultContent={
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  My Orders
                </h1>
              </div>
              <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
                View and track your order history. Stay updated on all your purchases!
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Track Orders</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Order History</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Quick Reorder</span>
                </div>
              </div>
            </div>
          }
        />

        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pb-3 sm:pb-8">
        {orders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-3 py-3 sm:px-4 sm:py-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
                <Package className="h-3.5 w-3.5" />
                Total orders: <span className="font-semibold">{totalOrders}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-800 font-medium">
                <Clock className="h-3.5 w-3.5" />
                Active: <span className="font-semibold">{activeOrders.length}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-800 font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                Delivered: <span className="font-semibold">{deliveredOrders.length}</span>
              </span>
            </div>
            {activeOrders.length > 0 && (
              <button
                type="button"
                onClick={scrollToActiveOrder}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              >
                Track active order
              </button>
            )}
          </div>
        )}

        {error ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={fetchOrders} className="btn-primary">
                Try again
              </button>
              {error.includes('Session expired') && (
                <Link to="/login" className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50">
                  Log in
                </Link>
              )}
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <Package className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2 text-lg">No orders yet — but your first taste of home is waiting! 🍽️</p>
            <p className="text-sm text-gray-500 mb-6">Start exploring our authentic African products and place your first order</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/groceries" className="btn-primary inline-block">
                Start Shopping
              </Link>
              <Link
                to="/top-market-deals"
                className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-semibold"
              >
                View Top Market Deals
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                id={`order-${order.id}`}
                to={`/orders/${order.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 block overflow-hidden group"
              >
                <div className="p-2 sm:p-4">
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="p-1 sm:p-1.5 bg-primary-50 rounded-md flex-shrink-0">
                            <Package className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-base font-bold text-gray-900 truncate">
                              Order #{order.order_number}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {formatDateTime(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <span className={`sm:hidden ml-auto shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 ${getStatusColor(order.status)}`} style={getStatusTextColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-3 mt-1 sm:mt-1.5 ml-0 sm:ml-9 flex-wrap">
                        <span className={`hidden sm:inline-flex px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold items-center gap-1 ${getStatusColor(order.status)}`} style={getStatusTextColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.replace('_', ' ')}</span>
                        </span>
                        <span className="text-[10px] sm:text-sm text-gray-600">
                          {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                        </span>
                        {order.delivery && order.delivery.id && 
                         ['accepted', 'picked_up', 'in_transit'].includes(order.delivery.status) && 
                         order.delivery.current_eta_minutes && (
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            ETA: {order.delivery.current_eta_minutes} min
                          </span>
                        )}
                        {order.delivery && order.delivery.id && 
                         ['accepted', 'picked_up', 'in_transit'].includes(order.delivery.status) && (
                          <Link
                            to={`/orders/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-1.5 transition-colors"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Track
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end justify-start">
                      <p className="text-sm sm:text-xl font-bold text-gray-900 leading-tight">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Total</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        </div>
      </div>
    </PrivateRoute>
  )
}

export default Orders

