import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, FlaskConical } from 'lucide-react'

const ABTestCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    test_type: 'ad',
    variant_a_name: 'Variant A',
    variant_b_name: 'Variant B',
    start_date: '',
    end_date: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/admin/marketing/ab-tests', {
        name: formData.name,
        description: formData.description,
        test_type: formData.test_type,
        variant_a_name: formData.variant_a_name,
        variant_b_name: formData.variant_b_name,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      })
      navigate('/ab-testing')
    } catch (error) {
      alert('Failed to create test: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/ab-testing" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to A/B Testing
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create A/B Test</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Homepage Banner Test"
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
            placeholder="Describe what you're testing"
          />
        </div>

        <div>
          <label htmlFor="test_type" className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
          <select
            id="test_type"
            required
            value={formData.test_type}
            onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="ad">Ad</option>
            <option value="email">Email</option>
            <option value="landing_page">Landing Page</option>
            <option value="subject_line">Subject Line</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="variant_a_name" className="block text-sm font-medium text-gray-700 mb-1">Variant A Name *</label>
            <input
              type="text"
              id="variant_a_name"
              required
              value={formData.variant_a_name}
              onChange={(e) => setFormData({ ...formData, variant_a_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="variant_b_name" className="block text-sm font-medium text-gray-700 mb-1">Variant B Name *</label>
            <input
              type="text"
              id="variant_b_name"
              required
              value={formData.variant_b_name}
              onChange={(e) => setFormData({ ...formData, variant_b_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              id="start_date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              id="end_date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After creating the test, you'll need to link your ad/email variants to this test in the next step.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FlaskConical className="h-5 w-5" />
          <Save className="h-5 w-5" />
          {loading ? 'Creating...' : 'Create A/B Test'}
        </button>
      </form>
    </div>
  )
}

export default ABTestCreate

