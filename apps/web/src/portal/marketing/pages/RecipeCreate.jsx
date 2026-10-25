import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Plus, X, Search, Upload } from 'lucide-react'
import { resolveImageUrl } from '../utils/imageUtils'

const RecipeCreate = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [stores, setStores] = useState([])
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState([])
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    meal_type: 'breakfast',
    cuisine_type: '',
    african_region: '',
    prep_time_minutes: '',
    cook_time_minutes: '',
    servings: 1,
    difficulty: 'easy',
    instructions: '',
    nutrition_info: {},
    ingredients: [],
    store_id: ''
  })

  useEffect(() => {
    fetchStores()
    if (isEdit) {
      fetchRecipe()
    }
  }, [id])

  useEffect(() => {
    if (formData.store_id) {
      fetchProducts('', formData.store_id)
    } else {
      setProducts([])
      setFilteredProducts([])
      setShowDropdown(false)
    }
  }, [formData.store_id])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP, or GIF)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }
    setUploadingImage(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      const response = await api.post('/uploads/recipes', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const imageUrl = response.data?.url || response.data?.image_url
      if (imageUrl) {
        setFormData(prev => ({ ...prev, image_url: imageUrl }))
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(error.response?.data?.detail || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleStoreChange = (storeId) => {
    setFormData(prev => {
      const prevStore = prev.store_id
      const newStore = storeId || ''
      // Clear ingredients only when switching from one store to another (not when first selecting)
      const clearIngredients = prevStore && prevStore !== newStore
      return {
        ...prev,
        store_id: newStore,
        ingredients: clearIngredients ? [] : prev.ingredients
      }
    })
  }

  const fetchRecipe = async () => {
    try {
      const response = await api.get(`/admin/marketing/recipes/${id}`)
      const recipe = response.data
      const normalizedIngredients = (recipe.ingredients || []).map(ing => ({
        ...ing,
        product_name: ing.product_name ?? ing.product?.name ?? null,
        image_url: ing.image_url ?? ing.product?.image_url ?? null
      }))
      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        image_url: recipe.image_url || '',
        meal_type: recipe.meal_type || 'breakfast',
        cuisine_type: recipe.cuisine_type || '',
        african_region: recipe.african_region || '',
        prep_time_minutes: recipe.prep_time_minutes || '',
        cook_time_minutes: recipe.cook_time_minutes || '',
        servings: recipe.servings || 1,
        difficulty: recipe.difficulty || 'easy',
        instructions: recipe.instructions || '',
        nutrition_info: recipe.nutrition_info || {},
        ingredients: normalizedIngredients
      })
    } catch (error) {
      console.error('Failed to fetch recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStores = async () => {
    try {
      const response = await api.get('/admin/marketing/stores')
      setStores(response.data || [])
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    }
  }

  const fetchProducts = async (query = '', storeId = formData.store_id) => {
    const sid = storeId || formData.store_id
    if (!sid) {
      setProducts([])
      setFilteredProducts([])
      return
    }
    try {
      const response = await api.get('/admin/marketing/products', {
        params: { search: query || undefined, store_id: sid, limit: 50 }
      })
      const fetchedProducts = response.data || []
      console.log('Fetched products:', fetchedProducts.length, fetchedProducts)
      
      setProducts(fetchedProducts)
      // Backend already filters, so use the results directly
      if (query.trim()) {
        setFilteredProducts(fetchedProducts)
        setShowDropdown(fetchedProducts.length > 0)
      } else {
        setFilteredProducts(fetchedProducts)
        setShowDropdown(false)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      console.error('Error details:', error.response?.data || error.message)
      setFilteredProducts([])
      setShowDropdown(false)
    }
  }

  // Debounced search effect - only when store is selected
  useEffect(() => {
    if (!formData.store_id) return
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchProducts(searchQuery, formData.store_id)
      } else {
        fetchProducts('', formData.store_id)
        setShowDropdown(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, formData.store_id])

  const handleAddIngredient = (product) => {
    const newIngredient = {
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url || null,
      quantity: 1,
      unit: product.unit || 'piece',
      is_optional: false,
      notes: ''
    }
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, newIngredient]
    })
    setShowProductSearch(false)
    setSearchQuery('')
    setShowDropdown(false)
    setSelectedProductIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredProducts.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedProductIndex(prev => 
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedProductIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedProductIndex >= 0) {
      e.preventDefault()
      handleAddIngredient(filteredProducts[selectedProductIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSelectedProductIndex(-1)
    }
  }

  const handleRemoveIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    })
  }

  const handleUpdateIngredient = (index, field, value) => {
    const updated = [...formData.ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, ingredients: updated })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        image_url: formData.image_url || null,
        meal_type: formData.meal_type,
        cuisine_type: formData.cuisine_type || null,
        african_region: formData.african_region || null,
        prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
        cook_time_minutes: formData.cook_time_minutes ? parseInt(formData.cook_time_minutes) : null,
        servings: parseInt(formData.servings),
        difficulty: formData.difficulty || null,
        instructions: formData.instructions || null,
        nutrition_info: formData.nutrition_info || null,
        ingredients: formData.ingredients.map(ing => ({
          product_id: ing.product_id,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
          is_optional: ing.is_optional || false,
          notes: ing.notes || null
        }))
      }
      
      if (isEdit) {
        await api.put(`/admin/marketing/recipes/${id}`, data)
        alert('Recipe updated successfully')
      } else {
        await api.post('/admin/marketing/recipes', data)
        alert('Recipe created successfully')
      }
      navigate('/recipes')
    } catch (error) {
      alert('Failed to save recipe: ' + (error.response?.data?.detail || error.message))
    } finally {
      setSaving(false)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/recipes" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Recipes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Recipe' : 'Create Recipe'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type *</label>
            <select
              required
              value={formData.meal_type}
              onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Type</label>
            <input
              type="text"
              value={formData.cuisine_type}
              onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
              placeholder="e.g., Nigerian, Ghanaian"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">African Region</label>
            <select
              value={formData.african_region}
              onChange={(e) => setFormData({ ...formData, african_region: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Region</option>
              <option value="West Africa">West Africa</option>
              <option value="East Africa">East Africa</option>
              <option value="Central Africa">Central Africa</option>
              <option value="North Africa">North Africa</option>
              <option value="Southern Africa">Southern Africa</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Recipe Photo - Card image for customer side */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Photo</label>
          <p className="text-xs text-gray-500 mb-2">This image will show as the recipe card photo on the customer side</p>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center">
              {formData.image_url ? (
                <div className="relative w-full h-full group">
                  <img
                    src={resolveImageUrl(formData.image_url)}
                    alt="Recipe"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="h-8 w-8 text-white" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary-600 hover:border-primary-400 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <span className="text-sm">Uploading...</span>
                  ) : (
                    <>
                      <Upload className="h-8 w-8" />
                      <span className="text-xs text-center px-2">Upload photo</span>
                    </>
                  )}
                </label>
              )}
            </div>
            {!formData.image_url && !uploadingImage && (
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  Choose Image
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (minutes)</label>
            <input
              type="number"
              value={formData.prep_time_minutes}
              onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (minutes)</label>
            <input
              type="number"
              value={formData.cook_time_minutes}
              onChange={(e) => setFormData({ ...formData, cook_time_minutes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servings (1 person)</label>
            <input
              type="number"
              min="1"
              value={formData.servings}
              onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
          <textarea
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            rows="6"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Step-by-step cooking instructions..."
          />
        </div>

        {/* Store Selection - Required for Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
          <select
            value={formData.store_id}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select a store first</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.store_name || store.business_name} {store.city || store.state ? `– ${[store.city, store.state].filter(Boolean).join(', ')}` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Only ingredients (products) from this store will be available. Select a store before adding ingredients.
          </p>
        </div>

        {/* Ingredients Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
          </div>
          
          {/* Product Search with Autocomplete */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Product from Store</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={formData.store_id ? "Type to search products from this store..." : "Select a store first to search products"}
                disabled={!formData.store_id}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim()) {
                    setShowDropdown(true)
                  } else {
                    setShowDropdown(false)
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim() && filteredProducts.length > 0) {
                    setShowDropdown(true)
                  }
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Delay to allow click events on dropdown items
                  setTimeout(() => setShowDropdown(false), 200)
                }}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${!formData.store_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {/* Dropdown Autocomplete */}
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {filteredProducts.map((product, index) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddIngredient(product)}
                      className={`w-full text-left p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 flex items-center justify-between ${
                        index === selectedProductIndex ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-sm text-gray-500">${product.price} • {product.unit || 'piece'}</p>
                        {product.vendor_name && (
                          <p className="text-xs text-gray-400 mt-1">From: {product.vendor_name}</p>
                        )}
                      </div>
                      {product.image_url && (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="h-12 w-12 object-cover rounded ml-3 flex-shrink-0" 
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && searchQuery.trim() && filteredProducts.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                  <p className="text-sm text-gray-500 text-center">No products found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.store_id ? 'Products shown are from the selected store only' : 'Select a store above to add ingredients'}
            </p>
          </div>

          {/* Ingredients List */}
          <div className="space-y-3">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {(ingredient.image_url || ingredient.product?.image_url) ? (
                  <img
                    src={resolveImageUrl(ingredient.image_url || ingredient.product?.image_url)}
                    alt={ingredient.product_name || ingredient.product?.name || 'Ingredient'}
                    className="h-14 w-14 object-cover rounded-lg flex-shrink-0 bg-gray-200"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-xs">No img</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {ingredient.product_name || ingredient.product?.name || 'Unknown product'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ingredient.quantity}
                      onChange={(e) => handleUpdateIngredient(index, 'quantity', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={ingredient.unit}
                      onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="piece">piece</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                    </select>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={ingredient.is_optional}
                        onChange={(e) => handleUpdateIngredient(index, 'is_optional', e.target.checked)}
                        className="rounded"
                      />
                      Optional
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            {formData.ingredients.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No ingredients added. Click "Add Product" to get started.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || formData.ingredients.length === 0}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : isEdit ? 'Update Recipe' : 'Create Recipe'}
        </button>
      </form>
    </div>
  )
}

export default RecipeCreate

