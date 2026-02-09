import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Plus, X, Calendar } from 'lucide-react'

const MealPlanCreate = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [stores, setStores] = useState([])
  const [recipes, setRecipes] = useState([])
  const [selectedRecipes, setSelectedRecipes] = useState({})
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plan_type: 'one_day',
    image_url: '',
    price: '',
    store_id: ''
  })

  useEffect(() => {
    fetchStores()
    if (isEdit) {
      fetchMealPlan()
    }
  }, [id])

  useEffect(() => {
    if (formData.store_id) {
      fetchRecipes(formData.store_id)
    } else {
      setRecipes([])
    }
  }, [formData.store_id])

  const fetchStores = async () => {
    try {
      const response = await api.get('/admin/marketing/stores')
      setStores(response.data || [])
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    }
  }

  const fetchRecipes = async (storeId) => {
    if (!storeId) {
      setRecipes([])
      return
    }
    try {
      const response = await api.get('/admin/marketing/recipes', {
        params: { limit: 1000, is_active: true, store_id: storeId }
      })
      setRecipes(response.data || [])
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
      setRecipes([])
    }
  }

  const fetchMealPlan = async () => {
    try {
      const response = await api.get(`/admin/marketing/meal-plans/${id}`)
      const plan = response.data
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        plan_type: plan.plan_type || 'one_day',
        image_url: plan.image_url || '',
        price: plan.price || '',
        store_id: plan.store_id || ''
      })
      
      // Organize meals by meal type
      const organized = { breakfast: [], lunch: [], dinner: [] }
      plan.meals?.forEach(meal => {
        if (meal.meal_type && organized[meal.meal_type]) {
          organized[meal.meal_type].push({
            recipe_id: meal.recipe_id,
            day_number: meal.day_number,
            order: meal.order
          })
        }
      })
      setSelectedRecipes(organized)
    } catch (error) {
      console.error('Failed to fetch meal plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecipe = (mealType, recipe) => {
    const newSelection = { ...selectedRecipes }
    if (!newSelection[mealType]) {
      newSelection[mealType] = []
    }
    
    // For one_day plan, just add. For week/month, need day_number
    const dayNumber = formData.plan_type === 'one_day' ? 1 : 
                     formData.plan_type === 'one_week' ? (newSelection[mealType].length % 7) + 1 :
                     (newSelection[mealType].length % 30) + 1
    
    newSelection[mealType].push({
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      day_number: dayNumber,
      order: newSelection[mealType].length
    })
    setSelectedRecipes(newSelection)
  }

  const handleRemoveRecipe = (mealType, index) => {
    const newSelection = { ...selectedRecipes }
    newSelection[mealType] = newSelection[mealType].filter((_, i) => i !== index)
    setSelectedRecipes(newSelection)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.store_id) {
      alert('Please select a store first. Meal plans are tied to one store for checkout.')
      return
    }
    setSaving(true)
    try {
      // Build meals array
      const meals = []
      Object.keys(selectedRecipes).forEach(mealType => {
        selectedRecipes[mealType].forEach((selection, index) => {
          meals.push({
            recipe_id: selection.recipe_id,
            meal_type: mealType,
            day_number: selection.day_number || 1,
            order: index
          })
        })
      })

      const data = {
        name: formData.name,
        description: formData.description,
        plan_type: formData.plan_type,
        image_url: formData.image_url || null,
        price: formData.price ? parseFloat(formData.price) : null,
        store_id: formData.store_id || undefined,
        meals: meals
      }
      
      if (isEdit) {
        await api.put(`/admin/marketing/meal-plans/${id}`, data)
        alert('Meal plan updated successfully')
      } else {
        await api.post('/admin/marketing/meal-plans', data)
        alert('Meal plan created successfully')
      }
      navigate('/meal-plans')
    } catch (error) {
      alert('Failed to save meal plan: ' + (error.response?.data?.detail || error.message))
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

  const mealTypes = ['breakfast', 'lunch', 'dinner']
  const maxDays = formData.plan_type === 'one_day' ? 1 : 
                  formData.plan_type === 'one_week' ? 7 : 30

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/meal-plans" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Meal Plans
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Meal Plan' : 'Create Meal Plan'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
          <select
            required
            value={formData.store_id}
            onChange={(e) => {
              setFormData({ ...formData, store_id: e.target.value })
              setSelectedRecipes({ breakfast: [], lunch: [], dinner: [] })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select a store</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.store_name || store.business_name} {store.city || store.state ? `– ${[store.city, store.state].filter(Boolean).join(', ')}` : ''}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            All recipes must come from this store. The selected store will appear at checkout.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meal Plan Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type *</label>
            <select
              required
              value={formData.plan_type}
              onChange={(e) => {
                setFormData({ ...formData, plan_type: e.target.value })
                // Reset selections when plan type changes
                setSelectedRecipes({ breakfast: [], lunch: [], dinner: [] })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="one_day">1 Day (3 meals)</option>
              <option value="one_week">1 Week (21 meals)</option>
              <option value="one_month">1 Month (90 meals)</option>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (optional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="0.00"
          />
        </div>

        {/* Meal Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Meals</h3>
          <p className="text-sm text-gray-600 mb-4">
            {formData.plan_type === 'one_day' && 'Select 1 recipe for each meal type (breakfast, lunch, dinner)'}
            {formData.plan_type === 'one_week' && 'Select recipes for each day of the week (7 days × 3 meals = 21 meals)'}
            {formData.plan_type === 'one_month' && 'Select recipes for each day of the month (30 days × 3 meals = 90 meals)'}
          </p>

          {mealTypes.map(mealType => (
            <div key={mealType} className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3 capitalize">{mealType}</h4>
              
              {/* Selected Recipes */}
              <div className="space-y-2 mb-3">
                {selectedRecipes[mealType]?.map((selection, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{selection.recipe_name}</p>
                      {formData.plan_type !== 'one_day' && (
                        <p className="text-sm text-gray-500">Day {selection.day_number}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipe(mealType, index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Recipe Selection */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Available Recipes:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {recipes
                    .filter(r => r.meal_type === mealType && r.is_active)
                    .map(recipe => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => handleAddRecipe(mealType, recipe)}
                        disabled={selectedRecipes[mealType]?.length >= maxDays}
                        className="p-2 text-left border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {recipe.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : isEdit ? 'Update Meal Plan' : 'Create Meal Plan'}
        </button>
      </form>
    </div>
  )
}

export default MealPlanCreate

