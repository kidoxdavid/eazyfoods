import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Calendar, Plus, Edit, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react'

const MealPlans = () => {
  const [mealPlans, setMealPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [planTypeFilter, setPlanTypeFilter] = useState('all')

  useEffect(() => {
    fetchMealPlans()
  }, [planTypeFilter])

  const fetchMealPlans = async () => {
    setLoading(true)
    try {
      const params = { limit: 1000 }
      if (planTypeFilter !== 'all') params.plan_type = planTypeFilter
      const response = await api.get('/admin/marketing/meal-plans', { params })
      setMealPlans(response.data || [])
    } catch (error) {
      console.error('Failed to fetch meal plans:', error)
      setMealPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (planId) => {
    try {
      await api.put(`/admin/marketing/meal-plans/${planId}/publish`)
      alert('Meal plan published successfully')
      fetchMealPlans()
    } catch (error) {
      alert('Failed to publish meal plan: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDelete = async (planId) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) return
    try {
      await api.delete(`/admin/marketing/meal-plans/${planId}`)
      alert('Meal plan deleted successfully')
      fetchMealPlans()
    } catch (error) {
      alert('Failed to delete meal plan: ' + (error.response?.data?.detail || error.message))
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
          <h1 className="text-3xl font-bold text-gray-900">Meal Plans</h1>
          <p className="text-gray-600 mt-1">Create and manage meal plans for customers</p>
        </div>
        <Link
          to="/meal-plans/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Meal Plan
        </Link>
      </div>

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
                    onClick={() => handlePublish(plan.id)}
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
                  onClick={() => handleDelete(plan.id)}
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
    </div>
  )
}

export default MealPlans

