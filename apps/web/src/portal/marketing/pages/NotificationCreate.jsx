import { useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, MessageSquare, Smartphone } from 'lucide-react'

const NotificationCreate = () => {
  const { type } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: type || 'sms',
    title: '',
    message: '',
    scheduled_at: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/admin/marketing/notifications', {
        type: formData.type,
        title: formData.title,
        message: formData.message,
        scheduled_at: formData.scheduled_at || null
      })
      navigate('/notifications')
    } catch (error) {
      alert('Failed to create notification: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/notifications" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Notifications
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Create {formData.type.toUpperCase()} Notification
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="sms">SMS</option>
            <option value="push">Push Notification</option>
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Notification title"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            id="message"
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows="5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Enter your notification message"
          />
          {formData.type === 'sms' && (
            <p className="mt-1 text-xs text-gray-500">SMS messages should be concise (160 characters recommended)</p>
          )}
        </div>

        <div>
          <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 mb-1">
            Schedule (Optional - leave blank to send immediately)
          </label>
          <input
            type="datetime-local"
            id="scheduled_at"
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {formData.type === 'sms' ? <MessageSquare className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          {loading ? 'Creating...' : `Create ${formData.type.toUpperCase()} Notification`}
        </button>
      </form>
    </div>
  )
}

export default NotificationCreate

