import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { FileText, Plus, Eye } from 'lucide-react'

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/email-templates')
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-1">Manage email templates for campaigns</p>
        </div>
        <Link
          to="/email-templates/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                {template.category && (
                  <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                )}
              </div>
              <FileText className="h-5 w-5 text-primary-500" />
            </div>

            {template.thumbnail_url && (
              <img
                src={template.thumbnail_url}
                alt={template.name}
                className="w-full h-32 object-cover rounded mb-4"
              />
            )}

            {template.subject && (
              <p className="text-sm text-gray-600 mb-4">{template.subject}</p>
            )}

            <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 text-sm">
              <Eye className="h-4 w-4" />
              Use Template
            </button>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No templates found</p>
        </div>
      )}
    </div>
  )
}

export default EmailTemplates

