import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { Clock, Users, ShoppingCart, ChefHat, Minus, Plus } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { MealDetailSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'
import ProductImageGallery from '../components/ProductImageGallery'
import AnimatedButton from '../components/AnimatedButton'
import SuccessCheckmark from '../components/SuccessCheckmark'
import StickyAddToCartMeal from '../components/StickyAddToCartMeal'

const MealDetail = () => {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [householdSize, setHouseholdSize] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [showSuccessCheckmark, setShowSuccessCheckmark] = useState(false)

  useEffect(() => {
    fetchRecipe()
  }, [id])

  const fetchRecipe = async () => {
    try {
      const response = await api.get(`/customer/recipes/${id}`)
      setRecipe(response.data)
    } catch (error) {
      console.error('Failed to fetch recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    setAddingToCart(true)
    try {
      const response = await api.post(`/customer/recipes/${id}/add-to-cart`, null, {
        params: { household_size: householdSize }
      })

      for (const item of response.data.items) {
        if (!item.is_optional) {
          const productWithQuantity = { ...item.product, quantity: item.quantity }
          addToCart(productWithQuantity, item.quantity)
        }
      }

      showSuccessToast(`Added all ingredients for ${householdSize} person${householdSize > 1 ? 's' : ''} to cart!`)
      setShowSuccessCheckmark(true)
    } catch (error) {
      console.error('Failed to add recipe to cart:', error)
      showErrorToast('Failed to add ingredients to cart. Please try again.')
    } finally {
      setAddingToCart(false)
    }
  }

  const getMealTypeColor = (mealType) => {
    const colors = {
      breakfast: 'bg-yellow-100 text-yellow-800',
      lunch: 'bg-blue-100 text-blue-800',
      dinner: 'bg-purple-100 text-purple-800'
    }
    return colors[mealType] || 'bg-gray-100 text-gray-800'
  }

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    }
    return colors[difficulty] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return <MealDetailSkeleton />
  }

  if (!recipe) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-600">This African recipe isn't available yet — but our chefs are cooking up more authentic dishes! 👩🏽‍🍳</p>
      </div>
    )
  }

  const getAdjustedQuantity = (baseQuantity) => {
    const q = parseFloat(baseQuantity)
    return (isNaN(q) ? 0 : q * householdSize).toFixed(2)
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-12">
        {/* Recipe Image - same as ProductDetail */}
        <div>
          <ProductImageGallery
            images={[]}
            mainImage={resolveImageUrl(recipe.image_url, 'recipe')}
            productName={recipe.name}
            imageType="recipe"
          />
        </div>

        {/* Recipe Info - same structure as ProductDetail */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">{recipe.name}</h1>

          <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2">
            {recipe.meal_type && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMealTypeColor(recipe.meal_type)}`}>
                {recipe.meal_type}
              </span>
            )}
            {recipe.difficulty && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
              </span>
            )}
            {recipe.cuisine_type && (
              <span className="text-xs sm:text-sm text-gray-600">{recipe.cuisine_type}</span>
            )}
          </div>

          <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
            {recipe.prep_time_minutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Prep {recipe.prep_time_minutes}m
              </span>
            )}
            {recipe.cook_time_minutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Cook {recipe.cook_time_minutes}m
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Serves {recipe.servings || 1}
            </span>
          </div>

          {recipe.description && (
            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-1.5 sm:mb-2">Description</h2>
              <p className="text-gray-600 whitespace-pre-line text-xs sm:text-sm lg:text-base xl:text-lg leading-relaxed">{recipe.description}</p>
            </div>
          )}

          {/* Servings Selector - same as Quantity in ProductDetail */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Servings</label>
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
              <button
                onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                className="p-1.5 sm:p-2 lg:p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 touch-manipulation"
              >
                <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              </button>
              <input
                type="number"
                min="1"
                max="10"
                value={householdSize}
                onChange={(e) => setHouseholdSize(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-14 sm:w-16 lg:w-20 text-center border border-gray-300 rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base"
              />
              <button
                onClick={() => setHouseholdSize(Math.min(10, householdSize + 1))}
                className="p-1.5 sm:p-2 lg:p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 touch-manipulation"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              </button>
            </div>
          </div>

          <AnimatedButton
            onClick={handleAddToCart}
            disabled={addingToCart || !recipe.ingredients?.length}
            className="w-full mb-3 sm:mb-4 text-sm sm:text-base"
            variant="primary"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{addingToCart ? 'Adding...' : `Add Ingredients to Cart`}</span>
          </AnimatedButton>

          <SuccessCheckmark
            show={showSuccessCheckmark}
            onComplete={() => setShowSuccessCheckmark(false)}
          />

          {/* Ingredients */}
          {recipe.ingredients?.length > 0 && (
            <div className="mt-6">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-1.5 sm:mb-2 flex items-center gap-2">
                <ChefHat className="h-4 w-4 sm:h-5 sm:w-5" />
                Ingredients
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {recipe.ingredients.map((ingredient) => (
                    <li key={ingredient.id} className="flex items-center justify-between gap-3 px-3 py-2.5 sm:py-3 hover:bg-gray-50/50">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {ingredient.product?.image_url ? (
                          <img
                            src={resolveImageUrl(ingredient.product.image_url)}
                            alt=""
                            className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded bg-gray-100 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate block">
                            {ingredient.product?.name || 'Product'}
                          </span>
                          {ingredient.is_optional && <span className="text-[10px] text-gray-400">optional</span>}
                          {ingredient.notes && <span className="text-[10px] text-gray-500 block truncate">{ingredient.notes}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-semibold text-primary-600">{getAdjustedQuantity(ingredient.quantity)} {ingredient.unit || ''}</span>
                        {ingredient.product?.price != null && (
                          <p className="text-[10px] text-gray-500">${(parseFloat(ingredient.product.price) * parseFloat(getAdjustedQuantity(ingredient.quantity))).toFixed(2)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Add to Cart (Mobile) - like ProductDetail */}
      <StickyAddToCartMeal
        recipe={recipe}
        householdSize={householdSize}
        setHouseholdSize={setHouseholdSize}
        onAddToCart={handleAddToCart}
        disabled={addingToCart || !recipe.ingredients?.length}
      />

      {/* Instructions - full width below grid, like Reviews in ProductDetail */}
      {recipe.instructions && (
        <div className="mt-8 sm:mt-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Instructions</h2>
          <div className="card p-4 sm:p-6">
            <p className="text-gray-700 whitespace-pre-line text-sm sm:text-base leading-relaxed">{recipe.instructions}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MealDetail
