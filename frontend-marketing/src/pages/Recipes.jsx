import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Utensils, Plus, Edit, Eye, Trash2, Filter } from 'lucide-react'

const Recipes = () => {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [mealTypeFilter, setMealTypeFilter] = useState('all')

  useEffect(() => {
    fetchRecipes()
  }, [mealTypeFilter])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const params = { limit: 1000 }
      if (mealTypeFilter !== 'all') params.meal_type = mealTypeFilter
      const response = await api.get('/admin/marketing/recipes', { params })
      setRecipes(response.data || [])
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (recipeId) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return
    try {
      await api.delete(`/admin/marketing/recipes/${recipeId}`)
      alert('Recipe deleted successfully')
      fetchRecipes()
    } catch (error) {
      alert('Failed to delete recipe: ' + (error.response?.data?.detail || error.message))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
          <p className="text-gray-600 mt-1">Manage recipes for meal plans</p>
        </div>
        <Link
          to="/recipes/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Recipe
        </Link>
      </div>

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {recipe.image_url && (
              <div className="aspect-[16/9] max-h-24 sm:max-h-28 bg-gray-100 overflow-hidden">
                <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">{recipe.name}</h3>
                  <div className="flex gap-1 flex-wrap">
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800 rounded capitalize">
                      {recipe.meal_type}
                    </span>
                    {recipe.difficulty && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-800 rounded capitalize">
                        {recipe.difficulty}
                      </span>
                    )}
                    {recipe.is_active ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-800 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-800 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {recipe.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{recipe.description}</p>
              )}

              <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                {recipe.prep_time_minutes && (
                  <span>Prep: {recipe.prep_time_minutes}m</span>
                )}
                {recipe.cook_time_minutes && (
                  <span>Cook: {recipe.cook_time_minutes}m</span>
                )}
                <span>Serves: {recipe.servings}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  to={`/recipes/${recipe.id}/edit`}
                  className="flex-1 px-2 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center justify-center gap-1 text-xs"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(recipe.id)}
                  className="px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                >
                  <Trash2 className="h-3 w-3" />
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
    </div>
  )
}

export default Recipes

