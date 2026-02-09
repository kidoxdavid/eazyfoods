import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Package, Store, Tag, DollarSign, Box, ToggleLeft, ToggleRight, Edit, Save, X } from 'lucide-react'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/products/${id}`)
      const productData = response.data?.data || response.data
      if (!productData || !productData.id) {
        throw new Error('Invalid product data received')
      }
      setProduct(productData)
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        price: productData.price || 0,
        compare_at_price: productData.compare_at_price || '',
        stock_quantity: productData.stock_quantity || 0,
        is_active: productData.is_active !== undefined ? productData.is_active : true
      })
    } catch (error) {
      console.error('Failed to fetch product:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load product details'
      alert(`Error: ${errorMessage}`)
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/products/${id}`, formData)
      alert('Product updated successfully')
      setEditing(false)
      fetchProduct()
    } catch (error) {
      alert('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      await api.put(`/admin/products/${id}`, {
        is_active: !product.is_active
      })
      fetchProduct()
    } catch (error) {
      alert('Failed to update product status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Products
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-1">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleToggleActive}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  product.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {product.is_active ? (
                  <>
                    <ToggleRight className="h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4" />
                    Activate
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditing(false)
                  setFormData({
                    name: product.name,
                    description: product.description || '',
                    price: product.price,
                    compare_at_price: product.compare_at_price || '',
                    stock_quantity: product.stock_quantity,
                    is_active: product.is_active
                  })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Information</h2>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Compare At Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.compare_at_price}
                      onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value ? parseFloat(e.target.value) : '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Product Name</p>
                  <p className="font-medium text-gray-900">{product.name}</p>
                </div>
                {product.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium text-gray-900">{product.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="font-medium text-gray-900">${parseFloat(product.price).toFixed(2)}</p>
                  </div>
                  {product.compare_at_price && (
                    <div>
                      <p className="text-sm text-gray-500">Compare At Price</p>
                      <p className="font-medium text-gray-900">${parseFloat(product.compare_at_price).toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stock Quantity</p>
                  <p className="font-medium text-gray-900">{product.stock_quantity}</p>
                </div>
              </div>
            )}
          </div>

          {/* Product Image */}
          {product.image_url && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Image</h2>
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Active Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {product.is_newly_stocked && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Newly Stocked</p>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Yes
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Vendor & Category */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Vendor
                </p>
                <p className="font-medium text-gray-900">{product.vendor_name}</p>
              </div>
              {product.category_name && (
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category
                  </p>
                  <p className="font-medium text-gray-900">{product.category_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  SKU
                </p>
                <p className="font-medium text-gray-900">{product.sku}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timestamps</h2>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(product.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(product.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail

