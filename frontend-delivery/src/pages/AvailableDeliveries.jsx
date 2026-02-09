import { useEffect, useState } from 'react'
import api from '../services/api'
import { MapPin, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react'
import SortableTable from '../components/SortableTable'

const AvailableDeliveries = () => {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeliveries()
    const interval = setInterval(fetchDeliveries, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDeliveries = async () => {
    try {
      const response = await api.get('/driver/available-orders')
      setDeliveries(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (orderId) => {
    if (!confirm('Accept this delivery?')) return
    try {
      await api.post(`/driver/deliveries/${orderId}/accept`, {
        estimated_pickup_time: new Date(Date.now() + 15 * 60000).toISOString(),
        estimated_delivery_time: new Date(Date.now() + 45 * 60000).toISOString()
      })
      alert('Delivery accepted! Check My Deliveries.')
      fetchDeliveries()
    } catch (error) {
      const detail = error.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e) => e.msg || e.loc?.join('.')).join(', ') : 'Failed to accept delivery'
      alert(msg || error.message || 'Failed to accept delivery')
    }
  }

  const handleReject = async (orderId) => {
    if (!confirm('Decline this delivery? It will stay available for other drivers.')) return
    try {
      await api.post(`/driver/deliveries/${orderId}/reject`)
      fetchDeliveries()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to decline')
    }
  }

  const columns = [
    { key: 'order_number', label: 'Order #', sortable: true },
    { 
      key: 'vendor_name', 
      label: 'Vendor', 
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'delivery_address',
      label: 'Delivery Address',
      sortable: false,
      render: (value) => (
        <div className="text-sm">
          <div>{value?.street}</div>
          <div className="text-gray-500">{value?.city}, {value?.state} {value?.postal_code}</div>
        </div>
      )
    },
    {
      key: 'delivery_fee',
      label: 'Earnings',
      sortable: true,
      render: (value) => (
        <div className="font-medium text-green-600">${parseFloat(value * 0.8).toFixed(2)}</div>
      )
    },
    {
      key: 'ready_at',
      label: 'Ready At',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleString() : 'N/A'
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAccept(row.id)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Accept
          </button>
          <button
            onClick={() => handleReject(row.id)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
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
        <h1 className="text-3xl font-bold text-gray-900">Available Deliveries</h1>
        <p className="text-gray-600 mt-1">Accept new delivery orders</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No available deliveries at the moment</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <SortableTable columns={columns} data={deliveries} />
        </div>
      )}
    </div>
  )
}

export default AvailableDeliveries

