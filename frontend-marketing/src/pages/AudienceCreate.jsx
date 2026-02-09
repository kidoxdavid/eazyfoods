import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Filter } from 'lucide-react'

const AudienceCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria: {
      min_order_value: '',
      signup_days: '',
      city: '',
      has_orders: false
    }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Clean criteria - remove empty values
      const cleanCriteria = {}
      if (formData.criteria.min_order_value) cleanCriteria.min_order_value = parseFloat(formData.criteria.min_order_value)
      if (formData.criteria.signup_days) cleanCriteria.signup_days = parseInt(formData.criteria.signup_days)
      if (formData.criteria.city) cleanCriteria.city = formData.criteria.city
      if (formData.criteria.has_orders) cleanCriteria.has_orders = true

      await api.post('/admin/marketing/audiences', {
        name: formData.name,
        description: formData.description,
        criteria: cleanCriteria
      })
      navigate('/audiences')
    } catch (error) {
      alert('Failed to create audience: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/audiences" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Audiences
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Audience</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Audience Name</label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., High-Value Customers"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Describe this audience segment"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Segmentation Criteria</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="min_order_value" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Value ($)
              </label>
              <input
                type="number"
                id="min_order_value"
                min="0"
                step="0.01"
                value={formData.criteria.min_order_value}
                onChange={(e) => setFormData({
                  ...formData,
                  criteria: { ...formData.criteria, min_order_value: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 100"
              />
            </div>

            <div>
              <label htmlFor="signup_days" className="block text-sm font-medium text-gray-700 mb-1">
                Signed Up Within Last (Days)
              </label>
              <input
                type="number"
                id="signup_days"
                min="1"
                value={formData.criteria.signup_days}
                onChange={(e) => setFormData({
                  ...formData,
                  criteria: { ...formData.criteria, signup_days: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 30"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.criteria.city}
                onChange={(e) => setFormData({
                  ...formData,
                  criteria: { ...formData.criteria, city: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Toronto"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="has_orders"
                checked={formData.criteria.has_orders}
                onChange={(e) => setFormData({
                  ...formData,
                  criteria: { ...formData.criteria, has_orders: e.target.checked }
                })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="has_orders" className="ml-2 block text-sm text-gray-700">
                Has placed at least one order
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="h-5 w-5" />
          {loading ? 'Creating...' : 'Create Audience'}
        </button>
      </form>
    </div>
  )
}

export default AudienceCreate

