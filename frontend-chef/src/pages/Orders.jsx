import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { ShoppingCart, Eye, Search, X } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../utils/format'
import Pagination from '../components/Pagination'

const VALID_STATUSES = ['all', 'new', 'accepted', 'ready', 'delivered', 'cancelled']

const Orders = () => {
  const [searchParams] = useSearchParams()
  const statusFromUrl = searchParams.get('status')
  const initialStatus = VALID_STATUSES.includes(statusFromUrl) ? statusFromUrl : 'all'
  const [orders, setOrders] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    if (VALID_STATUSES.includes(statusFromUrl)) setStatusFilter(statusFromUrl)
  }, [statusFromUrl])

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  useEffect(() => {
    const onRefresh = () => fetchOrders()
    window.addEventListener('refresh-orders-list', onRefresh)
    return () => window.removeEventListener('refresh-orders-list', onRefresh)
  }, [])

  const fetchOrders = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const response = await api.get('/chef/orders/', { params })
      setAllOrders(response.data)
      setOrders(response.data)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setOrders(allOrders)
    } else {
      const filtered = allOrders.filter((o) =>
        o.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setOrders(filtered)
    }
    setCurrentPage(1)
  }, [searchQuery, allOrders])

  // Pagination
  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = orders.slice(startIndex, endIndex)

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      accepted: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      picked_up: 'bg-gray-100 text-gray-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage and fulfill customer bookings</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'new', 'accepted', 'ready', 'delivered', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
              statusFilter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Orders - Desktop Table / Mobile Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-600">No orders found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(order.created_at)}</td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/orders/${order.id}`} className="text-primary-600 hover:text-primary-900 inline-flex items-center">
                          <Eye className="h-4 w-4 xl:h-5 xl:w-5 mr-1" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {paginatedOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Order #{order.order_number}</h3>
                      <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                    </div>
                    <Link to={`/orders/${order.id}`} className="flex-shrink-0 ml-2 p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors">
                      <Eye className="h-5 w-5" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Status:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Payment:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-xs font-medium text-gray-700">Total:</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

export default Orders




