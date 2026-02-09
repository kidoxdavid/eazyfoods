import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Package, MapPin, Clock, CheckCircle, Navigation } from 'lucide-react'
import SortableTable from '../components/SortableTable'

const MyDeliveries = () => {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    try {
      const response = await api.get('/driver/deliveries')
      setDeliveries(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (deliveryId, status) => {
    try {
      await api.put(`/driver/deliveries/${deliveryId}/status`, { status })
      alert(`Status updated to ${status}`)
      fetchDeliveries()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update status')
    }
  }

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

  const columns = [
    { key: 'order_number', label: 'Order #', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value)}`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'delivery_address',
      label: 'Delivery Address',
      sortable: false,
      render: (value) => (
        <div className="text-sm">
          <div>{value?.street}</div>
          <div className="text-gray-500">{value?.city}, {value?.state}</div>
        </div>
      )
    },
    {
      key: 'driver_earnings',
      label: 'Earnings',
      sortable: true,
      render: (value) => (
        <div className="font-medium text-green-600">${parseFloat(value || 0).toFixed(2)}</div>
      )
    },
    {
      key: 'estimated_delivery_time',
      label: 'Est. Delivery',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleString() : 'N/A'
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2 flex-wrap">
          {['accepted', 'picked_up', 'in_transit'].includes(row.status) && (
            <button
              onClick={() => navigate(`/deliveries/${row.id}/track`)}
              className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 flex items-center gap-1"
            >
              <Navigation className="h-3 w-3" />
              Track
            </button>
          )}
          {row.status === 'accepted' && (
            <button
              onClick={() => handleUpdateStatus(row.id, 'picked_up')}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              Mark Picked Up
            </button>
          )}
          {row.status === 'picked_up' && (
            <button
              onClick={() => handleUpdateStatus(row.id, 'in_transit')}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              Start Delivery
            </button>
          )}
          {row.status === 'in_transit' && (
            <button
              onClick={() => handleUpdateStatus(row.id, 'delivered')}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Mark Delivered
            </button>
          )}
        </div>
      )
    }
  ]

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
        <h1 className="text-3xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-gray-600 mt-1">Track your active and completed deliveries</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No deliveries yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <SortableTable columns={columns} data={deliveries} />
        </div>
      )}
    </div>
  )
}

export default MyDeliveries

