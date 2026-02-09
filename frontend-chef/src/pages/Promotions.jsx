import { useEffect, useState } from 'react'
import api from '../services/api'
import { Tag, Plus, Edit, Trash2, Calendar } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../utils/format'

const Promotions = () => {
  const [promotions, setPromotions] = useState([])
  const [cuisines, setCuisines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promotion_type: 'discount',
    discount_type: 'percentage',
    discount_value: '',
    minimum_order_amount: '',
    applies_to_all_products: false,
    cuisine_ids: [],
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchPromotions()
    fetchCuisines()
  }, [])

  const fetchCuisines = async () => {
    try {
      const response = await api.get('/chef/cuisines/')
      setCuisines(response.data)
    } catch (error) {
      console.error('Failed to fetch cuisines:', error)
    }
  }

  const fetchPromotions = async () => {
    try {
      const response = await api.get('/chef/promotions/')
      setPromotions(response.data)
    } catch (error) {
      console.error('Failed to fetch promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        discount_value: formData.discount_value ? parseFloat(formData.discount_value) : null,
        minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : null,
        cuisine_ids: formData.applies_to_all_products ? [] : formData.cuisine_ids,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      }
      
      if (editingPromotion) {
        await api.put(`/chef/promotions/${editingPromotion.id}`, data)
      } else {
        await api.post('/chef/promotions/', data)
      }
      
      setShowForm(false)
      setEditingPromotion(null)
      setFormData({
        name: '',
        description: '',
        promotion_type: 'discount',
        discount_type: 'percentage',
        discount_value: '',
        minimum_order_amount: '',
        applies_to_all_products: false,
        cuisine_ids: [],
        start_date: '',
        end_date: ''
      })
      fetchPromotions()
    } catch (error) {
      console.error('Promotion creation error:', error)
      alert(`Failed to ${editingPromotion ? 'update' : 'create'} promotion: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return
    try {
      await api.delete(`/chef/promotions/${id}`)
      fetchPromotions()
    } catch (error) {
      alert('Failed to delete promotion')
    }
  }

  const isActive = (promo) => {
    const now = new Date()
    const start = new Date(promo.start_date)
    const end = new Date(promo.end_date)
    return promo.is_active && now >= start && now <= end
  }

  const getStatusDisplay = (promo) => {
    if (isActive(promo)) {
      return 'Active'
    }
    const now = new Date()
    const end = new Date(promo.end_date)
    if (promo.approval_status === 'approved' && end < now) {
      return 'Expired'
    }
    return promo.approval_status || promo.status || 'Unknown'
  }

  const getStatusColor = (promo) => {
    if (isActive(promo)) {
      return 'bg-green-100 text-green-800'
    }
    const now = new Date()
    const end = new Date(promo.end_date)
    if (promo.approval_status === 'approved' && end < now) {
      return 'bg-red-100 text-red-800'
    }
    if (promo.approval_status === 'pending') {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-gray-100 text-gray-800'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promotions</h1>
          <p className="text-gray-600 mt-1">Create and manage discounts for your cuisines</p>
        </div>
        <button
          onClick={() => {
            setEditingPromotion(null)
            setFormData({
              name: '',
              description: '',
              promotion_type: 'discount',
              discount_type: 'percentage',
              discount_value: '',
              minimum_order_amount: '',
              applies_to_all_products: false,
              cuisine_ids: [],
              start_date: '',
              end_date: ''
            })
            setShowForm(!showForm)
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          type="button"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Promotion
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  required
                  value={formData.promotion_type}
                  onChange={(e) => setFormData({ ...formData, promotion_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="discount">Discount</option>
                  <option value="store_wide_sale">Store-wide Sale</option>
                  <option value="featured">Featured</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="applies_to_all"
                  checked={formData.applies_to_all_products}
                  onChange={(e) => setFormData({ ...formData, applies_to_all_products: e.target.checked, cuisine_ids: [] })}
                  className="mr-2"
                />
                <label htmlFor="applies_to_all" className="text-sm text-gray-700">
                  Apply to all cuisines
                </label>
              </div>
              {!formData.applies_to_all_products && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Cuisines</label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {cuisines.map((cuisine) => (
                      <div key={cuisine.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={formData.cuisine_ids.includes(cuisine.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, cuisine_ids: [...formData.cuisine_ids, cuisine.id] })
                            } else {
                              setFormData({ ...formData, cuisine_ids: formData.cuisine_ids.filter(id => id !== cuisine.id) })
                            }
                          }}
                          className="mr-2"
                        />
                        <label className="text-sm text-gray-700">{cuisine.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingPromotion(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingPromotion ? 'Update' : 'Create'} Promotion
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promotions List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {promotions.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No promotions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {promotions.map((promo) => (
              <div key={promo.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{promo.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(promo)}`}>
                        {getStatusDisplay(promo)}
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDateTime(promo.start_date)} - {formatDateTime(promo.end_date)}
                      </span>
                      {promo.discount_value && (
                        <span>
                          {promo.discount_type === 'percentage' 
                            ? `${promo.discount_value}% off`
                            : `${formatCurrency(promo.discount_value)} off`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingPromotion(promo)
                        setFormData({
                          name: promo.name,
                          description: promo.description || '',
                          promotion_type: promo.promotion_type,
                          discount_type: promo.discount_type,
                          discount_value: promo.discount_value?.toString() || '',
                          minimum_order_amount: promo.minimum_order_amount?.toString() || '',
                          applies_to_all_products: promo.applies_to_all_products,
                          cuisine_ids: promo.cuisine_ids || [],
                          start_date: promo.start_date ? new Date(promo.start_date).toISOString().slice(0, 16) : '',
                          end_date: promo.end_date ? new Date(promo.end_date).toISOString().slice(0, 16) : ''
                        })
                        setShowForm(true)
                      }}
                      className="p-2 text-gray-600 hover:text-primary-600"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="p-2 text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Promotions




