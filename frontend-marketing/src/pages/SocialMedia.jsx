import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Share2, Plus, Facebook, Instagram, Twitter, Linkedin, Calendar, BarChart3 } from 'lucide-react'

const SocialMedia = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/social-media', { params: { limit: 1000 } })
      const posts = response.data || []
      // Transform data to match frontend format
      setPosts(posts.map(post => ({
        ...post,
        engagement: {
          likes: post.likes || 0,
          shares: post.shares || 0,
          comments: post.comments || 0
        }
      })))
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      setPosts([])
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
      default: return <Share2 className="h-5 w-5" />
    }
  }

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'facebook': return 'bg-blue-600'
      case 'instagram': return 'bg-pink-600'
      case 'twitter': return 'bg-sky-500'
      case 'linkedin': return 'bg-blue-700'
      default: return 'bg-gray-600'
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
          <h1 className="text-3xl font-bold text-gray-900">Social Media</h1>
          <p className="text-gray-600 mt-1">Manage and schedule your social media posts</p>
        </div>
        <Link
          to="/social-media/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Post
        </Link>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['facebook', 'instagram', 'twitter', 'linkedin'].map((platform) => {
          const Icon = platform === 'facebook' ? Facebook : platform === 'instagram' ? Instagram : platform === 'twitter' ? Twitter : Linkedin
          return (
            <div key={platform} className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${getPlatformColor(platform)} rounded-lg text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-gray-900 capitalize">{platform}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {posts.filter(p => p.platform === platform).length}
              </p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
          )
        })}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 ${getPlatformColor(post.platform)} rounded-lg text-white`}>
                {getPlatformIcon(post.platform)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 capitalize">{post.platform}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        post.status === 'published' ? 'bg-green-100 text-green-800' :
                        post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{post.content}</p>
                  </div>
                </div>

                {post.image_url && (
                  <img src={post.image_url} alt="Post" className="w-full max-w-md rounded-lg mb-3" />
                )}

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  {post.status === 'scheduled' && post.scheduled_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled: {new Date(post.scheduled_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {post.status === 'published' && post.published_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Published: {new Date(post.published_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {post.status === 'published' && (
                    <div className="flex items-center gap-4">
                      <span>👍 {post.engagement.likes}</span>
                      <span>💬 {post.engagement.comments}</span>
                      <span>🔄 {post.engagement.shares}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Share2 className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No social media posts yet</p>
          <Link
            to="/social-media/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Post
          </Link>
        </div>
      )}
    </div>
  )
}

export default SocialMedia

