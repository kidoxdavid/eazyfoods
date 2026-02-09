import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, Eye, Download, CheckSquare, Square, RefreshCw } from 'lucide-react'
import Pagination from '../components/Pagination'

const Orders = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrders, setSelectedOrders] = useState(new Set())
  const [bulkAction, setBulkAction] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [statusFilter, currentPage])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (statusFilter !== 'all') params.status_filter = statusFilter
      
      const response = await api.get('/admin/orders', { params })
      const ordersData = Array.isArray(response.data) ? response.data : []
      setOrders(ordersData)
      setTotalPages(Math.ceil(ordersData.length / 20) || 1)
      setSelectedOrders(new Set()) // Clear selection on page change
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setOrders([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (!Array.isArray(orders)) return
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)))
    }
  }

  const handleSelectOrder = (orderId) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleBulkAction = async () => {
    if (selectedOrders.size === 0 || !bulkAction) {
      alert('Please select orders and an action')
      return
    }

    if (!confirm(`Are you sure you want to ${bulkAction} ${selectedOrders.size} order(s)?`)) return

    try {
      const promises = Array.from(selectedOrders).map(orderId =>
        api.put(`/admin/orders/${orderId}/status`, { status: bulkAction })
      )
      await Promise.all(promises)
      alert(`Successfully updated ${selectedOrders.size} order(s)`)
      setSelectedOrders(new Set())
      setBulkAction('')
      fetchOrders()
    } catch (error) {
      alert('Failed to update orders')
    }
  }

  const handleExport = () => {
    // Simple CSV export
    if (!Array.isArray(orders)) return
    const headers = ['Order #', 'Vendor', 'Customer', 'Status', 'Total', 'Date']
    const rows = orders.map(o => [
      o.order_number,
      o.vendor_name || 'N/A',
      o.customer_name || 'N/A',
      o.status,
      `$${parseFloat(o.total_amount).toFixed(2)}`,
      new Date(o.created_at).toLocaleDateString()
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage all orders</p>
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

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="accepted">Accepted</option>
            <option value="picking">Picking</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
            <option value="picked_up">Picked Up</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        {selectedOrders.size > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">
              {selectedOrders.size} order(s) selected
            </span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select action...</option>
              <option value="accepted">Mark as Accepted</option>
              <option value="picking">Mark as Picking</option>
              <option value="ready">Mark as Ready</option>
              <option value="delivered">Mark as Delivered</option>
              <option value="cancelled">Cancel Orders</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Apply
            </button>
            <button
              onClick={() => setSelectedOrders(new Set())}
              className="px-4 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Orders Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center"
                >
                  {selectedOrders.size === orders.length && orders.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(orders) && orders.map((order) => (
              <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.has(order.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleSelectOrder(order.id)}
                    className="flex items-center"
                  >
                    {selectedOrders.has(order.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{order.vendor_name || 'N/A'}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{order.customer_name || 'N/A'}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    order.status === 'delivered' || order.status === 'picked_up' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
        </div>
      </div>

      {/* Orders Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {Array.isArray(orders) && orders.length > 0 ? (
          orders.map((order) => (
            <div key={order.id} className={`bg-white rounded-lg shadow border border-gray-200 p-4 ${selectedOrders.has(order.id) ? 'border-blue-500 bg-blue-50' : ''}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => handleSelectOrder(order.id)}
                        className="flex items-center"
                        type="button"
                      >
                        {selectedOrders.has(order.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <h3 className="text-base font-semibold text-gray-900">{order.order_number}</h3>
                    </div>
                    <p className="text-sm text-gray-500">Vendor: {order.vendor_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Customer: {order.customer_name || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                    order.status === 'delivered' || order.status === 'picked_up' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-medium text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="w-full px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200 flex items-center justify-center gap-1 mt-2"
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders

