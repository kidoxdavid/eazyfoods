import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Tag, Plus, Edit, Trash2, Calendar, Search, RotateCcw } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../utils/format'

const Promotions = () => {
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [activePromotionProductIds, setActivePromotionProductIds] = useState(new Set())
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promotion_type: 'discount',
    discount_type: 'percentage',
    discount_value: '',
    minimum_order_amount: '',
    applies_to_all_products: false,
    product_ids: [],
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchPromotions()
    fetchProducts()
  }, [])

  useEffect(() => {
    // Get active promotion product IDs when promotions are loaded
    if (promotions.length > 0 && products.length > 0) {
      const now = new Date()
      const activePromoIds = new Set()
      
      promotions.forEach(promo => {
        // Skip the promotion being edited
        if (editingPromotion && promo.id === editingPromotion.id) {
          return
        }
        
        const startDate = new Date(promo.start_date)
        const endDate = new Date(promo.end_date)
        const isActive = promo.is_active && now >= startDate && now <= endDate
        
        if (isActive) {
          if (promo.applies_to_all_products) {
            // If it applies to all, mark all products as unavailable
            products.forEach(p => activePromoIds.add(String(p.id)))
          } else if (promo.product_ids && promo.product_ids.length > 0) {
            promo.product_ids.forEach(productId => activePromoIds.add(String(productId)))
          }
        }
      })
      
      setActivePromotionProductIds(activePromoIds)
    }
  }, [promotions, products, editingPromotion])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/')
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const fetchPromotions = async () => {
    try {
      const response = await api.get('/promotions/')
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
        product_ids: formData.applies_to_all_products ? [] : formData.product_ids,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      }
      if (editingPromotion && isExpired(editingPromotion)) {
        data.is_active = true
      }
      if (editingPromotion) {
        await api.put(`/promotions/${editingPromotion.id}`, data)
      } else {
        await api.post('/promotions/', data)
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
        product_ids: [],
        start_date: '',
        end_date: ''
      })
      fetchPromotions()
    } catch (error) {
      console.error('Promotion creation error:', error)
      // Check if it's actually a success (sometimes response format causes false errors)
      if (error.response?.status === 201 || error.response?.status === 200) {
        // It actually succeeded, just refresh
        setShowForm(false)
        setEditingPromotion(null)
        fetchPromotions()
      } else {
        alert(`Failed to ${editingPromotion ? 'update' : 'create'} promotion: ${error.response?.data?.detail || error.message}`)
      }
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return
    try {
      await api.delete(`/promotions/${id}`)
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

  const isExpired = (promo) => {
    if (!promo.end_date) return false
    const now = new Date()
    const end = new Date(promo.end_date)
    return end < now
  }

  const getStatusDisplay = (promo) => {
    if (isActive(promo)) {
      return 'Active'
    }
    if (isExpired(promo)) {
      return 'Expired'
    }
    return promo.approval_status || 'Unknown'
  }

  const handleRenew = (promo, e) => {
    e.stopPropagation()
    const now = new Date()
    const defaultEnd = new Date(now)
    defaultEnd.setDate(defaultEnd.getDate() + 7)
    setEditingPromotion(promo)
    setProductSearch('')
    setFormData({
      name: promo.name,
      description: promo.description || '',
      promotion_type: promo.promotion_type,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value || '',
      minimum_order_amount: promo.minimum_order_amount || '',
      applies_to_all_products: promo.applies_to_all_products,
      product_ids: promo.product_ids || [],
      start_date: now.toISOString().slice(0, 16),
      end_date: defaultEnd.toISOString().slice(0, 16)
    })
    setShowForm(true)
  }

  const getStatusColor = (promo) => {
    if (isActive(promo)) {
      return 'bg-green-100 text-green-800'
    }
    if (isExpired(promo)) {
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Promotions</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Create and manage sales and discounts</p>
        </div>
        <button
          onClick={() => {
            setEditingPromotion(null)
            setProductSearch('')
            setFormData({
              name: '',
              description: '',
              promotion_type: 'discount',
              discount_type: 'percentage',
              discount_value: '',
              minimum_order_amount: '',
              applies_to_all_products: false,
              product_ids: [],
              start_date: '',
              end_date: ''
            })
            setShowForm(!showForm)
          }}
          className="w-full sm:w-auto flex items-center justify-center px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm sm:text-base"
          type="button"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          New Promotion
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            {editingPromotion ? (isExpired(editingPromotion) ? 'Renew Promotion' : 'Edit Promotion') : 'Create Promotion'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  required
                  value={formData.promotion_type}
                  onChange={(e) => setFormData({ ...formData, promotion_type: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                >
                  <option value="discount">Discount</option>
                  <option value="store_wide_sale">Store-wide Sale</option>
                  <option value="featured">Featured</option>
                  <option value="bundle">Bundle</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="all_products"
                  checked={formData.applies_to_all_products}
                  onChange={(e) => setFormData({ ...formData, applies_to_all_products: e.target.checked, product_ids: e.target.checked ? [] : formData.product_ids })}
                  className="mr-2 h-4 w-4"
                />
                <label htmlFor="all_products" className="text-xs sm:text-sm text-gray-700">
                  Apply to all products
                </label>
              </div>
              
              {!formData.applies_to_all_products && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Select Products</label>
                  {/* Search bar */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Filter products by search */}
                  {(() => {
                    const filteredProducts = products.filter(p => 
                      p.name.toLowerCase().includes(productSearch.toLowerCase())
                    )
                    const isInActivePromotion = (productId) => {
                      const productIdStr = String(productId)
                      // If editing, exclude products from the current promotion being edited
                      if (editingPromotion && editingPromotion.product_ids) {
                        const currentPromoProductIds = new Set(
                          editingPromotion.product_ids.map(id => String(id))
                        )
                        if (currentPromoProductIds.has(productIdStr)) {
                          return false // Don't grey out products from the current promotion being edited
                        }
                      }
                      return activePromotionProductIds.has(productIdStr)
                    }
                    
                    return (
                      <>
                        <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {filteredProducts.length === 0 ? (
                            <p className="text-xs sm:text-sm text-gray-500 py-2 text-center">No products found</p>
                          ) : (
                            filteredProducts.map((product) => {
                              const inActivePromo = isInActivePromotion(product.id)
                              return (
                                <label 
                                  key={product.id} 
                                  className={`flex items-center space-x-2 py-1 px-2 rounded ${
                                    inActivePromo 
                                      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                                      : 'hover:bg-gray-50 cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.product_ids.includes(product.id)}
                                    disabled={inActivePromo}
                                    onChange={(e) => {
                                      if (!inActivePromo) {
                                        if (e.target.checked) {
                                          setFormData({ ...formData, product_ids: [...formData.product_ids, product.id] })
                                        } else {
                                          setFormData({ ...formData, product_ids: formData.product_ids.filter(id => id !== product.id) })
                                        }
                                      }
                                    }}
                                    className="rounded h-3.5 w-3.5 sm:h-4 sm:w-4"
                                  />
                                  <span className={`text-xs sm:text-sm ${inActivePromo ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {product.name} - {formatCurrency(product.price)}
                                    {inActivePromo && <span className="ml-2 text-[10px] sm:text-xs text-orange-600">(In active promotion)</span>}
                                  </span>
                                </label>
                              )
                            })
                          )}
                        </div>
                        {formData.product_ids.length > 0 && (
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{formData.product_ids.length} product(s) selected</p>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingPromotion(null)
                  setProductSearch('')
                  setFormData({
                    name: '',
                    description: '',
                    promotion_type: 'discount',
                    discount_type: 'percentage',
                    discount_value: '',
                    minimum_order_amount: '',
                    applies_to_all_products: false,
                    product_ids: [],
                    start_date: '',
                    end_date: ''
                  })
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingPromotion ? (isExpired(editingPromotion) ? 'Renew & Publish' : 'Update Promotion') : 'Create Promotion'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {promotions.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Tag className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-600">No promotions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {promotions.map((promo) => (
              <div 
                key={promo.id} 
                className="p-4 sm:p-5 lg:p-6 hover:bg-gray-50 cursor-pointer border-l-4 border-transparent hover:border-primary-500 transition-colors"
                onClick={() => {
                  setEditingPromotion(promo)
                  setProductSearch('')
                  setFormData({
                    name: promo.name,
                    description: promo.description || '',
                    promotion_type: promo.promotion_type,
                    discount_type: promo.discount_type,
                    discount_value: promo.discount_value || '',
                    minimum_order_amount: promo.minimum_order_amount || '',
                    applies_to_all_products: promo.applies_to_all_products,
                    product_ids: promo.product_ids || [],
                    start_date: promo.start_date ? new Date(promo.start_date).toISOString().slice(0, 16) : '',
                    end_date: promo.end_date ? new Date(promo.end_date).toISOString().slice(0, 16) : ''
                  })
                  setShowForm(true)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{promo.name}</h3>
                      <span className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(promo)}`}>
                        {getStatusDisplay(promo)}
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{promo.description}</p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{formatDateTime(promo.start_date)} - {formatDateTime(promo.end_date)}</span>
                      </span>
                      {promo.discount_value && (
                        <span className="flex-shrink-0">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatCurrency(promo.discount_value)} off
                        </span>
                      )}
                    </div>
                    {promo.affected_products && promo.affected_products.length > 0 && (
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                        <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-2">
                          Affected Products ({promo.applies_to_all_products ? 'All Products' : promo.affected_products.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {promo.affected_products.slice(0, 5).map((product) => (
                            <span
                              key={product.id}
                              className="inline-flex items-center px-2 py-1 rounded text-[10px] sm:text-xs bg-primary-100 text-primary-700"
                            >
                              <span className="truncate max-w-[120px] sm:max-w-none">{product.name}</span>
                              {product.compare_at_price && (
                                <span className="ml-1 text-gray-500 hidden sm:inline">
                                  (${product.price.toFixed(2)} <span className="line-through">${product.compare_at_price.toFixed(2)}</span>)
                                </span>
                              )}
                            </span>
                          ))}
                          {promo.affected_products.length > 5 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] sm:text-xs bg-gray-100 text-gray-700">
                              +{promo.affected_products.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {getStatusDisplay(promo) === 'Expired' && (
                      <button
                        onClick={(e) => handleRenew(promo, e)}
                        className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-700 border border-primary-200"
                        type="button"
                        title="Renew promotion"
                      >
                        <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
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

