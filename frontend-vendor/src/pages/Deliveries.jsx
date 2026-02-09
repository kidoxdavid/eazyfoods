import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Truck, MapPin, Clock, Phone, Package, TrendingUp, Download, Star } from 'lucide-react'
import { formatDateTime } from '../utils/format'
import Pagination from '../components/Pagination'

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchDeliveries()
    fetchStats()
  }, [statusFilter, currentPage])

  const fetchDeliveries = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      const response = await api.get('/deliveries/', { params })
      setDeliveries(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/deliveries/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch delivery stats:', error)
    }
  }

  const handleExport = () => {
    if (!deliveries.length) {
      alert('No deliveries to export')
      return
    }
    
    const headers = ['Order #', 'Customer', 'Driver', 'Status', 'Distance (km)', 'Delivery Fee', 'Created']
    const rows = deliveries.map(d => [
      d.order_number || 'N/A',
      d.customer_name || 'N/A',
      d.driver_name || 'N/A',
      d.status || 'N/A',
      d.distance_km ? parseFloat(d.distance_km).toFixed(1) : 'N/A',
      d.delivery_fee ? `$${parseFloat(d.delivery_fee).toFixed(2)}` : 'N/A',
      d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deliveries_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusColor = (status) => {
    const colors = {
      awaiting_driver: 'bg-amber-100 text-amber-800',
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Calculate total pages based on fetched deliveries
  // Note: This assumes we're getting all deliveries. For proper pagination, 
  // the backend should return total count
  const totalPages = Math.ceil(deliveries.length / itemsPerPage) || 1

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Track and manage order deliveries</p>
        </div>
        <button
          onClick={handleExport}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Awaiting Driver</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1 sm:mt-2">{stats.awaiting_driver ?? 0}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 flex-shrink-0 ml-2" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Total Assignments</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.total_deliveries || 0}</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1 sm:mt-2">{stats.completed_deliveries || 0}</p>
              </div>
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">In Transit</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1 sm:mt-2">{stats.in_transit || 0}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500 flex-shrink-0 ml-2" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Completion Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.completion_rate || 0}%</p>
                {stats.average_delivery_time_minutes && (
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Avg: {stats.average_delivery_time_minutes} min</p>
                )}
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>
      )}

      {/* Available Drivers Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-blue-900">Driver Availability</p>
              <p className="text-[10px] sm:text-xs text-blue-700">After you mark an order Ready, it appears in Available deliveries for drivers; they accept or reject. Status updates in the Driver portal.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'awaiting_driver', 'pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'].map((status) => (
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

      {/* Deliveries - Desktop Table / Mobile Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Truck className="h-16 w-16 sm:h-24 sm:w-24 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-600 mb-2">No deliveries found</p>
            <p className="text-xs sm:text-sm text-gray-500">Delivery orders appear here after you mark them as Ready (awaiting driver, then driver-assigned)</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Delivery</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id || delivery.order_id} className="hover:bg-gray-50">
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/orders/${delivery.order_id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800"
                        >
                          {delivery.order_number || 'N/A'}
                        </Link>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{delivery.customer_name || 'N/A'}</div>
                        {delivery.customer_phone && (
                          <div className="text-xs text-gray-500">{delivery.customer_phone}</div>
                        )}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        {delivery.driver_name ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{delivery.driver_name}</div>
                            {delivery.driver_phone && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {delivery.driver_phone}
                              </div>
                            )}
                            {delivery.driver_vehicle && (
                              <div className="text-xs text-gray-500">{delivery.driver_vehicle}</div>
                            )}
                            {delivery.customer_rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-gray-600">{delivery.customer_rating}/5</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(delivery.status)}`}>
                          {delivery.status ? delivery.status.replace('_', ' ') : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {delivery.distance_km ? `${parseFloat(delivery.distance_km).toFixed(1)} km` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        {delivery.estimated_delivery_time ? (
                          <div className="text-sm text-gray-900">
                            {new Date(delivery.estimated_delivery_time).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/orders/${delivery.order_id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          View Order
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <div key={delivery.id || delivery.order_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/orders/${delivery.order_id}`}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-800"
                      >
                        Order #{delivery.order_number || 'N/A'}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(delivery.created_at)}</p>
                    </div>
                    <span className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full flex-shrink-0 ml-2 ${getStatusColor(delivery.status)}`}>
                      {delivery.status ? delivery.status.replace('_', ' ') : 'N/A'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="text-gray-900 font-medium">{delivery.customer_name || 'N/A'}</span>
                    </div>
                    {delivery.customer_phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="text-gray-900">{delivery.customer_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Driver:</span>
                      <span className="text-gray-900 font-medium">{delivery.driver_name || 'Not assigned'}</span>
                    </div>
                    {delivery.driver_phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Driver Phone:</span>
                        <span className="text-gray-900">{delivery.driver_phone}</span>
                      </div>
                    )}
                    {delivery.distance_km && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Distance:</span>
                        <span className="text-gray-900">{parseFloat(delivery.distance_km).toFixed(1)} km</span>
                      </div>
                    )}
                    {delivery.estimated_delivery_time && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Est. Delivery:</span>
                        <span className="text-gray-900">{new Date(delivery.estimated_delivery_time).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Link
                      to={`/orders/${delivery.order_id}`}
                      className="block w-full text-center px-3 py-2 text-xs sm:text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      View Order
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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

export default Deliveries

