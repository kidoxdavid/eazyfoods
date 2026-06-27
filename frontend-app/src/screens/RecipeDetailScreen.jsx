import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Users, ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'

export default function RecipeDetailScreen() {
  const { recipeId } = useParams()
  const navigate     = useNavigate()
  const { addToCart } = useCart()
  const { success, error: showError } = useToast()
  const [recipe, setRecipe]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [servings, setServings] = useState(1)

  useEffect(() => {
    api.get(`/customer/recipes/${recipeId}`)
      .then(r => {
        setRecipe(r.data)
        setServings(r.data?.servings || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [recipeId])

  const handleAddAll = async () => {
    setAdding(true)
    try {
      await api.post(`/customer/recipes/${recipeId}/add-to-cart`, { servings })
      success('All ingredients added to cart!')
    } catch (_) {
      // Fallback: add individual products from ingredients
      const ingredients = recipe?.ingredients || []
      for (const ing of ingredients) {
        if (ing.product_id) {
          try {
            const prod = { id: ing.product_id, name: ing.name, price: ing.price || 0, image_url: ing.image_url }
            await addToCart(prod, ing.quantity || 1)
          } catch (_) {}
        }
      }
      success('Ingredients added to cart!')
    }
    setAdding(false)
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
    </div>
  )

  if (!recipe) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <p className="text-4xl">🍳</p>
      <p className="text-gray-500">Recipe not found</p>
      <button onClick={() => navigate(-1)} className="text-primary-600 font-semibold">Go back</button>
    </div>
  )

  const img = resolveImg(recipe.image_url)
  const scaleFactor = servings / (recipe.servings || 1)

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title="" back />

      <div className="flex-1 scroll-content mb-tab">
        {/* Hero image */}
        <div className="h-56 bg-gray-100 relative overflow-hidden">
          {img
            ? <img src={img} alt={recipe.name || recipe.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl">🍳</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white font-bold text-xl leading-tight">{recipe.name || recipe.title}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {recipe.prep_time  && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Prep: {recipe.prep_time}min</span>}
            {recipe.cook_time  && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Cook: {recipe.cook_time}min</span>}
            {recipe.difficulty && <span className="capitalize font-semibold text-primary-600">{recipe.difficulty}</span>}
            {recipe.meal_type  && <span className="capitalize text-gray-500">{recipe.meal_type}</span>}
          </div>
          {recipe.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{recipe.description}</p>}

          {/* Servings scaler */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Servings</span>
            <div className="flex items-center bg-gray-100 rounded-lg">
              <button onClick={() => setServings(s => Math.max(1, s - 1))} className="w-8 h-8 flex items-center justify-center press-scale">
                <Minus className="h-3.5 w-3.5 text-gray-700" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{servings}</span>
              <button onClick={() => setServings(s => s + 1)} className="w-8 h-8 flex items-center justify-center press-scale">
                <Plus className="h-3.5 w-3.5 text-gray-700" />
              </button>
            </div>
            <span className="text-xs text-gray-400">({recipe.servings || 1} base)</span>
          </div>
        </div>

        {/* Ingredients */}
        {recipe.ingredients?.length > 0 && (
          <div className="px-4 pt-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Ingredients ({recipe.ingredients.length})</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {recipe.ingredients.map((ing, i) => {
                const scaledQty = ing.quantity ? (ing.quantity * scaleFactor).toFixed(scaleFactor !== 1 ? 1 : 0) : null
                return (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < recipe.ingredients.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      {ing.image_url && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={resolveImg(ing.image_url)} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-sm text-gray-800">{ing.name}</span>
                      {ing.optional && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">optional</span>}
                    </div>
                    <span className="text-xs text-gray-500 text-right">
                      {scaledQty && `${scaledQty} `}{ing.unit || ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Instructions */}
        {(recipe.instructions || recipe.directions)?.length > 0 && (
          <div className="px-4 pt-5 pb-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Instructions</p>
            <div className="space-y-3">
              {(recipe.instructions || recipe.directions).map((step, i) => (
                <div key={i} className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">{typeof step === 'string' ? step : step.description || step.instruction}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Sticky add-all button */}
      <div className="pb-safe px-4 py-3 bg-white border-t border-gray-100">
        <button onClick={handleAddAll} disabled={adding}
          className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl press-scale flex items-center justify-center gap-2 disabled:opacity-60">
          {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
          Add All Ingredients to Cart
        </button>
      </div>
    </div>
  )
}
