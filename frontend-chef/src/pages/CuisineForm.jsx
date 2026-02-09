import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Upload, X } from 'lucide-react'

// Cuisine types: African countries (dropdown options)
const AFRICAN_CUISINE_TYPES = [
  'Algerian', 'Angolan', 'Beninese', 'Botswanan', 'Burkinabe', 'Burundian', 'Cameroonian',
  'Central African', 'Chadian', 'Comorian', 'Congolese', 'Djiboutian', 'Egyptian',
  'Equatorial Guinean', 'Eritrean', 'Eswatini', 'Ethiopian', 'Gabonese', 'Gambian',
  'Ghanaian', 'Guinean', 'Ivorian', 'Kenyan', 'Lesotho', 'Liberian', 'Libyan',
  'Madagascan', 'Malawian', 'Malian', 'Mauritanian', 'Mauritian', 'Moroccan',
  'Mozambican', 'Namibian', 'Nigerian', 'Nigerien', 'Rwandan', 'Sao Tomean',
  'Senegalese', 'Seychellois', 'Sierra Leonean', 'Somali', 'South African', 'South Sudanese',
  'Sudanese', 'Tanzanian', 'Togolese', 'Tunisian', 'Ugandan', 'Zambian', 'Zimbabwean'
].sort()

const CuisineForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    price: '',
    price_per_person: '',
    minimum_servings: 1,
    image_url: '',
    images: [],
    ingredients: [],
    allergens: [],
    spice_level: 'medium',
    prep_time_minutes: '',
    serves: 1,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    is_halal: false,
    is_kosher: false,
    status: 'active',
    is_featured: false,
    slug: '',
  })
  const [ingredientInput, setIngredientInput] = useState('')
  const [allergenInput, setAllergenInput] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAdditionalImage, setUploadingAdditionalImage] = useState(false)

  const fetchCuisine = useCallback(async () => {
    if (!id) return
    
    try {
      const response = await api.get(`/chef/cuisines/${id}`)
      const cuisine = response.data
      
      setFormData({
        name: cuisine.name || '',
        description: cuisine.description || '',
        cuisine_type: cuisine.cuisine_type || '',
        price: cuisine.price || '',
        price_per_person: cuisine.price_per_person || '',
        minimum_servings: cuisine.minimum_servings || 1,
        image_url: cuisine.image_url || '',
        images: cuisine.images || [],
        ingredients: cuisine.ingredients || [],
        allergens: cuisine.allergens || [],
        spice_level: cuisine.spice_level || 'medium',
        prep_time_minutes: cuisine.prep_time_minutes || '',
        serves: cuisine.serves || 1,
        is_vegetarian: cuisine.is_vegetarian || false,
        is_vegan: cuisine.is_vegan || false,
        is_gluten_free: cuisine.is_gluten_free || false,
        is_halal: cuisine.is_halal || false,
        is_kosher: cuisine.is_kosher || false,
        status: cuisine.status || 'active',
        is_featured: cuisine.is_featured || false,
        slug: cuisine.slug || '',
      })
    } catch (error) {
      console.error('Failed to fetch cuisine:', error)
      alert('Failed to load cuisine data. Please try again.')
    }
  }, [id])

  useEffect(() => {
    if (isEdit && id) {
      fetchCuisine()
    }
  }, [id, isEdit, fetchCuisine])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const imageUrl = response.data.url
      setFormData(prev => ({ ...prev, image_url: imageUrl }))
    } catch (error) {
      console.error('Upload error:', error)
      alert(error.response?.data?.detail || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleAdditionalImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadingAdditionalImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const imageUrl = response.data.url
      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, imageUrl]
      }))
    } catch (error) {
      console.error('Upload error:', error)
      alert(error.response?.data?.detail || 'Failed to upload image')
    } finally {
      setUploadingAdditionalImage(false)
      e.target.value = ''
    }
  }

  const removeAdditionalImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const addIngredient = () => {
    if (ingredientInput.trim()) {
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, ingredientInput.trim()]
      }))
      setIngredientInput('')
    }
  }

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const addAllergen = () => {
    if (allergenInput.trim()) {
      setFormData(prev => ({
        ...prev,
        allergens: [...prev.allergens, allergenInput.trim()]
      }))
      setAllergenInput('')
    }
  }

  const removeAllergen = (index) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let slug = (formData.slug || '').trim()
      if (!slug) {
        slug = (formData.name || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }

      const data = {
        ...formData,
        price: parseFloat(formData.price),
        price_per_person: formData.price_per_person ? parseFloat(formData.price_per_person) : null,
        minimum_servings: parseInt(formData.minimum_servings) || 1,
        prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
        serves: parseInt(formData.serves) || 1,
        slug: slug,
        image_url: formData.image_url || null,
        images: formData.images.length > 0 ? formData.images : null,
        ingredients: formData.ingredients.length > 0 ? formData.ingredients : null,
        allergens: formData.allergens.length > 0 ? formData.allergens : null,
      }

      // Remove empty strings
      Object.keys(data).forEach(key => {
        if (data[key] === '') {
          data[key] = null
        }
      })

      if (isEdit) {
        await api.put(`/chef/cuisines/${id}`, data)
      } else {
        await api.post('/chef/cuisines', data)
      }
      navigate('/cuisines')
    } catch (error) {
      console.error('Cuisine save error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save cuisine'
      alert(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/cuisines')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Cuisine' : 'Add New Cuisine'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update cuisine information' : 'Create a new cuisine offering'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuisine Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Jollof Rice, Egusi Soup"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Describe this cuisine..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Type</label>
            <select
              name="cuisine_type"
              value={formData.cuisine_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select cuisine type</option>
              {AFRICAN_CUISINE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input
              type="number"
              step="0.01"
              name="price"
              required
              value={formData.price}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Person</label>
            <input
              type="number"
              step="0.01"
              name="price_per_person"
              value={formData.price_per_person}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serves</label>
            <input
              type="number"
              name="serves"
              min="1"
              value={formData.serves}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Servings</label>
            <input
              type="number"
              name="minimum_servings"
              min="1"
              value={formData.minimum_servings}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (minutes)</label>
            <input
              type="number"
              name="prep_time_minutes"
              value={formData.prep_time_minutes}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spice Level</label>
            <select
              name="spice_level"
              value={formData.spice_level}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="mild">Mild</option>
              <option value="medium">Medium</option>
              <option value="hot">Hot</option>
              <option value="very_hot">Very Hot</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Image</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500">
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                ) : formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {formData.image_url && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Images</label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {formData.images.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={imageUrl}
                      alt={`Additional ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(index)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500">
                  {uploadingAdditionalImage ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  ) : (
                    <Upload className="h-6 w-6 text-gray-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAdditionalImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">Upload multiple images to showcase your cuisine from different angles</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                placeholder="Add ingredient..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addIngredient}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.ingredients.map((ingredient, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-2"
                >
                  {ingredient}
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Allergens</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={allergenInput}
                onChange={(e) => setAllergenInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergen())}
                placeholder="Add allergen..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addAllergen}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allergens.map((allergen, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-2"
                >
                  {allergen}
                  <button
                    type="button"
                    onClick={() => removeAllergen(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Options</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_vegetarian"
                  checked={formData.is_vegetarian}
                  onChange={handleChange}
                  className="mr-2"
                />
                Vegetarian
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_vegan"
                  checked={formData.is_vegan}
                  onChange={handleChange}
                  className="mr-2"
                />
                Vegan
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_gluten_free"
                  checked={formData.is_gluten_free}
                  onChange={handleChange}
                  className="mr-2"
                />
                Gluten Free
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_halal"
                  checked={formData.is_halal}
                  onChange={handleChange}
                  className="mr-2"
                />
                Halal
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_kosher"
                  checked={formData.is_kosher}
                  onChange={handleChange}
                  className="mr-2"
                />
                Kosher
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleChange}
                className="mr-2"
              />
              Featured Cuisine
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL-friendly name)</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Auto-generated from name if left empty"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/cuisines')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Cuisine' : 'Create Cuisine'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CuisineForm

