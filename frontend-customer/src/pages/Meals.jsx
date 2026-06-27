import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  Utensils, Clock, Users, Search, Filter, ChefHat, Calendar,
  Sparkles, TrendingUp, Plus, ShoppingCart, ChevronDown, ChevronUp,
  Wand2, Check, RefreshCw, AlertCircle
} from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { ProductCardSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'
import { useCart } from '../contexts/CartContext'

// ── AI occasion quick-starts ──────────────────────────────────────────────────
const AI_OCCASIONS = [
  { emoji: '📅', label: 'This Week',    request: 'meal plan for this week' },
  { emoji: '🌿', label: 'Healthy',      request: 'healthy meal plan for the week' },
  { emoji: '🎄', label: 'Christmas',    request: 'Christmas meal plan for 3 days' },
  { emoji: '🎊', label: 'New Year',     request: "New Year's celebration meal plan" },
  { emoji: '🕌', label: 'Eid Special',  request: 'Eid celebration meal plan for 3 days' },
  { emoji: '⚡', label: 'Quick & Easy', request: 'quick easy weekday meal plan' },
]

const MEAL_EMOJI = { breakfast: '🌅', lunch: '🌞', dinner: '🌙' }
const PLAN_LABEL = { one_day: '1-Day Plan', one_week: 'Weekly Plan', one_month: 'Monthly Plan' }

// ── Inline AI meal plan result card ──────────────────────────────────────────
function AIPlanResult({ plan, onAddToCart, adding, added }) {
  const [expanded, setExpanded] = useState(false)
  const preview = expanded ? plan.days : plan.days.slice(0, 3)

  return (
    <div className="mt-4 bg-white rounded-xl border border-primary-100 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-white font-bold text-base leading-tight">{plan.name}</p>
            <p className="text-primary-200 text-xs mt-0.5">
              {PLAN_LABEL[plan.plan_type] || plan.plan_type} &bull; {plan.day_count} day{plan.day_count !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
            AI Generated
          </span>
        </div>
        {plan.description && (
          <p className="text-primary-100 text-sm mt-2 leading-snug">{plan.description}</p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {preview.map(day => (
          <div key={day.day_number} className="bg-gray-50 rounded-xl p-3">
            <p className="text-sm font-bold text-gray-800 mb-2">{day.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {['breakfast', 'lunch', 'dinner'].map(mt => {
                const meal = day.meals.find(m => m.meal_type === mt)
                return (
                  <div key={mt} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${meal ? 'bg-white border border-gray-100' : 'bg-gray-100 opacity-40'}`}>
                    <span className="text-base flex-shrink-0">{MEAL_EMOJI[mt]}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 capitalize leading-none mb-0.5">{mt}</p>
                      <p className="text-xs font-semibold text-gray-700 leading-tight line-clamp-1">
                        {meal ? meal.recipe_name : '—'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {plan.days.length > 3 && (
          <button onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-primary-600 font-semibold py-2 hover:bg-primary-50 rounded-xl transition-colors border border-primary-100">
            {expanded
              ? <><ChevronUp className="h-4 w-4" /> Show less</>
              : <><ChevronDown className="h-4 w-4" /> Show all {plan.days.length} days</>
            }
          </button>
        )}
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button onClick={() => onAddToCart(plan)} disabled={adding || added}
          className={`flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            added   ? 'bg-green-500 text-white'
            : adding ? 'bg-primary-400 text-white'
            : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}>
          {added   ? <><Check className="h-4 w-4" /> Added to cart! Going to cart…</>
           : adding ? 'Adding ingredients…'
           : <><ShoppingCart className="h-4 w-4" /> Add all ingredients to cart</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const Meals = () => {
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [recipes, setRecipes] = useState([])
  const [mealPlans, setMealPlans] = useState([])
  const [suggestedPlans, setSuggestedPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('recipes')

  const [filters, setFilters] = useState({ meal_type: '', cuisine_type: '', difficulty: '', prep_time_max: '', search: '' })
  const [planTypeFilter, setPlanTypeFilter] = useState('all')
  const [addingSuggested, setAddingSuggested] = useState(null)

  // Manual builder
  const [buildPlanOpen, setBuildPlanOpen] = useState(false)
  const [buildPlanType, setBuildPlanType] = useState('one_week')
  const [buildSlots, setBuildSlots] = useState([])
  const [addingBuild, setAddingBuild] = useState(false)

  // AI planner
  const [aiRequest, setAiRequest] = useState('')
  const [aiHouseholdSize, setAiHouseholdSize] = useState(2)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPlan, setAiPlan] = useState(null)
  const [aiError, setAiError] = useState('')
  const [aiAdding, setAiAdding] = useState(false)
  const [aiAdded, setAiAdded] = useState(false)

  useEffect(() => {
    if (activeTab === 'recipes') fetchRecipes()
    else { fetchMealPlans(); fetchSuggested() }
  }, [filters, planTypeFilter, activeTab])

  useEffect(() => {
    if (buildPlanOpen && recipes.length === 0) fetchRecipes()
  }, [buildPlanOpen])

  const fetchSuggested = async () => {
    try {
      const res = await api.get('/customer/recipes/meal-plans/suggested')
      setSuggestedPlans(Array.isArray(res.data) ? res.data : [])
    } catch { setSuggestedPlans([]) }
  }

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.meal_type) params.meal_type = filters.meal_type
      if (filters.cuisine_type) params.cuisine_type = filters.cuisine_type
      if (filters.difficulty) params.difficulty = filters.difficulty
      if (filters.prep_time_max) params.prep_time_max = parseInt(filters.prep_time_max, 10)
      if (filters.search?.trim()) params.search = filters.search.trim()
      const res = await api.get('/customer/recipes/', { params })
      setRecipes(res.data || [])
    } catch { setRecipes([]) }
    finally { setLoading(false) }
  }

  const fetchMealPlans = async () => {
    setLoading(true)
    try {
      const params = {}
      if (planTypeFilter !== 'all') params.plan_type = planTypeFilter
      const res = await api.get('/customer/recipes/meal-plans', { params })
      setMealPlans(res.data || [])
    } catch { setMealPlans([]) }
    finally { setLoading(false) }
  }

  const hasActiveRecipeFilters = filters.meal_type || filters.cuisine_type || filters.difficulty || filters.prep_time_max || filters.search?.trim()
  const clearRecipeFilters = () => setFilters({ meal_type: '', cuisine_type: '', difficulty: '', prep_time_max: '', search: '' })

  // ── AI generation ───────────────────────────────────────────────────────────
  const generateAIPlan = async (requestText, size) => {
    const req = (requestText || aiRequest).trim()
    if (!req) return
    setAiLoading(true)
    setAiPlan(null)
    setAiError('')
    setAiAdded(false)
    try {
      const res = await api.post('/ai/meal-plan', {
        request: req,
        household_size: size || aiHouseholdSize,
      })
      setAiPlan(res.data)
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) setAiError('No recipes are available yet to build a plan from. Ask your admin to add recipes first.')
      else if (status === 503) setAiError('AI service not configured. Add ANTHROPIC_API_KEY in your Render environment settings.')
      else setAiError('Could not generate a plan right now. Please try again.')
    }
    setAiLoading(false)
  }

  const handleOccasionClick = (occ) => {
    setAiRequest(occ.request)
    generateAIPlan(occ.request, aiHouseholdSize)
  }

  const handleAIPlanAddToCart = async (plan) => {
    if (aiAdding) return
    setAiAdding(true)
    try {
      const res = await api.post('/customer/recipes/meal-plans/add-to-cart-from-recipes', {
        name: plan.name,
        meals: plan.meals.map(m => ({ recipe_id: m.recipe_id, day_number: m.day_number, meal_type: m.meal_type })),
        household_size: aiHouseholdSize,
      })
      for (const item of res.data?.items || []) {
        if (!item.product) continue
        await addToCart({ ...item.product, quantity: Math.max(1, Math.ceil(item.quantity)) })
      }
      setAiAdded(true)
      setTimeout(() => { setAiAdded(false); navigate('/cart') }, 1500)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to add ingredients to cart.')
    }
    setAiAdding(false)
  }

  // ── Suggested plan add to cart ──────────────────────────────────────────────
  const handleSuggestedAddToCart = async (plan) => {
    if (!plan.meals?.length) return
    setAddingSuggested(plan.id)
    try {
      const res = await api.post('/customer/recipes/meal-plans/add-to-cart-from-recipes', {
        name: plan.name,
        meals: plan.meals.map(m => ({ recipe_id: m.recipe_id, day_number: m.day_number, meal_type: m.meal_type || 'dinner' })),
        household_size: 2,
      })
      for (const item of res.data?.items || []) {
        addToCart({ ...item.product, quantity: item.quantity })
      }
      navigate('/cart')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to add to cart.')
    }
    setAddingSuggested(null)
  }

  // ── Manual builder ──────────────────────────────────────────────────────────
  const makeBuildSlots = (planType) => {
    const days = planType === 'one_day' ? 1 : 7
    const slots = []
    for (let d = 1; d <= days; d++)
      for (const t of ['breakfast', 'lunch', 'dinner'])
        slots.push({ day_number: d, meal_type: t, recipe_id: '' })
    return slots
  }

  const handleBuildPlanAddToCart = async () => {
    const meals = buildSlots.filter(s => s.recipe_id).map(s => ({ recipe_id: s.recipe_id, day_number: s.day_number, meal_type: s.meal_type }))
    if (!meals.length) { alert('Select at least one recipe.'); return }
    setAddingBuild(true)
    try {
      const res = await api.post('/customer/recipes/meal-plans/add-to-cart-from-recipes', { name: 'My meal plan', meals, household_size: 1 })
      for (const item of res.data?.items || []) addToCart({ ...item.product, quantity: item.quantity })
      setBuildPlanOpen(false); setBuildSlots([])
      navigate('/cart')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to add to cart.')
    }
    setAddingBuild(false)
  }

  // ── Style helpers ───────────────────────────────────────────────────────────
  const getMealTypeColor = mt => ({ breakfast: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white', lunch: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white', dinner: 'bg-gradient-to-r from-purple-400 to-purple-500 text-white' }[mt] || 'bg-gray-100 text-gray-800')
  const getDifficultyColor = d => ({ easy: 'bg-green-500 text-white', medium: 'bg-yellow-500 text-white', hard: 'bg-red-500 text-white' }[d] || 'bg-gray-100 text-gray-800')

  if (loading && recipes.length === 0 && mealPlans.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <PageBanner title="Recipes & Meal Plans" subtitle="Discover authentic African recipes and meal plans" icon={ChefHat} placement="meals_top_banner" />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <PageBanner
        title="Recipes & Meal Plans"
        subtitle="Discover authentic African recipes and curated meal plans"
        placement="meals_top_banner"
        defaultContent={
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Discover Amazing Meals</h1>
            </div>
            <p className="text-sm sm:text-base text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Explore recipes and let AI build you a personalised meal plan — then add all ingredients to cart in one click!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              {[['Easy Recipes', Sparkles], ['AI Meal Plans', Wand2], ['Family Sized', Users]].map(([t, Icon], i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{t}</span>
                </div>
              ))}
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">

        {/* Tabs */}
        <div className="mb-4 flex justify-center">
          <div className="inline-flex bg-white rounded-xl shadow-lg p-1 border border-gray-200">
            {[['recipes', 'Recipes', Utensils], ['meal-plans', 'Meal Plans', Calendar]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  activeTab === id ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RECIPES TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'recipes' && (
          <>
            <div className="mb-4 bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
              <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-2">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                      placeholder="Recipe name, cuisine…"
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                </div>
                {[
                  { k: 'meal_type',    label: 'Meal type',  opts: [['','All'],['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner']] },
                  { k: 'difficulty',   label: 'Difficulty', opts: [['','All'],['easy','Easy'],['medium','Medium'],['hard','Hard']] },
                  { k: 'prep_time_max',label: 'Max time',   opts: [['','Any'],['30','Under 30 min'],['45','Under 45 min'],['60','Under 60 min'],['90','Under 90 min']] },
                ].map(({ k, label, opts }) => (
                  <div key={k} className="w-28 sm:w-36">
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <select value={filters[k]} onChange={e => setFilters({ ...filters, [k]: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white">
                      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
                <div className="min-w-[100px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cuisine</label>
                  <input type="text" value={filters.cuisine_type} onChange={e => setFilters({ ...filters, cuisine_type: e.target.value })}
                    placeholder="e.g. Nigerian"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                {hasActiveRecipeFilters && (
                  <button onClick={clearRecipeFilters} className="text-sm text-primary-600 hover:underline font-medium">Clear filters</button>
                )}
              </div>
              <p className="text-xs text-gray-500">{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</p>
            </div>

            {recipes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <Utensils className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {hasActiveRecipeFilters ? 'No recipes match your filters.' : "No recipes yet — they're cooking! 👩🏽‍🍳"}
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {hasActiveRecipeFilters
                    ? <button onClick={clearRecipeFilters} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold">Clear filters</button>
                    : <button onClick={() => setActiveTab('meal-plans')} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold">Browse meal plans</button>
                  }
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {recipes.map(recipe => (
                  <Link key={recipe.id} to={`/meals/${recipe.id}`}
                    className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {recipe.image_url
                        ? <img src={resolveImageUrl(recipe.image_url, 'recipe')} alt={recipe.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100"><Utensils className="h-12 w-12 text-primary-300" /></div>
                      }
                      <div className="absolute top-2 right-2 z-10">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${getMealTypeColor(recipe.meal_type)}`}>
                          {recipe.meal_type?.charAt(0).toUpperCase() + recipe.meal_type?.slice(1)}
                        </span>
                      </div>
                      {recipe.difficulty && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${getDifficultyColor(recipe.difficulty)}`}>
                            {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                          </span>
                        </div>
                      )}
                      {recipe.is_featured && (
                        <div className="absolute bottom-2 left-2 z-10">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold shadow-lg bg-amber-500 text-white">Featured</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">{recipe.name}</h3>
                      {recipe.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{recipe.description}</p>}
                      {recipe.cuisine_type && <p className="text-sm font-semibold text-primary-600 mb-2">{recipe.cuisine_type}</p>}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        {recipe.prep_time_minutes != null && <div className="flex items-center gap-1"><Clock className="h-4 w-4 text-primary-500" /><span>Prep: {recipe.prep_time_minutes}m</span></div>}
                        {recipe.cook_time_minutes != null && <div className="flex items-center gap-1"><Clock className="h-4 w-4 text-primary-500" /><span>Cook: {recipe.cook_time_minutes}m</span></div>}
                        <div className="flex items-center gap-1"><Users className="h-4 w-4 text-primary-500" /><span>Serves {recipe.servings || 1}</span></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MEAL PLANS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'meal-plans' && (
          <>
            {/* AI Meal Planner */}
            <div className="mb-6 bg-gradient-to-br from-primary-50 via-white to-amber-50 border border-primary-100 rounded-2xl shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">AI Meal Planner</h2>
                  <p className="text-xs text-gray-500">Describe what you need — AI picks real recipes and builds your full plan</p>
                </div>
              </div>

              {/* Occasion chips */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick start</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {AI_OCCASIONS.map(occ => (
                  <button key={occ.label} onClick={() => handleOccasionClick(occ)} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <span>{occ.emoji}</span>{occ.label}
                  </button>
                ))}
              </div>

              {/* Custom text input */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Or describe your plan</p>
              <div className="flex gap-2 mb-3">
                <input type="text" value={aiRequest}
                  onChange={e => setAiRequest(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generateAIPlan()}
                  placeholder="e.g. 'healthy week for 2', 'Christmas dinner 3 days', 'quick easy weekday'…"
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 bg-white outline-none"
                  disabled={aiLoading} />
                <button onClick={() => generateAIPlan()} disabled={!aiRequest.trim() || aiLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                  {aiLoading
                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Building…</>
                    : <><Sparkles className="h-4 w-4" /> Generate</>
                  }
                </button>
              </div>

              {/* Household size */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Household size:
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 4, 6].map(n => (
                    <button key={n} onClick={() => setAiHouseholdSize(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                        aiHouseholdSize === n ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                      }`}>{n}</button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {aiError && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{aiError}</p>
                </div>
              )}

              {/* Result */}
              {aiPlan && (
                <AIPlanResult plan={aiPlan} onAddToCart={handleAIPlanAddToCart} adding={aiAdding} added={aiAdded} />
              )}
            </div>

            {/* Filter + manual builder */}
            <div className="mb-4 bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Filter:</span>
                <select value={planTypeFilter} onChange={e => setPlanTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white">
                  <option value="all">All Plan Types</option>
                  <option value="one_day">1 Day Plans</option>
                  <option value="one_week">1 Week Plans</option>
                  <option value="one_month">1 Month Plans</option>
                </select>
              </div>
              <button onClick={() => { setBuildPlanOpen(true); setBuildPlanType('one_week'); setBuildSlots(makeBuildSlots('one_week')) }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-primary-400 hover:text-primary-700 text-sm font-semibold transition-colors">
                <Plus className="h-4 w-4" />
                Build manually
              </button>
            </div>

            {/* Suggested plans (marketing portal) */}
            {suggestedPlans.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                  Suggested for you
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {suggestedPlans.map(plan => (
                    <div key={plan.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-50 to-primary-50">
                        {plan.image_url
                          ? <img src={resolveImageUrl(plan.image_url)} alt={plan.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Calendar className="h-12 w-12 text-primary-300" /></div>
                        }
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">Suggested</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-900 mb-1">{plan.name}</h4>
                        {plan.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>}
                        <p className="text-xs text-gray-500 mb-3">{plan.meal_count} meals</p>
                        <button onClick={() => handleSuggestedAddToCart(plan)} disabled={addingSuggested === plan.id}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold disabled:opacity-50">
                          <ShoppingCart className="h-4 w-4" />
                          {addingSuggested === plan.id ? 'Adding…' : 'Add to cart'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All meal plans */}
            {mealPlans.length === 0 && suggestedPlans.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-lg shadow-md border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No saved meal plans yet</h3>
                <p className="text-sm text-gray-500">Use the AI Meal Planner above to generate a personalised plan instantly.</p>
              </div>
            ) : mealPlans.length > 0 ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  All Meal Plans
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {mealPlans.map(plan => (
                    <Link key={plan.id} to={`/meal-plans/${plan.id}`}
                      className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
                        {plan.image_url
                          ? <img src={resolveImageUrl(plan.image_url)} alt={plan.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50"><Calendar className="h-12 w-12 text-primary-300" /></div>
                        }
                        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                          {plan.is_featured && <span className="px-2.5 py-1 rounded-full text-xs font-bold shadow-lg bg-amber-500 text-white">Featured</span>}
                          <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-bold text-primary-600 shadow-lg">
                            {plan.plan_type === 'one_day' ? '1 Day' : plan.plan_type === 'one_week' ? '1 Week' : '1 Month'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">{plan.name}</h3>
                        {plan.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{plan.description}</p>}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Utensils className="h-4 w-4 text-primary-600" />
                            <span className="text-sm font-semibold">{plan.meal_count} {plan.meal_count === 1 ? 'meal' : 'meals'}</span>
                          </div>
                          {plan.price != null && plan.price > 0 && (
                            <p className="text-lg font-bold text-primary-600">${plan.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}

            {/* Manual builder modal */}
            {buildPlanOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-start justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Build your meal plan manually</h3>
                    <button onClick={() => setBuildPlanOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-600 mb-3">Select recipes for each slot. Ingredients will be added to your cart.</p>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plan length</label>
                      <select value={buildPlanType} onChange={e => { const v = e.target.value; setBuildPlanType(v); setBuildSlots(makeBuildSlots(v)) }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="one_day">1 Day (3 meals)</option>
                        <option value="one_week">1 Week (21 meals)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      {buildSlots.map((slot, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="w-20 font-medium">Day {slot.day_number}</span>
                          <span className="w-20 capitalize text-gray-600">{slot.meal_type}</span>
                          <select value={slot.recipe_id}
                            onChange={e => { const next = [...buildSlots]; next[idx] = { ...slot, recipe_id: e.target.value }; setBuildSlots(next) }}
                            className="flex-1 min-w-[180px] px-2 py-1.5 border border-gray-300 rounded-lg">
                            <option value="">— Select recipe —</option>
                            {(recipes.filter(r => (r.meal_type || 'dinner') === slot.meal_type).length
                              ? recipes.filter(r => (r.meal_type || 'dinner') === slot.meal_type)
                              : recipes
                            ).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={() => setBuildPlanOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancel</button>
                    <button onClick={handleBuildPlanAddToCart} disabled={addingBuild}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {addingBuild ? 'Adding…' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Meals
