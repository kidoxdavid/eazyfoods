import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Upload, X } from 'lucide-react'

const ProductForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [stores, setStores] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sale_price: '',
    category_id: '',
    sku: '',
    barcode: '',
    unit: 'piece',
    stock_quantity: 0,
    low_stock_threshold: 10,
    expiry_date: '',
    track_expiry: false,
    status: 'active',
    is_featured: false,
    is_newly_stocked: false,
    slug: '',
    image_url: '',
    images: [],
    store_id: '',  // Store selection
  })
  const [additionalImages, setAdditionalImages] = useState([''])
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingAdditional, setUploadingAdditional] = useState({})

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories/list')
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchStores = async () => {
    try {
      const response = await api.get('/vendor/stores')
      const storesData = response.data || []
      setStores(storesData)
      
      // Auto-select store if there's only one store (for both new and edit)
      if (storesData.length === 1) {
        const singleStore = storesData[0]
        setFormData(prev => ({ ...prev, store_id: singleStore.id }))
      } else if (storesData.length > 0 && !isEdit) {
        // For new products with multiple stores, set default to primary store
        const primaryStore = storesData.find(s => s.is_primary) || storesData[0]
        setFormData(prev => ({ ...prev, store_id: primaryStore.id }))
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    }
  }

  const fetchProduct = useCallback(async () => {
    if (!id) return
    
    try {
      const response = await api.get(`/products/${id}`)
      const product = response.data
      
      console.log('Fetched product data:', product)
      
      // Get store_id from product, or use default from stores if available
      let storeId = product.store_id || ''
      
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        sale_price: product.sale_price || '',
        category_id: product.category_id || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        unit: product.unit || 'piece',
        stock_quantity: product.stock_quantity || 0,
        low_stock_threshold: product.low_stock_threshold || 10,
        expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : '',
        track_expiry: product.track_expiry || false,
        status: product.status || 'active',
        is_featured: product.is_featured || false,
        is_newly_stocked: product.is_newly_stocked || false,
        slug: product.slug || '',
        image_url: product.image_url || '',
        images: product.images || [],
        store_id: storeId,
      })
      // Set additional images for editing
      if (product.images && product.images.length > 0) {
        setAdditionalImages([...product.images, ''])
      } else {
        setAdditionalImages([''])
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
      console.error('Error response:', error.response?.data)
      alert('Failed to load product data. Please try again.')
    }
  }, [id])

  useEffect(() => {
    fetchCategories()
    fetchStores()
  }, [id])

  // Fetch product when in edit mode
  useEffect(() => {
    if (isEdit && id) {
      fetchProduct()
    }
  }, [id, isEdit, fetchProduct])

  // Update store_id if product doesn't have one and stores are now loaded
  useEffect(() => {
    if (stores.length > 0 && !formData.store_id) {
      // If there's only one store, auto-select it
      if (stores.length === 1) {
        setFormData(prev => ({ ...prev, store_id: stores[0].id }))
      } else if (isEdit) {
        // For edit mode with multiple stores, try to find primary store
        const primaryStore = stores.find(s => s.is_primary) || stores[0]
        if (primaryStore) {
          setFormData(prev => ({ ...prev, store_id: primaryStore.id }))
        }
      }
    }
  }, [isEdit, stores, formData.store_id])


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    })
  }

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadingMain(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await api.post('/uploads/products', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Construct full URL - response.data.url already includes /api/v1/uploads/products/...
      const imageUrl = response.data.url.startsWith('http') 
        ? response.data.url 
        : `${window.location.origin}${response.data.url}`
      
      setFormData(prev => ({
        ...prev,
        image_url: imageUrl
      }))
    } catch (error) {
      console.error('Upload error:', error)
      alert(error.response?.data?.detail || 'Failed to upload image')
    } finally {
      setUploadingMain(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleAdditionalImageUpload = async (e, index) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadingAdditional({ ...uploadingAdditional, [index]: true })
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Construct full URL - response.data.url already includes /api/v1/uploads/products/...
      const imageUrl = response.data.url.startsWith('http') 
        ? response.data.url 
        : `${window.location.origin}${response.data.url}`
      
      const newImages = [...additionalImages]
      newImages[index] = imageUrl
      setAdditionalImages(newImages)
    } catch (error) {
      console.error('Upload error:', error)
      alert(error.response?.data?.detail || 'Failed to upload image')
    } finally {
      setUploadingAdditional({ ...uploadingAdditional, [index]: false })
      // Reset file input
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Generate slug from name if not provided
      let slug = (formData.slug || '').trim()
      if (!slug) {
        slug = (formData.name || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }

      // Collect additional images (filter out empty strings)
      const imagesArray = additionalImages.filter(url => url.trim() !== '')
      
      // Validate store_id is selected (only if there are multiple stores)
      let storeIdValue = formData.store_id
      if (stores.length > 1 && (!storeIdValue || (typeof storeIdValue === 'string' && storeIdValue.trim() === ''))) {
        alert('Please select a store')
        setLoading(false)
        return
      }
      
      // Auto-select if there's only one store
      if (stores.length === 1 && !storeIdValue) {
        storeIdValue = stores[0].id
      }

      // Validate required fields
      if (!formData.name || formData.name.trim() === '') {
        alert('Product name is required')
        setLoading(false)
        return
      }

      if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
        alert('Valid price is required')
        setLoading(false)
        return
      }

      const data = {
        ...formData,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
        expiry_date: formData.expiry_date || null,
        track_expiry: formData.track_expiry || false,
        slug: slug,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        images: imagesArray.length > 0 ? imagesArray : null,
        store_id: storeIdValue || null, // Use the validated/auto-selected store_id
      }

      // Remove empty strings and convert to null (except required fields)
      Object.keys(data).forEach(key => {
        // Don't set required fields to null
        if (key !== 'store_id' && key !== 'price' && key !== 'name' && data[key] === '') {
          data[key] = null
        }
      })

      if (isEdit) {
        // For updates, only send fields that have changed or are being explicitly set
        // Don't send price/name if they're the same or invalid
        const updateData = {}
        Object.keys(data).forEach(key => {
          // Always include required fields if they're valid
          if (key === 'price' && data[key] && !isNaN(data[key]) && data[key] > 0) {
            updateData[key] = data[key]
          } else if (key === 'name' && data[key] && data[key].trim() !== '') {
            updateData[key] = data[key]
          } else if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
            // Include other fields that have values
            updateData[key] = data[key]
          }
        })
        await api.put(`/products/${id}`, updateData)
      } else {
        await api.post('/products/', data)
      }
      navigate('/products')
    } catch (error) {
      console.error('Product save error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save product'
      alert(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={() => navigate('/products')}
          className="text-gray-600 hover:text-gray-900 p-1"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {isEdit ? 'Update product information' : 'Create a new product listing'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input
              type="number"
              step="0.01"
              name="price"
              required
              value={formData.price}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Sale Price</label>
            <input
              type="number"
              step="0.01"
              name="sale_price"
              value={formData.sale_price}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {stores.length > 1 ? (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Store *</label>
              <select
                name="store_id"
                required
                value={formData.store_id}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : stores.length === 1 ? (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Store</label>
              <div className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {stores[0].name} {stores[0].is_primary ? '(Primary)' : ''}
              </div>
              <input type="hidden" name="store_id" value={stores[0].id} />
            </div>
          ) : null}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="piece">Piece</option>
              <option value="kg">Kilogram</option>
              <option value="g">Gram</option>
              <option value="litre">Litre</option>
              <option value="pack">Pack</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Main Product Image
            </label>
            <div className="space-y-2">
              {/* File Upload */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <label className="flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-600" />
                  <span className="text-gray-700">
                    {uploadingMain ? 'Uploading...' : 'Upload from Computer'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    disabled={uploadingMain}
                    className="hidden"
                  />
                </label>
                <span className="text-xs sm:text-sm text-gray-500 self-center hidden sm:inline">or</span>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="Enter image URL"
                  className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              {/* Preview */}
              {formData.image_url && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={formData.image_url}
                    alt="Product preview"
                    className="h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-lg border border-gray-300"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
              Upload an image from your computer or enter a URL to an image hosted online
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Additional Product Images
            </label>
            {additionalImages.map((url, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                {/* Upload Button */}
                <label className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex-shrink-0">
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 text-gray-600" />
                  <span className="text-gray-700">
                    {uploadingAdditional[index] ? '...' : 'Upload'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAdditionalImageUpload(e, index)}
                    disabled={uploadingAdditional[index]}
                    className="hidden"
                  />
                </label>
                
                {/* URL Input */}
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const newImages = [...additionalImages]
                    newImages[index] = e.target.value
                    setAdditionalImages(newImages)
                  }}
                  placeholder="Enter image URL or upload"
                  className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                
                {/* Preview */}
                {url && (
                  <div className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Additional ${index + 1}`}
                      className="h-12 w-12 sm:h-16 sm:w-16 object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = [...additionalImages]
                        newImages[index] = ''
                        setAdditionalImages(newImages)
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  </div>
                )}
                
                {/* Add/Remove Buttons */}
                <div className="flex gap-2">
                  {index === additionalImages.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setAdditionalImages([...additionalImages, ''])}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex-shrink-0"
                    >
                      + Add
                    </button>
                  )}
                  {additionalImages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = additionalImages.filter((_, i) => i !== index)
                        setAdditionalImages(newImages.length > 0 ? newImages : [''])
                      }}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex-shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
              Upload images from your computer or enter URLs. Add multiple images to showcase your product from different angles.
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Stock Quantity *
            </label>
            <input
              type="number"
              name="stock_quantity"
              required
              value={formData.stock_quantity}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Low Stock Threshold
            </label>
            <input
              type="number"
              name="low_stock_threshold"
              value={formData.low_stock_threshold}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="track_expiry"
                checked={formData.track_expiry}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Track Expiry Date</span>
            </label>
          </div>

          {formData.track_expiry && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You'll be alerted 1 month before the expiry date
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">Active</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="product-url-slug"
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-xs sm:text-sm text-gray-700">Featured Product</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_newly_stocked"
                  checked={formData.is_newly_stocked}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-xs sm:text-sm text-gray-700">Newly Stocked</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductForm

