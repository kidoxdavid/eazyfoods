import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Send, Mail } from 'lucide-react'

const EmailEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    from_name: 'eazyfoods',
    from_email: 'noreply@eazyfoods.com',
    html_content: '',
    text_content: '',
    recipient_list: [],
    scheduled_at: ''
  })

  useEffect(() => {
    if (isEdit) {
      fetchCampaign()
    }
  }, [id])

  const fetchCampaign = async () => {
    try {
      const response = await api.get(`/admin/marketing/email-campaigns/${id}`)
      const campaign = response.data
      setFormData({
        name: campaign.name || '',
        subject: campaign.subject || '',
        from_name: campaign.from_name || 'eazyfoods',
        from_email: campaign.from_email || 'noreply@eazyfoods.com',
        html_content: campaign.html_content || '',
        text_content: campaign.text_content || '',
        recipient_list: campaign.recipient_list || [],
        scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.split('T')[0] : ''
      })
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...formData,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null
      }
      
      if (isEdit) {
        await api.put(`/admin/marketing/email-campaigns/${id}`, data)
      } else {
        await api.post('/admin/marketing/email-campaigns', data)
      }
      
      alert(isEdit ? 'Email campaign updated' : 'Email campaign created')
      navigate('/email-campaigns')
    } catch (error) {
      alert('Failed to save email campaign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/email-campaigns" className="text-primary-600 hover:text-primary-700 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Email Campaigns
      </Link>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Email Campaign Editor</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Summer Sale Email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Get 20% off on all products!"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
              <input
                type="text"
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
              <input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">HTML Content</label>
            <textarea
              value={formData.html_content}
              onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="<html>...</html>"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plain Text Content</label>
            <textarea
              value={formData.text_content}
              onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="Plain text version..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Send (Optional)</label>
            <input
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Now
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default EmailEditor

