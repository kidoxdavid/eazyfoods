import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Utensils, Clock, Users, Search, Filter, ChefHat, Calendar, Sparkles, TrendingUp, Plus, ShoppingCart } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { ProductCardSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'
import { useCart } from '../contexts/CartContext'

const Meals = () => {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [recipes, setRecipes] = useState([])
  const [mealPlans, setMealPlans] = useState([])
  const [suggestedPlans, setSuggestedPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('recipes') // 'recipes' or 'meal-plans'
  const [filters, setFilters] = useState({
    meal_type: '',
    cuisine_type: '',
    difficulty: '',
    prep_time_max: '',
    search: ''
  })
  const [planTypeFilter, setPlanTypeFilter] = useState('all')
  const [buildPlanOpen, setBuildPlanOpen] = useState(false)
  const [buildPlanType, setBuildPlanType] = useState('one_week')
  const [buildSlots, setBuildSlots] = useState([]) // [{ day_number, meal_type, recipe_id }]
  const [addingSuggested, setAddingSuggested] = useState(null)
  const [addingBuild, setAddingBuild] = useState(false)

  useEffect(() => {
    if (activeTab === 'recipes') {
      fetchRecipes()
    } else {
      fetchMealPlans()
      fetchSuggested()
    }
  }, [filters, planTypeFilter, activeTab])

  useEffect(() => {
    if (buildPlanOpen && recipes.length === 0) fetchRecipes()
  }, [buildPlanOpen])

  const fetchSuggested = async () => {
    try {
      const res = await api.get('/customer/recipes/meal-plans/suggested')
      setSuggestedPlans(Array.isArray(res.data) ? res.data : [])
    } catch {
      setSuggestedPlans([])
    }
  }

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.meal_type) params.meal_type = filters.meal_type
      if (filters.cuisine_type) params.cuisine_type = filters.cuisine_type
      if (filters.difficulty) params.difficulty = filters.difficulty
      if (filters.prep_time_max) params.prep_time_max = parseInt(filters.prep_time_max, 10)
      if (filters.search && filters.search.trim()) params.search = filters.search.trim()

      const response = await api.get('/customer/recipes/', { params })
      setRecipes(response.data || [])
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const hasActiveRecipeFilters = filters.meal_type || filters.cuisine_type || filters.difficulty || filters.prep_time_max || (filters.search && filters.search.trim())
  const clearRecipeFilters = () => setFilters({ meal_type: '', cuisine_type: '', difficulty: '', prep_time_max: '', search: '' })

  const fetchMealPlans = async () => {
    setLoading(true)
    try {
      const params = {}
      if (planTypeFilter !== 'all') params.plan_type = planTypeFilter
      const response = await api.get('/customer/recipes/meal-plans', { params })
      setMealPlans(response.data || [])
    } catch (error) {
      console.error('Failed to fetch meal plans:', error)
      setMealPlans([])
    } finally {
      setLoading(false)
    }
  }

  const getMealTypeColor = (mealType) => {
    const colors = {
      breakfast: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white',
      lunch: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white',
      dinner: 'bg-gradient-to-r from-purple-400 to-purple-500 text-white'
    }
    return colors[mealType] || 'bg-gray-100 text-gray-800'
  }

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-500 text-white',
      medium: 'bg-yellow-500 text-white',
      hard: 'bg-red-500 text-white'
    }
    return colors[difficulty] || 'bg-gray-100 text-gray-800'
  }

  const handleSuggestedAddToCart = async (plan, householdSize = 1) => {
    if (!plan.meals?.length) return
    setAddingSuggested(plan.id)
    try {
      const res = await api.post('/customer/recipes/meal-plans/add-to-cart-from-recipes', {
        name: plan.name,
        meals: plan.meals.map(m => ({ recipe_id: m.recipe_id, day_number: m.day_number, meal_type: m.meal_type || 'dinner' })),
        household_size: householdSize
      })
      const items = res.data?.items || []
      for (const item of items) {
        const product = { ...item.product, quantity: item.quantity }
        addToCart(product, item.quantity)
      }
      alert(`Added ${items.length} ingredient(s) to cart for ${plan.name}.`)
      navigate('/cart')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to add to cart.')
    } finally {
      setAddingSuggested(null)
    }
  }

  const handleBuildPlanAddToCart = async () => {
    const meals = buildSlots.filter(s => s.recipe_id).map(s => ({ recipe_id: s.recipe_id, day_number: s.day_number, meal_type: s.meal_type }))
    if (!meals.length) {
      alert('Select at least one recipe.')
      return
    }
    setAddingBuild(true)
    try {
      const res = await api.post('/customer/recipes/meal-plans/add-to-cart-from-recipes', {
        name: 'My meal plan',
        meals,
        household_size: 1
      })
      const items = res.data?.items || []
      for (const item of items) {
        const product = { ...item.product, quantity: item.quantity }
        addToCart(product, item.quantity)
      }
      alert(`Added ${items.length} ingredient(s) to cart.`)
      setBuildPlanOpen(false)
      setBuildSlots([])
      navigate('/cart')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to add to cart.')
    } finally {
      setAddingBuild(false)
    }
  }

  const makeBuildSlots = (planType) => {
    const days = planType === 'one_day' ? 1 : 7
    const types = ['breakfast', 'lunch', 'dinner']
    const slots = []
    for (let d = 1; d <= days; d++) {
      for (const t of types) {
        slots.push({ day_number: d, meal_type: t, recipe_id: '' })
      }
    }
    return slots
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 relative">
        <PageBanner
          title="Recipes & Meal Plans"
          subtitle="Discover authentic African recipes and meal plans"
          icon={ChefHat}
          placement="meals_top_banner"
        />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 relative">
      {/* Hero Section with Ad Support */}
      <PageBanner
        title="Recipes & Meal Plans"
        subtitle="Discover authentic African recipes and curated meal plans"
        placement="meals_top_banner"
        defaultContent={
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Discover Amazing Meals
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Explore delicious recipes and curated meal plans. Add all ingredients to your cart with one click!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Easy Recipes</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Meal Plans</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Family Sized</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Tabs - Compact */}
        <div className="mb-4 flex justify-center">
          <div className="inline-flex bg-white rounded-xl shadow-lg p-1 border border-gray-200">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'recipes'
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Utensils className="h-4 w-4" />
              <span>Recipes</span>
            </button>
            <button
              onClick={() => setActiveTab('meal-plans')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'meal-plans'
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Meal Plans</span>
            </button>
          </div>
        </div>

        {/* Filters - Recipes */}
        {activeTab === 'recipes' && (
          <div className="mb-4 bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
            <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-2">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Recipe name, cuisine..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="w-32 sm:w-36">
                <label className="block text-xs font-medium text-gray-700 mb-1">Meal type</label>
                <select
                  value={filters.meal_type}
                  onChange={(e) => setFilters({ ...filters, meal_type: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">All</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
              <div className="w-28 sm:w-32">
                <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="w-32 sm:w-36">
                <label className="block text-xs font-medium text-gray-700 mb-1">Max time</label>
                <select
                  value={filters.prep_time_max}
                  onChange={(e) => setFilters({ ...filters, prep_time_max: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Any</option>
                  <option value="30">Under 30 min</option>
                  <option value="45">Under 45 min</option>
                  <option value="60">Under 60 min</option>
                  <option value="90">Under 90 min</option>
                </select>
              </div>
              <div className="min-w-[100px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuisine</label>
                <input
                  type="text"
                  value={filters.cuisine_type}
                  onChange={(e) => setFilters({ ...filters, cuisine_type: e.target.value })}
                  placeholder="e.g. Nigerian"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {hasActiveRecipeFilters && (
                <button
                  type="button"
                  onClick={clearRecipeFilters}
                  className="text-sm text-primary-600 hover:underline font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
            {!loading && (
              <p className="text-xs text-gray-500">
                {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
              </p>
            )}
          </div>
        )}

        {activeTab === 'meal-plans' && (
          <div className="mb-4 bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filter:</span>
              <select
                value={planTypeFilter}
                onChange={(e) => setPlanTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="all">All Plan Types</option>
                <option value="one_day">1 Day Plans</option>
                <option value="one_week">1 Week Plans</option>
                <option value="one_month">1 Month Plans</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => { setBuildPlanOpen(true); setBuildPlanType('one_week'); setBuildSlots(makeBuildSlots('one_week')); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Build your plan
            </button>
          </div>
        )}

        {/* Build your plan modal */}
        {buildPlanOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-start justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Build your meal plan</h3>
                <button type="button" onClick={() => setBuildPlanOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-sm text-gray-600 mb-3">Select recipes for each slot. Ingredients will be added to your cart.</p>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan length</label>
                  <select
                    value={buildPlanType}
                    onChange={(e) => { const v = e.target.value; setBuildPlanType(v); setBuildSlots(makeBuildSlots(v)); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="one_day">1 Day (3 meals)</option>
                    <option value="one_week">1 Week (21 meals)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {buildSlots.map((slot, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="w-20 font-medium">Day {slot.day_number}</span>
                      <span className="w-20 capitalize text-gray-600">{slot.meal_type}</span>
                      <select
                        value={slot.recipe_id}
                        onChange={(e) => {
                          const next = [...buildSlots]
                          next[idx] = { ...slot, recipe_id: e.target.value }
                          setBuildSlots(next)
                        }}
                        className="flex-1 min-w-[180px] px-2 py-1.5 border border-gray-300 rounded-lg"
                      >
                        <option value="">— Select recipe —</option>
                        {recipes.filter(r => (r.meal_type || 'dinner') === slot.meal_type).length
                          ? recipes.filter(r => (r.meal_type || 'dinner') === slot.meal_type).map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))
                          : recipes.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))
                        }
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setBuildPlanOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancel</button>
                <button type="button" onClick={handleBuildPlanAddToCart} disabled={addingBuild} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  {addingBuild ? 'Adding…' : 'Add to cart'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipes Grid */}
        {activeTab === 'recipes' && (
          <>
            {recipes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <Utensils className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {hasActiveRecipeFilters ? 'No recipes match your filters.' : "No African recipes yet — but they're cooking! 👩🏽‍🍳"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {hasActiveRecipeFilters ? 'Try clearing filters or browse meal plans below.' : 'Our chefs are preparing authentic African dishes. Check back soon or explore meal plans!'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {hasActiveRecipeFilters ? (
                    <button onClick={clearRecipeFilters} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold">
                      Clear filters
                    </button>
                  ) : (
                    <button onClick={() => setActiveTab('meal-plans')} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold">
                      Browse meal plans
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
                {recipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    to={`/meals/${recipe.id}`}
                    className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {recipe.image_url ? (
                        <>
                          <img
                            src={resolveImageUrl(recipe.image_url, 'recipe')}
                            alt={recipe.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                          <Utensils className="h-12 w-12 text-primary-300" />
                        </div>
                      )}
                      {/* Meal Type Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${getMealTypeColor(recipe.meal_type)}`}>
                          {recipe.meal_type.charAt(0).toUpperCase() + recipe.meal_type.slice(1)}
                        </span>
                      </div>
                      {/* Difficulty Badge */}
                      {recipe.difficulty && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${getDifficultyColor(recipe.difficulty)}`}>
                            {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                          </span>
                        </div>
                      )}
                      {recipe.is_featured && (
                        <div className="absolute bottom-2 left-2 z-10">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold shadow-lg bg-amber-500 text-white">
                            Featured
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                        {recipe.name}
                      </h3>

                      {/* Description */}
                      {recipe.description && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
                        </div>
                      )}

                      {/* Cuisine Type */}
                      {recipe.cuisine_type && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Cuisine:</p>
                          <p className="text-sm font-semibold text-primary-600">{recipe.cuisine_type}</p>
                        </div>
                      )}
                      
                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                        {recipe.prep_time_minutes != null && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-primary-500 flex-shrink-0" />
                            <span>Prep: {recipe.prep_time_minutes}m</span>
                          </div>
                        )}
                        {recipe.cook_time_minutes != null && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-primary-500 flex-shrink-0" />
                            <span>Cook: {recipe.cook_time_minutes}m</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-primary-500 flex-shrink-0" />
                          <span>Serves {recipe.servings || 1}</span>
                        </div>
                      </div>

                      {/* Total time if both prep and cook */}
                      {(recipe.prep_time_minutes != null && recipe.cook_time_minutes != null) && (
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-500">
                            Total: {recipe.prep_time_minutes + recipe.cook_time_minutes} min
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Suggested for you */}
        {activeTab === 'meal-plans' && suggestedPlans.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              Suggested for you
            </h3>
            <p className="text-sm text-gray-600 mb-4">Meal plans built from our recipes. Add all ingredients to cart in one click.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {suggestedPlans.map((plan) => (
                <div key={plan.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-50 to-primary-50">
                    {plan.image_url ? (
                      <img src={resolveImageUrl(plan.image_url)} alt={plan.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-primary-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">Suggested</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 mb-1">{plan.name}</h4>
                    {plan.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>}
                    <p className="text-xs text-gray-500 mb-3">{plan.meal_count} meals</p>
                    <button
                      type="button"
                      onClick={() => handleSuggestedAddToCart(plan, 1)}
                      disabled={addingSuggested === plan.id}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold disabled:opacity-50"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {addingSuggested === plan.id ? 'Adding…' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal Plans Grid */}
        {activeTab === 'meal-plans' && (
          <>
            {mealPlans.length === 0 && suggestedPlans.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No meal plans yet — build your own! 👩🏽‍🍳</h3>
                <p className="text-sm text-gray-600 mb-4">We're curating meal plans for you. Use "Build your plan" to pick recipes and add all ingredients to cart in one click.</p>
                <button
                  type="button"
                  onClick={() => { setBuildPlanOpen(true); setBuildPlanType('one_week'); setBuildSlots(makeBuildSlots('one_week')); }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Build your plan
                </button>
              </div>
            ) : mealPlans.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                {mealPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    to={`/meal-plans/${plan.id}`}
                    className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
                      {plan.image_url ? (
                        <>
                          <img
                            src={resolveImageUrl(plan.image_url)}
                            alt={plan.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50">
                          <Calendar className="h-12 w-12 text-primary-300" />
                        </div>
                      )}
                      {/* Plan Type Badge */}
                      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                        {plan.is_featured && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold shadow-lg bg-amber-500 text-white">
                            Featured
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-bold text-primary-600 shadow-lg">
                          {plan.plan_type === 'one_day' ? '1 Day' : plan.plan_type === 'one_week' ? '1 Week' : '1 Month'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                        </div>
                      )}
                      
                      {/* Meta Info */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Utensils className="h-4 w-4 text-primary-600 flex-shrink-0" />
                          <span className="text-sm font-semibold">{plan.meal_count} {plan.meal_count === 1 ? 'meal' : 'meals'}</span>
                        </div>
                        {plan.price != null && plan.price > 0 && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary-600">
                              ${plan.price.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">per plan</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default Meals
