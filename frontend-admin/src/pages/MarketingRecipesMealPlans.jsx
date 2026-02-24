import { useEffect, useState } from 'react'
import api from '../services/api'
import { ChefHat, Calendar, Star, ArrowUpDown } from 'lucide-react'

const MarketingRecipesMealPlans = () => {
  const [activeTab, setActiveTab] = useState('recipes')
  const [recipes, setRecipes] = useState([])
  const [mealPlans, setMealPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [localFeatured, setLocalFeatured] = useState({})
  const [localSortOrder, setLocalSortOrder] = useState({})

  useEffect(() => {
    if (activeTab === 'recipes') fetchRecipes()
    else fetchMealPlans()
  }, [activeTab])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/marketing/recipes', { params: { limit: 500 } })
      const list = Array.isArray(res.data) ? res.data : []
      setRecipes(list)
      const feat = {}
      const sort = {}
      list.forEach((r) => {
        feat[r.id] = !!r.is_featured
        sort[r.id] = r.sort_order != null ? r.sort_order : ''
      })
      setLocalFeatured(feat)
      setLocalSortOrder(sort)
    } catch (e) {
      console.error('Failed to fetch recipes:', e)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMealPlans = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/marketing/meal-plans', { params: { limit: 500 } })
      const list = Array.isArray(res.data) ? res.data : []
      setMealPlans(list)
      const feat = {}
      const sort = {}
      list.forEach((p) => {
        feat[p.id] = !!p.is_featured
        sort[p.id] = p.sort_order != null ? p.sort_order : ''
      })
      setLocalFeatured(feat)
      setLocalSortOrder(sort)
    } catch (e) {
      console.error('Failed to fetch meal plans:', e)
      setMealPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handleRecipeFeatured = (id, value) => {
    setLocalFeatured((prev) => ({ ...prev, [id]: value }))
  }

  const handleRecipeSortOrder = (id, value) => {
    const num = value === '' ? '' : parseInt(value, 10)
    if (num !== '' && isNaN(num)) return
    setLocalSortOrder((prev) => ({ ...prev, [id]: num }))
  }

  const saveRecipe = async (id) => {
    setSavingId(id)
    try {
      await api.put(`/admin/marketing/recipes/${id}`, {
        is_featured: localFeatured[id],
        sort_order: localSortOrder[id] === '' ? null : localSortOrder[id]
      })
      await fetchRecipes()
    } catch (e) {
      console.error('Failed to update recipe:', e)
      alert(e.response?.data?.detail || 'Failed to update recipe')
    } finally {
      setSavingId(null)
    }
  }

  const saveMealPlan = async (id) => {
    setSavingId(id)
    try {
      await api.put(`/admin/marketing/meal-plans/${id}`, {
        is_featured: localFeatured[id],
        sort_order: localSortOrder[id] === '' ? null : localSortOrder[id]
      })
      await fetchMealPlans()
    } catch (e) {
      console.error('Failed to update meal plan:', e)
      alert(e.response?.data?.detail || 'Failed to update meal plan')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Recipes & Meal Plans</h1>
        <p className="text-sm text-gray-600 mt-1">Set featured and sort order for customer Meals page</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'recipes'
              ? 'border-primary-600 text-primary-600 bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <ChefHat className="h-4 w-4 inline mr-2" />
          Recipes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meal-plans')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'meal-plans'
              ? 'border-primary-600 text-primary-600 bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Meal Plans
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : activeTab === 'recipes' ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Meal type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <Star className="h-4 w-4 inline mr-1" /> Featured
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <ArrowUpDown className="h-4 w-4 inline mr-1" /> Sort order
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipes.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.meal_type || '—'}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!localFeatured[r.id]}
                          onChange={(e) => handleRecipeFeatured(r.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">Featured</span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={localSortOrder[r.id] === '' ? '' : localSortOrder[r.id]}
                        onChange={(e) => handleRecipeSortOrder(r.id, e.target.value)}
                        placeholder="—"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => saveRecipe(r.id)}
                        disabled={savingId === r.id}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                      >
                        {savingId === r.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recipes.length === 0 && (
            <p className="text-center text-gray-500 py-8">No recipes found. Add recipes in Marketing.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plan type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <Star className="h-4 w-4 inline mr-1" /> Featured
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <ArrowUpDown className="h-4 w-4 inline mr-1" /> Sort order
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mealPlans.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.plan_type || '—'}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!localFeatured[p.id]}
                          onChange={(e) => setLocalFeatured((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">Featured</span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={localSortOrder[p.id] === '' ? '' : localSortOrder[p.id]}
                        onChange={(e) => {
                          const v = e.target.value
                          const num = v === '' ? '' : parseInt(v, 10)
                          if (num !== '' && isNaN(num)) return
                          setLocalSortOrder((prev) => ({ ...prev, [p.id]: num }))
                        }}
                        placeholder="—"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => saveMealPlan(p.id)}
                        disabled={savingId === p.id}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                      >
                        {savingId === p.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mealPlans.length === 0 && (
            <p className="text-center text-gray-500 py-8">No meal plans found. Create meal plans in Marketing.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default MarketingRecipesMealPlans
