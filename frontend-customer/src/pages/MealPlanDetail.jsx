import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ShoppingCart, ArrowLeft, Utensils, Sunrise, Sun, Moon } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { MealDetailSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'
import StickyAddToCartMealPlan from '../components/StickyAddToCartMealPlan'

const MealPlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const [mealPlan, setMealPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [householdSize, setHouseholdSize] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    fetchMealPlan()
  }, [id])

  const fetchMealPlan = async () => {
    try {
      const response = await api.get(`/customer/recipes/meal-plans/${id}`)
      setMealPlan(response.data)
    } catch (error) {
      console.error('Failed to fetch meal plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    setAddingToCart(true)
    try {
      // Get meal plan ingredients with adjusted quantities
      const response = await api.post(`/customer/recipes/meal-plans/${id}/add-to-cart`, null, {
        params: { household_size: householdSize }
      })

      // Add each ingredient to cart
      for (const item of response.data.items) {
        // Set quantity on product before adding
        const productWithQuantity = { ...item.product, quantity: item.quantity }
        addToCart(productWithQuantity, item.quantity)
      }

      showSuccessToast(`Added all ingredients for ${householdSize} person${householdSize > 1 ? 's' : ''} to cart!`)
      navigate('/cart')
    } catch (error) {
      console.error('Failed to add meal plan to cart:', error)
      showErrorToast('Failed to add ingredients to cart. Please try again.')
    } finally {
      setAddingToCart(false)
    }
  }

  const getPlanTypeLabel = (planType) => {
    const labels = {
      one_day: '1 Day Plan',
      one_week: '1 Week Plan',
      one_month: '1 Month Plan'
    }
    return labels[planType] || planType
  }

  const getMealTypeColor = (mealType) => {
    const colors = {
      breakfast: 'bg-yellow-100 text-yellow-800',
      lunch: 'bg-blue-100 text-blue-800',
      dinner: 'bg-purple-100 text-purple-800'
    }
    return colors[mealType] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return <MealDetailSkeleton />
  }

  if (!mealPlan) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-600">This African meal plan isn't available yet — but more authentic recipes are coming! 👩🏽‍🍳</p>
      </div>
    )
  }

  // Group meals by day
  const mealsByDay = {}
  mealPlan.meals?.forEach(meal => {
    const day = meal.day_number || 1
    if (!mealsByDay[day]) {
      mealsByDay[day] = []
    }
    mealsByDay[day].push(meal)
  })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <button
        onClick={() => navigate('/meals')}
        className="mb-4 sm:mb-6 flex items-center text-sm sm:text-base text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        Back to Meals
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {mealPlan.image_url && (
            <img
              src={resolveImageUrl(mealPlan.image_url)}
              alt={mealPlan.name}
              className="w-full h-48 sm:h-64 object-cover rounded-lg mb-4 sm:mb-6"
            />
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">{mealPlan.name}</h1>
          
          {mealPlan.description && (
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">{mealPlan.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <span className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
              {getPlanTypeLabel(mealPlan.plan_type)}
            </span>
            <div className="flex items-center text-sm sm:text-base text-gray-600">
              <Utensils className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span>{mealPlan.meals?.length || 0} meals</span>
            </div>
          </div>

          {/* Meals by Day - clear day-by-day structure */}
          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Meal Schedule</h2>
            {Object.keys(mealsByDay).sort((a, b) => Number(a) - Number(b)).map(day => (
              <section key={day} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Day {day}</h3>
                </div>
                <ul className="divide-y divide-gray-100">
                  {mealsByDay[day].map(meal => (
                    <li key={meal.id} className="flex gap-4 p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                      <span className={`flex-shrink-0 w-24 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium capitalize ${getMealTypeColor(meal.meal_type)}`}>
                        {meal.meal_type === 'breakfast' && <Sunrise className="h-3.5 w-3.5" />}
                        {meal.meal_type === 'lunch' && <Sun className="h-3.5 w-3.5" />}
                        {meal.meal_type === 'dinner' && <Moon className="h-3.5 w-3.5" />}
                        {meal.meal_type}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-4">
                        {meal.recipe?.image_url && (
                          <img
                            src={resolveImageUrl(meal.recipe.image_url, 'recipe')}
                            alt=""
                            className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900">{meal.recipe?.name || 'Recipe'}</h4>
                          {meal.recipe?.cuisine_type && (
                            <p className="text-xs text-gray-500 mt-0.5">{meal.recipe.cuisine_type}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 sticky top-4 lg:top-24">
            {mealPlan.price && (
              <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Price</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-600">${mealPlan.price.toFixed(2)}</p>
              </div>
            )}

            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Household Size
              </label>
              <select
                value={householdSize}
                onChange={(e) => setHouseholdSize(parseInt(e.target.value))}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value={1}>1 person</option>
                <option value={2}>2 people</option>
                <option value={3}>3 people</option>
                <option value={4}>4 people</option>
                <option value={5}>5 people</option>
                <option value={6}>6+ people</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Quantities will be adjusted automatically
              </p>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="w-full bg-primary-600 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-sm sm:text-base"
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              {addingToCart ? 'Adding to Cart...' : 'Add All Ingredients to Cart'}
            </button>

            <p className="text-xs text-gray-500 mt-3 sm:mt-4 text-center">
              All required ingredients will be added to your cart with quantities adjusted for {householdSize} person{householdSize > 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Add to Cart (Mobile) */}
      <StickyAddToCartMealPlan
        mealPlan={mealPlan}
        householdSize={householdSize}
        setHouseholdSize={setHouseholdSize}
        onAddToCart={handleAddToCart}
        disabled={addingToCart}
      />
    </div>
  )
}

export default MealPlanDetail

