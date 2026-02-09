import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { FileImage, Video, FileText, Plus, Download, Trash2, Eye } from 'lucide-react'

const ContentLibrary = () => {
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchContent()
  }, [filter])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const params = { limit: 1000 }
      if (filter !== 'all') params.content_type = filter
      const response = await api.get('/admin/marketing/content-library', { params })
      setContent(response.data || [])
    } catch (error) {
      console.error('Failed to fetch content:', error)
      setContent([])
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return <FileImage className="h-5 w-5" />
      case 'video': return <Video className="h-5 w-5" />
      case 'document': return <FileText className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
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
          <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
          <p className="text-gray-600 mt-1">Manage all your marketing assets and content</p>
        </div>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Upload Content
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'image', 'video', 'document', 'template', 'banner'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === type
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {content.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {item.thumbnail_url && (
              <div className="aspect-video bg-gray-100 overflow-hidden">
                <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(item.content_type)}
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                </div>
              </div>
              {item.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{item.content_type}</span>
                {item.file_size && <span>{(item.file_size / 1024).toFixed(0)} KB</span>}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" />
                  View
                </button>
                <button className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs">
                  <Download className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {content.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileImage className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No content in library</p>
          <button className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Upload Your First Asset
          </button>
        </div>
      )}
    </div>
  )
}

export default ContentLibrary

