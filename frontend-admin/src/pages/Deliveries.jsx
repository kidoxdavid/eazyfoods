import { useEffect, useState } from 'react'
import api from '../services/api'
import { Search, Download, Package, Truck, MapPin } from 'lucide-react'
import Pagination from '../components/Pagination'

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all') // 'all' | 'delivery' | 'pickup'
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const filteredDeliveries = methodFilter === 'all' ? deliveries : deliveries.filter(d => (d.delivery_method || 'delivery') === methodFilter)

  useEffect(() => {
    fetchDeliveries()
    fetchStats()
  }, [statusFilter, currentPage])

  const fetchDeliveries = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (statusFilter !== 'all') params.status_filter = statusFilter
      
      const response = await api.get('/admin/deliveries', { params })
      const deliveriesData = Array.isArray(response.data) ? response.data : []
      setDeliveries(deliveriesData)
      setTotalPages(Math.ceil(deliveriesData.length / 20) || 1)
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/deliveries/stats/overview')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch delivery stats:', error)
    }
  }

  const handleExport = () => {
    if (!Array.isArray(filteredDeliveries) || filteredDeliveries.length === 0) {
      alert('No deliveries to export')
      return
    }
    
    const headers = ['Order #', 'Type', 'Driver', 'Status', 'Pickup Time', 'Delivery Time', 'Distance (km)', 'Driver Earnings']
    const rows = filteredDeliveries.map(delivery => [
      delivery.order_number || 'N/A',
      delivery.delivery_method || 'delivery',
      delivery.driver_name || 'N/A',
      delivery.status,
      delivery.actual_pickup_time ? new Date(delivery.actual_pickup_time).toLocaleString() : 'N/A',
      delivery.actual_delivery_time ? new Date(delivery.actual_delivery_time).toLocaleString() : 'N/A',
      delivery.distance_km || 'N/A',
      `$${parseFloat(delivery.driver_earnings || 0).toFixed(2)}`
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
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
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
    <div className="space-y-2 sm:space-y-3 lg:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">Track and manage deliveries</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Total Deliveries</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_deliveries}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending_deliveries}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">In Transit</p>
            <p className="text-2xl font-bold text-blue-600">{stats.in_transit}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Total Driver Earnings</p>
            <p className="text-2xl font-bold text-gray-900">${parseFloat(stats.total_driver_earnings || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-100">
          <button
            type="button"
            onClick={() => setMethodFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${methodFilter === 'all' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setMethodFilter('delivery')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${methodFilter === 'delivery' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Delivery
          </button>
          <button
            type="button"
            onClick={() => setMethodFilter('pickup')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${methodFilter === 'pickup' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Pickup
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="picked_up">Picked Up</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(filteredDeliveries) && filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{delivery.order_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 capitalize">{delivery.delivery_method || 'delivery'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.driver_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(delivery.status)}`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {delivery.actual_pickup_time 
                          ? new Date(delivery.actual_pickup_time).toLocaleString()
                          : delivery.estimated_pickup_time
                          ? new Date(delivery.estimated_pickup_time).toLocaleString()
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {delivery.actual_delivery_time 
                          ? new Date(delivery.actual_delivery_time).toLocaleString()
                          : delivery.estimated_delivery_time
                          ? new Date(delivery.estimated_delivery_time).toLocaleString()
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {delivery.distance_km ? `${parseFloat(delivery.distance_km).toFixed(1)} km` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${parseFloat(delivery.driver_earnings || 0).toFixed(2)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No deliveries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  )
}

export default Deliveries

