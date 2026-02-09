import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'

const SocialMediaCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    platform: 'facebook',
    content: '',
    image_url: '',
    video_url: '',
    link_url: '',
    scheduled_at: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/admin/marketing/social-media', {
        platform: formData.platform,
        content: formData.content,
        image_url: formData.image_url || null,
        video_url: formData.video_url || null,
        link_url: formData.link_url || null,
        scheduled_at: formData.scheduled_at || null
      })
      navigate('/social-media')
    } catch (error) {
      alert('Failed to create post: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-5 w-5" />
      case 'instagram': return <Instagram className="h-5 w-5" />
      case 'twitter': return <Twitter className="h-5 w-5" />
      case 'linkedin': return <Linkedin className="h-5 w-5" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/social-media" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Social Media
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Social Media Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
          <select
            id="platform"
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            id="content"
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows="6"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Write your post content..."
          />
        </div>

        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
          <input
            type="url"
            id="image_url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div>
          <label htmlFor="video_url" className="block text-sm font-medium text-gray-700 mb-1">Video URL (Optional)</label>
          <input
            type="url"
            id="video_url"
            value={formData.video_url}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com/video.mp4"
          />
        </div>

        <div>
          <label htmlFor="link_url" className="block text-sm font-medium text-gray-700 mb-1">Link URL (Optional)</label>
          <input
            type="url"
            id="link_url"
            value={formData.link_url}
            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 mb-1">
            Schedule (Optional - leave blank to save as draft)
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
          {getPlatformIcon(formData.platform)}
          <Save className="h-5 w-5" />
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  )
}

export default SocialMediaCreate

