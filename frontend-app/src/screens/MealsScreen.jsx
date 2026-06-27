import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Utensils, Calendar, Clock, Users, Filter, X, Loader2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'

const MEAL_TYPES = ['breakfast','lunch','dinner','snack','dessert']
const CUISINES   = ['African','West African','East African','Nigerian','Ghanaian','Ethiopian','Mediterranean','Asian','Italian','American']
const DIFFS      = ['easy','medium','hard']

export default function MealsScreen() {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { success } = useToast()
  const [tab, setTab]               = useState('recipes') // 'recipes' | 'meal-plans'
  const [recipes, setRecipes]       = useState([])
  const [plans, setPlans]           = useState([])
  const [suggested, setSuggested]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters]       = useState({ search: '', meal_type: '', cuisine_type: '', difficulty: '' })
  const [planType, setPlanType]     = useState('all')
  const searchTimeout = useRef(null)

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      if (tab === 'recipes') fetchRecipes()
      else { fetchPlans(); fetchSuggested() }
    }, filters.search ? 350 : 0)
  }, [filters, planType, tab])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const p = {}
      if (filters.meal_type)    p.meal_type    = filters.meal_type
      if (filters.cuisine_type) p.cuisine_type = filters.cuisine_type
      if (filters.difficulty)   p.difficulty   = filters.difficulty
      if (filters.search)       p.search       = filters.search
      const res = await api.get('/customer/recipes/', { params: p })
      setRecipes(Array.isArray(res.data) ? res.data : (res.data?.recipes || []))
    } catch (_) { setRecipes([]) }
    setLoading(false)
  }

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const p = planType !== 'all' ? { plan_type: planType } : {}
      const res = await api.get('/customer/recipes/meal-plans', { params: p })
      setPlans(Array.isArray(res.data) ? res.data : (res.data?.plans || []))
    } catch (_) { setPlans([]) }
    setLoading(false)
  }

  const fetchSuggested = async () => {
    try {
      const res = await api.get('/customer/recipes/meal-plans/suggested')
      setSuggested(Array.isArray(res.data) ? res.data : [])
    } catch (_) { setSuggested([]) }
  }

  const addPlanToCart = async (plan) => {
    if (!plan?.id) return
    try {
      await api.post(`/customer/recipes/meal-plans/${plan.id}/add-to-cart`)
      success('Meal plan added to cart!')
    } catch (_) { success('Could not add to cart') }
  }

  const diffColor = { easy: 'text-green-600 bg-green-50', medium: 'text-amber-600 bg-amber-50', hard: 'text-red-600 bg-red-50' }

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title="Meals & Recipes" />

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100">
        {['recipes','meal-plans'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-primary-700 border-b-2 border-primary-700' : 'text-gray-400'}`}>
            {t === 'recipes' ? '🍳 Recipes' : '📅 Meal Plans'}
          </button>
        ))}
      </div>

      <div className="flex-1 scroll-content mb-tab">
        {/* Search + filter bar */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Search recipes…"
                className="w-full h-10 pl-9 pr-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            {tab === 'recipes' && (
              <button onClick={() => setShowFilters(!showFilters)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center press-scale ${showFilters ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Filter className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Recipe filters */}
          {tab === 'recipes' && showFilters && (
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                <span className="flex-shrink-0 text-[10px] text-gray-500 self-center pr-1">Type:</span>
                <button onClick={() => setFilters(f => ({ ...f, meal_type: '' }))}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium press-scale ${!filters.meal_type ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
                {MEAL_TYPES.map(m => (
                  <button key={m} onClick={() => setFilters(f => ({ ...f, meal_type: f.meal_type === m ? '' : m }))}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium press-scale capitalize ${filters.meal_type === m ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                <span className="flex-shrink-0 text-[10px] text-gray-500 self-center pr-1">Diff:</span>
                <button onClick={() => setFilters(f => ({ ...f, difficulty: '' }))}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium press-scale ${!filters.difficulty ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
                {DIFFS.map(d => (
                  <button key={d} onClick={() => setFilters(f => ({ ...f, difficulty: f.difficulty === d ? '' : d }))}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium press-scale capitalize ${filters.difficulty === d ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Plan type filter */}
          {tab === 'meal-plans' && (
            <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {['all','one_week','two_weeks','monthly'].map(t => (
                <button key={t} onClick={() => setPlanType(t)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold press-scale ${planType === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t === 'all' ? 'All' : t === 'one_week' ? '1 Week' : t === 'two_weeks' ? '2 Weeks' : 'Monthly'}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
          </div>
        )}

        {/* RECIPES */}
        {!loading && tab === 'recipes' && (
          <div className="p-4 space-y-3">
            {recipes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-2">🍽️</p><p>No recipes found</p>
              </div>
            ) : recipes.map(recipe => {
              const img = resolveImg(recipe.image_url)
              return (
                <div key={recipe.id} onClick={() => navigate(`/meals/recipe/${recipe.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm press-scale flex gap-3 p-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {img
                      ? <img src={img} alt={recipe.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🍳</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-1">{recipe.name || recipe.title}</p>
                    {recipe.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{recipe.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {recipe.prep_time && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                          <Clock className="h-3 w-3" />{recipe.prep_time}min
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                          <Users className="h-3 w-3" />{recipe.servings}
                        </span>
                      )}
                      {recipe.difficulty && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${diffColor[recipe.difficulty] || 'text-gray-500 bg-gray-50'}`}>
                          {recipe.difficulty}
                        </span>
                      )}
                      {recipe.meal_type && (
                        <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full capitalize">
                          {recipe.meal_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MEAL PLANS */}
        {!loading && tab === 'meal-plans' && (
          <div className="p-4 space-y-4">
            {suggested.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-900 mb-2">✨ Suggested for you</p>
                <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {suggested.map(plan => {
                    const img = resolveImg(plan.image_url)
                    return (
                      <div key={plan.id} className="flex-shrink-0 w-44 bg-white rounded-2xl shadow-sm overflow-hidden press-scale">
                        <div className="h-24 bg-gray-100">
                          {img ? <img src={img} alt={plan.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">📅</div>}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-gray-900 line-clamp-1">{plan.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{plan.total_days || '?'} days</p>
                          <button onClick={() => addPlanToCart(plan)}
                            className="mt-2 w-full bg-primary-600 text-white text-[10px] font-bold py-1.5 rounded-lg press-scale">
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {plans.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-2">📅</p><p>No meal plans found</p>
              </div>
            ) : plans.map(plan => {
              const img = resolveImg(plan.image_url)
              return (
                <div key={plan.id} className="bg-white rounded-2xl shadow-sm overflow-hidden press-scale">
                  <div className="h-32 bg-gray-100 relative">
                    {img ? <img src={img} alt={plan.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📅</div>}
                    {plan.plan_type && (
                      <span className="absolute top-2 right-2 bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {plan.plan_type?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                    {plan.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.description}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{plan.total_days || '?'} days</span>
                        {plan.total_meals && <><span>·</span><span>{plan.total_meals} meals</span></>}
                      </div>
                      <button onClick={() => addPlanToCart(plan)}
                        className="bg-primary-600 text-white text-xs font-bold px-4 py-1.5 rounded-full press-scale">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
