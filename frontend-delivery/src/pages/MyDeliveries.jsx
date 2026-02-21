import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Package, MapPin, Clock, CheckCircle, Navigation, Camera, X } from 'lucide-react'
import SortableTable from '../components/SortableTable'

const MyDeliveries = () => {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [deliverModal, setDeliverModal] = useState(null) // { deliveryId, row }
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

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

  const handleMarkDeliveredClick = (row) => {
    setDeliverModal({ deliveryId: row.id, row })
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP, or GIF).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const confirmDelivered = async () => {
    if (!deliverModal) return
    if (!photoFile) {
      alert('Please take or upload a photo of the delivery as evidence.')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', photoFile)
      const uploadRes = await api.post('/uploads/delivery-proof', formData)
      const deliveryPhotoUrl = uploadRes.data?.url
      if (!deliveryPhotoUrl) throw new Error('Upload did not return URL')
      await api.put(`/driver/deliveries/${deliverModal.deliveryId}/status`, {
        status: 'delivered',
        delivery_photo_url: deliveryPhotoUrl
      })
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
      alert('Delivery marked as delivered. Thank you!')
      setDeliverModal(null)
      setPhotoFile(null)
      setPhotoPreview(null)
      fetchDeliveries()
    } catch (error) {
      alert(error.response?.data?.detail || error.message || 'Failed to update. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateStatus = async (deliveryId, status) => {
    if (status === 'delivered') {
      const row = deliveries.find(d => d.id === deliveryId)
      if (row) handleMarkDeliveredClick(row)
      return
    }
    try {
      await api.put(`/driver/deliveries/${deliveryId}/status`, { status })
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
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
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" />
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Active and completed deliveries</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 text-center">
          <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-600">No deliveries yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <SortableTable columns={columns} data={deliveries} />
        </div>
      )}

      {/* Mark as delivered – photo evidence modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !uploading && setDeliverModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Proof of delivery</h3>
              <button type="button" onClick={() => !uploading && setDeliverModal(null)} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Take or upload a photo of the delivery at the customer&apos;s location as evidence.
            </p>
            <div className="space-y-4">
              {photoPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={photoPreview} alt="Delivery proof" className="w-full h-48 object-contain" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Tap to take photo or choose image</p>
                  <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP or GIF, max 5MB</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !uploading && setDeliverModal(null)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelivered}
                  disabled={!photoFile || uploading}
                  className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading…' : 'Confirm delivered'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyDeliveries

