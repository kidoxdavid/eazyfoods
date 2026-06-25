import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Facebook, Instagram, Twitter, Linkedin, Send } from 'lucide-react'

// Platform content limits
const CHAR_LIMITS = {
  facebook: 63206,
  instagram: 2200,
  twitter: 280,
  linkedin: 3000,
}

const PLATFORM_META = {
  facebook:  { label: 'Facebook',  Icon: Facebook,  color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  instagram: { label: 'Instagram', Icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  twitter:   { label: 'Twitter / X', Icon: Twitter,  color: 'text-sky-500',  bg: 'bg-sky-50 border-sky-200' },
  linkedin:  { label: 'LinkedIn',  Icon: Linkedin,  color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
}

const SocialMediaCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [publishNow, setPublishNow] = useState(false)
  const [publishResult, setPublishResult] = useState(null)
  const [formData, setFormData] = useState({
    platform: 'facebook',
    content: '',
    image_url: '',
    video_url: '',
    link_url: '',
    scheduled_at: ''
  })

  const limit = CHAR_LIMITS[formData.platform]
  const remaining = limit - formData.content.length
  const overLimit = remaining < 0
  const { Icon, color, bg } = PLATFORM_META[formData.platform] || {}

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (overLimit) return
    setLoading(true)
    setPublishResult(null)

    try {
      const createRes = await api.post('/admin/marketing/social-media', {
        platform: formData.platform,
        content: formData.content,
        image_url: formData.image_url || null,
        video_url: formData.video_url || null,
        link_url: formData.link_url || null,
        scheduled_at: (!publishNow && formData.scheduled_at) ? formData.scheduled_at : null,
      })

      const postId = createRes.data?.id

      if (publishNow && postId) {
        try {
          await api.post(`/admin/marketing/social-media/${postId}/publish`)
          setPublishResult({ ok: true, msg: 'Post published successfully!' })
          setTimeout(() => navigate('/social-media'), 2000)
        } catch (pubErr) {
          setPublishResult({
            ok: false,
            msg: pubErr.response?.data?.detail || 'Post saved but publishing failed. Try publishing from the list.'
          })
        }
      } else {
        navigate('/social-media')
      }
    } catch (error) {
      alert('Failed to create post: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/social-media" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Social Media
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
        {/* Platform selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(PLATFORM_META).map(([key, { label, Icon: PIcon, color: pcol }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormData({ ...formData, platform: key })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  formData.platform === key
                    ? `border-primary-500 bg-primary-50 ${pcol}`
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <PIcon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <span className={`text-xs font-mono ${overLimit ? 'text-red-600 font-bold' : remaining < 30 ? 'text-amber-600' : 'text-gray-400'}`}>
              {remaining} / {limit}
            </span>
          </div>
          <textarea
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={formData.platform === 'twitter' ? 4 : 6}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${overLimit ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            placeholder={
              formData.platform === 'twitter'
                ? 'What\'s happening? (280 chars max)'
                : formData.platform === 'instagram'
                ? 'Caption for your post...'
                : 'Write your post content...'
            }
          />
          {overLimit && (
            <p className="text-xs text-red-600 mt-1">
              Content is {Math.abs(remaining)} characters over the {formData.platform === 'twitter' ? 'Twitter' : PLATFORM_META[formData.platform]?.label} limit.
            </p>
          )}
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL
            {formData.platform === 'instagram' && <span className="text-red-500 ml-1">* Required for Instagram</span>}
            {formData.platform !== 'instagram' && <span className="text-gray-400 font-normal"> (optional)</span>}
          </label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            required={formData.platform === 'instagram'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {/* Link URL — not relevant for Instagram */}
        {formData.platform !== 'instagram' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="https://eazyfoods.ca"
            />
          </div>
        )}

        {/* Publish now toggle vs. schedule */}
        <div className={`rounded-lg border p-4 ${bg || 'bg-gray-50 border-gray-200'}`}>
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="h-4 w-4 text-primary-600"
            />
            <div>
              <span className={`font-medium text-sm ${color}`}>Publish immediately</span>
              <p className="text-xs text-gray-500 mt-0.5">Post will be sent to the platform right away (requires a connected account)</p>
            </div>
          </label>

          {!publishNow && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule for later <span className="text-gray-400 font-normal">(leave blank to save as draft)</span>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {publishResult && (
          <div className={`rounded-lg px-4 py-3 text-sm ${publishResult.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
            {publishResult.msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || overLimit}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : publishNow ? (
            <>
              <Send className="h-4 w-4" />
              Save &amp; Publish Now
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {formData.scheduled_at ? 'Schedule Post' : 'Save as Draft'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default SocialMediaCreate
