import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Utensils, Calendar, Plus, Edit, Trash2, CheckCircle } from 'lucide-react'

const RecipesAndMealPlans = () => {
  const [activeTab, setActiveTab] = useState('recipes') // 'recipes' or 'meal-plans'
  const [recipes, setRecipes] = useState([])
  const [mealPlans, setMealPlans] = useState([])
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [mealPlansLoading, setMealPlansLoading] = useState(true)
  const [mealTypeFilter, setMealTypeFilter] = useState('all')
  const [planTypeFilter, setPlanTypeFilter] = useState('all')

  useEffect(() => {
    fetchRecipes()
    fetchMealPlans()
  }, [])

  useEffect(() => {
    if (activeTab === 'recipes') {
      fetchRecipes()
    } else {
      fetchMealPlans()
    }
  }, [activeTab, mealTypeFilter, planTypeFilter])

  const fetchRecipes = async () => {
    setRecipesLoading(true)
    try {
      const params = { limit: 1000 }
      if (mealTypeFilter !== 'all') params.meal_type = mealTypeFilter
      const response = await api.get('/admin/marketing/recipes', { params })
      setRecipes(response.data || [])
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
      setRecipes([])
    } finally {
      setRecipesLoading(false)
    }
  }

  const fetchMealPlans = async () => {
    setMealPlansLoading(true)
    try {
      const params = { limit: 1000 }
      if (planTypeFilter !== 'all') params.plan_type = planTypeFilter
      const response = await api.get('/admin/marketing/meal-plans', { params })
      setMealPlans(response.data || [])
    } catch (error) {
      console.error('Failed to fetch meal plans:', error)
      setMealPlans([])
    } finally {
      setMealPlansLoading(false)
    }
  }

  const handleDeleteRecipe = async (recipeId) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return
    try {
      await api.delete(`/admin/marketing/recipes/${recipeId}`)
      alert('Recipe deleted successfully')
      fetchRecipes()
    } catch (error) {
      alert('Failed to delete recipe: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handlePublishMealPlan = async (planId) => {
    try {
      await api.put(`/admin/marketing/meal-plans/${planId}/publish`)
      alert('Meal plan published successfully')
      fetchMealPlans()
    } catch (error) {
      alert('Failed to publish meal plan: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteMealPlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) return
    try {
      await api.delete(`/admin/marketing/meal-plans/${planId}`)
      alert('Meal plan deleted successfully')
      fetchMealPlans()
    } catch (error) {
      alert('Failed to delete meal plan: ' + (error.response?.data?.detail || error.message))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipes & Meal Plans</h1>
          <p className="text-gray-600 mt-1">Manage recipes and meal plans for customers</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'recipes' ? (
            <Link
              to="/recipes/new"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Recipe
            </Link>
          ) : (
            <Link
              to="/meal-plans/new"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Meal Plan
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'recipes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Utensils className="h-5 w-5" />
            Recipes
          </button>
          <button
            onClick={() => setActiveTab('meal-plans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'meal-plans'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="h-5 w-5" />
            Meal Plans
          </button>
        </nav>
      </div>

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'breakfast', 'lunch', 'dinner'].map((type) => (
              <button
                key={type}
                onClick={() => setMealTypeFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mealTypeFilter === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Recipes Grid */}
          {recipesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    {recipe.image_url && (
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{recipe.name}</h3>
                          <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                              {recipe.meal_type}
                            </span>
                            {recipe.difficulty && (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                                {recipe.difficulty}
                              </span>
                            )}
                            {recipe.is_active ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {recipe.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        {recipe.prep_time_minutes && (
                          <span>Prep: {recipe.prep_time_minutes}min</span>
                        )}
                        {recipe.cook_time_minutes && (
                          <span>Cook: {recipe.cook_time_minutes}min</span>
                        )}
                        <span>Serves: {recipe.servings}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/recipes/${recipe.id}/edit`}
                          className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-1 text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {recipes.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Utensils className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2 text-lg">No recipes found</p>
                  <Link
                    to="/recipes/new"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create Your First Recipe
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Meal Plans Tab */}
      {activeTab === 'meal-plans' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'one_day', 'one_week', 'one_month'].map((type) => (
              <button
                key={type}
                onClick={() => setPlanTypeFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  planTypeFilter === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type === 'one_day' ? '1 Day' : type === 'one_week' ? '1 Week' : type === 'one_month' ? '1 Month' : 'All'}
              </button>
            ))}
          </div>

          {/* Meal Plans Grid */}
          {mealPlansLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mealPlans.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    {plan.image_url && (
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img src={plan.image_url} alt={plan.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                          <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {plan.plan_type === 'one_day' ? '1 Day' : plan.plan_type === 'one_week' ? '1 Week' : '1 Month'}
                            </span>
                            {plan.is_live ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Live
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {plan.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>
                      )}

                      <div className="text-sm text-gray-500 mb-4">
                        <p>{plan.meals?.length || 0} meals included</p>
                        {plan.price && (
                          <p className="font-semibold text-gray-900 mt-1">${plan.price.toFixed(2)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!plan.is_live && (
                          <button
                            onClick={() => handlePublishMealPlan(plan.id)}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-1 text-sm"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Publish
                          </button>
                        )}
                        <Link
                          to={`/meal-plans/${plan.id}/edit`}
                          className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-1 text-sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteMealPlan(plan.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {mealPlans.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Calendar className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2 text-lg">No meal plans found</p>
                  <Link
                    to="/meal-plans/new"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create Your First Meal Plan
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default RecipesAndMealPlans

