import { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Edit, Trash2, MapPin, Clock, CheckCircle, XCircle, Star } from 'lucide-react'

const Stores = () => {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStore, setEditingStore] = useState(null)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    setLoading(true)
    try {
      const response = await api.get('/stores/')
      setStores(response.data || [])
    } catch (error) {
      console.error('Failed to fetch stores:', error)
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (storeId) => {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone if there are active orders.')) return
    
    try {
      await api.delete(`/stores/${storeId}`)
      fetchStores()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete store')
    }
  }

  const handleToggleActive = async (storeId, currentStatus) => {
    try {
      await api.put(`/stores/${storeId}`, {
        is_active: !currentStatus
      })
      fetchStores()
    } catch (error) {
      alert('Failed to update store status')
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Stores</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your store locations</p>
        </div>
        <button
          onClick={() => {
            setEditingStore(null)
            setShowModal(true)
          }}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          Add Store
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <MapPin className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-500 text-base sm:text-lg font-medium">No stores yet</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-2">Add your first store location to get started</p>
          <button
            onClick={() => {
              setEditingStore(null)
              setShowModal(true)
            }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm sm:text-base"
          >
            Add Your First Store
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {stores.map((store) => (
            <div key={store.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{store.name}</h3>
                    {store.is_primary && (
                      <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-primary-100 text-primary-800 rounded-full flex-shrink-0">
                        Primary
                      </span>
                    )}
                  </div>
                  {store.store_code && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Code: {store.store_code}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {store.is_active ? (
                    <span className="px-2 py-1 text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-1 text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Inactive</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{store.street_address}, {store.city}, {store.state} {store.postal_code}</span>
                </div>
                {store.phone && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span>📞 {store.phone}</span>
                  </div>
                )}
                {store.average_rating > 0 && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current flex-shrink-0" />
                    <span className="text-gray-700">{store.average_rating.toFixed(1)}</span>
                    <span className="text-gray-500">({store.total_reviews} reviews)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 flex-wrap">
                {store.pickup_available && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] sm:text-xs">Pickup</span>
                )}
                {store.delivery_available && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-[10px] sm:text-xs">Delivery</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 sm:pt-4 border-t border-gray-200 flex-wrap">
                <button
                  onClick={() => {
                    setEditingStore(store)
                    setShowModal(true)
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(store.id, store.is_active)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-1 ${
                    store.is_active
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-300 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                  }`}
                >
                  {store.is_active ? (
                    <>
                      <XCircle className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(store.id)}
                  className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <StoreModal
          store={editingStore}
          onClose={() => {
            setShowModal(false)
            setEditingStore(null)
          }}
          onSuccess={fetchStores}
        />
      )}
    </div>
  )
}

const StoreModal = ({ store, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: store?.name || '',
    store_code: store?.store_code || '',
    description: store?.description || '',
    street_address: store?.street_address || '',
    city: store?.city || '',
    state: store?.state || '',
    postal_code: store?.postal_code || '',
    country: store?.country || 'United States',
    phone: store?.phone || '',
    email: store?.email || '',
    pickup_available: store?.pickup_available ?? true,
    delivery_available: store?.delivery_available ?? true,
    delivery_radius_km: store?.delivery_radius_km || 5.0,
    delivery_fee: store?.delivery_fee || 0.00,
    minimum_order_amount: store?.minimum_order_amount || 0.00,
    estimated_prep_time_minutes: store?.estimated_prep_time_minutes || 30,
    is_primary: store?.is_primary || false,
    operating_hours: store?.operating_hours || {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: false }
    }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (store) {
        await api.put(`/stores/${store.id}`, formData)
      } else {
        await api.post('/stores/', formData)
      }
      onSuccess()
      onClose()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save store')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
            {store ? 'Edit Store' : 'Add New Store'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Store Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Downtown Location"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Store Code</label>
              <input
                type="text"
                value={formData.store_code}
                onChange={(e) => setFormData({ ...formData, store_code: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="DT001"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Street Address *</label>
            <input
              type="text"
              required
              value={formData.street_address}
              onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Province</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
              <input
                type="text"
                required
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Delivery Radius (km)</label>
              <input
                type="number"
                step="0.1"
                value={formData.delivery_radius_km}
                onChange={(e) => setFormData({ ...formData, delivery_radius_km: parseFloat(e.target.value) })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Delivery Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.delivery_fee}
                onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Min Order ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.minimum_order_amount}
                onChange={(e) => setFormData({ ...formData, minimum_order_amount: parseFloat(e.target.value) })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.pickup_available}
                onChange={(e) => setFormData({ ...formData, pickup_available: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-xs sm:text-sm text-gray-700">Pickup Available</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.delivery_available}
                onChange={(e) => setFormData({ ...formData, delivery_available: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-xs sm:text-sm text-gray-700">Delivery Available</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-xs sm:text-sm text-gray-700">Primary Store</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-3 sm:pt-4">
            <button
              type="submit"
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {store ? 'Update Store' : 'Create Store'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Stores

