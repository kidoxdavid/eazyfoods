import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Workflow } from 'lucide-react'

const AutomationCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'customer_signup',
    actions: [{ type: 'send_email', config: {} }]
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/admin/marketing/automation', {
        name: formData.name,
        description: formData.description,
        trigger_type: formData.trigger_type,
        actions: formData.actions
      })
      navigate('/automation')
    } catch (error) {
      alert('Failed to create workflow: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/automation" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Automation
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Automation Workflow</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Welcome Series"
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
            placeholder="Describe this workflow"
          />
        </div>

        <div>
          <label htmlFor="trigger_type" className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
          <select
            id="trigger_type"
            required
            value={formData.trigger_type}
            onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="customer_signup">Customer Signs Up</option>
            <option value="cart_abandoned">Cart Abandoned</option>
            <option value="order_delivered">Order Delivered</option>
            <option value="order_cancelled">Order Cancelled</option>
            <option value="first_order">First Order</option>
            <option value="subscription_renewal">Subscription Renewal</option>
          </select>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Actions:</strong> This workflow will send an email when triggered. You can add more actions after creation.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Workflow className="h-5 w-5" />
          <Save className="h-5 w-5" />
          {loading ? 'Creating...' : 'Create Workflow'}
        </button>
      </form>
    </div>
  )
}

export default AutomationCreate

