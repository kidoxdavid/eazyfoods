import { useEffect, useState } from 'react'
import api from '../services/api'
import { Package, Search, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react'

const DeliveryHistory = () => {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    fetchDeliveries()
  }, [statusFilter, dateFilter])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const response = await api.get('/driver/deliveries')
      let allDeliveries = Array.isArray(response.data) ? response.data : []
      
      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date()
        const filters = {
          today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          month: new Date(now.getFullYear(), now.getMonth(), 1),
          year: new Date(now.getFullYear(), 0, 1)
        }
        const filterDate = filters[dateFilter]
        allDeliveries = allDeliveries.filter(d => new Date(d.created_at) >= filterDate)
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        allDeliveries = allDeliveries.filter(d => d.status === statusFilter)
      }
      
      // Sort by date (newest first)
      allDeliveries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      setDeliveries(allDeliveries)
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const filteredDeliveries = deliveries.filter(d => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      d.order_number?.toLowerCase().includes(query) ||
      d.delivery_address?.street?.toLowerCase().includes(query) ||
      d.delivery_address?.city?.toLowerCase().includes(query) ||
      d.vendor_name?.toLowerCase().includes(query)
    )
  })

  const getStatusColor = (status) => {
    const colors = {
      accepted: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Delivery History</h1>
        <p className="text-gray-600 mt-1">View all your past and current deliveries</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, address, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="delivered">Delivered</option>
            <option value="in_transit">In Transit</option>
            <option value="picked_up">Picked Up</option>
            <option value="accepted">Accepted</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Deliveries Grid */}
      {filteredDeliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No deliveries found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {delivery.order_number}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(delivery.created_at)}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(delivery.status)}`}>
                  {delivery.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-3">
                {delivery.vendor_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{delivery.vendor_name}</span>
                  </div>
                )}

                {delivery.delivery_address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="text-gray-600">
                      <div>{delivery.delivery_address.street}</div>
                      <div className="text-gray-500">
                        {delivery.delivery_address.city}, {delivery.delivery_address.state}
                      </div>
                    </div>
                  </div>
                )}

                {delivery.driver_earnings && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Earnings:</span>
                    <span className="font-semibold text-green-600">
                      ${parseFloat(delivery.driver_earnings).toFixed(2)}
                    </span>
                  </div>
                )}

                {delivery.estimated_delivery_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      Est: {formatDate(delivery.estimated_delivery_time)}
                    </span>
                  </div>
                )}

                {delivery.status === 'delivered' && delivery.delivered_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-gray-600">
                      Delivered: {formatDate(delivery.delivered_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DeliveryHistory

