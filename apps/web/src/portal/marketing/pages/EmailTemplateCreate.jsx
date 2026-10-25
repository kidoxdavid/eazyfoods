import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, FileText } from 'lucide-react'

const EmailTemplateCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'promotional',
    subject: '',
    html_content: '',
    text_content: '',
    thumbnail_url: '',
    is_public: false
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/admin/marketing/email-templates', {
        name: formData.name,
        category: formData.category,
        subject: formData.subject,
        html_content: formData.html_content,
        text_content: formData.text_content,
        thumbnail_url: formData.thumbnail_url || null,
        is_public: formData.is_public
      })
      navigate('/email-templates')
    } catch (error) {
      alert('Failed to create template: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/email-templates" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Email Templates
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Email Template</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Welcome Email"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="promotional">Promotional</option>
              <option value="transactional">Transactional</option>
              <option value="newsletter">Newsletter</option>
              <option value="welcome">Welcome</option>
              <option value="abandoned_cart">Abandoned Cart</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject Line *</label>
          <input
            type="text"
            id="subject"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Email subject line"
          />
        </div>

        <div>
          <label htmlFor="thumbnail_url" className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
          <input
            type="url"
            id="thumbnail_url"
            value={formData.thumbnail_url}
            onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com/thumbnail.jpg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content *</label>
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-2">Enter HTML content for your email template. You can use HTML tags like &lt;p&gt;, &lt;h1&gt;, &lt;img&gt;, &lt;a&gt;, etc.</p>
          </div>
          <textarea
            value={formData.html_content}
            onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
            rows="15"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            placeholder="<html><body><h1>Your Email Content</h1><p>Enter your HTML here...</p></body></html>"
            required
          />
        </div>

        <div>
          <label htmlFor="text_content" className="block text-sm font-medium text-gray-700 mb-1">Plain Text Content</label>
          <textarea
            id="text_content"
            value={formData.text_content}
            onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
            rows="6"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Plain text version (optional)"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_public"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
            Make this template available to vendors
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FileText className="h-5 w-5" />
          <Save className="h-5 w-5" />
          {loading ? 'Creating...' : 'Create Template'}
        </button>
      </form>
    </div>
  )
}

export default EmailTemplateCreate

