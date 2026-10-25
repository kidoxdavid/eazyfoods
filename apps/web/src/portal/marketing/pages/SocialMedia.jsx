import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Share2, Plus, Facebook, Instagram, Twitter, Linkedin, Calendar, CheckCircle, XCircle, Loader, Link2, Unlink, Send } from 'lucide-react'

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin']

const PLATFORM_META = {
  facebook:  { label: 'Facebook',  Icon: Facebook,  color: 'bg-blue-600',  note: 'Posts to your Facebook Page' },
  instagram: { label: 'Instagram', Icon: Instagram, color: 'bg-pink-600',  note: 'Requires Facebook connection + Instagram Business account' },
  twitter:   { label: 'Twitter / X', Icon: Twitter,  color: 'bg-sky-500',  note: 'Posts as a tweet (max 280 chars)' },
  linkedin:  { label: 'LinkedIn',  Icon: Linkedin,  color: 'bg-blue-700',  note: 'Posts to your LinkedIn profile' },
}

const SocialMedia = () => {
  const [posts, setPosts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState({})   // postId → true
  const [publishMsg, setPublishMsg] = useState({})    // postId → { ok, text }
  const [connectingPlatform, setConnectingPlatform] = useState(null)
  const [disconnecting, setDisconnecting] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [postsRes, accountsRes] = await Promise.all([
        api.get('/admin/marketing/social-media', { params: { limit: 1000 } }),
        api.get('/admin/marketing/social-accounts'),
      ])
      setPosts((postsRes.data || []).map(p => ({
        ...p,
        engagement: { likes: p.likes || 0, shares: p.shares || 0, comments: p.comments || 0 }
      })))
      setAccounts(accountsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()

    // Listen for popup postMessage when an OAuth flow completes
    const onMessage = (e) => {
      if (e.data?.social_connect !== undefined) {
        if (e.data.social_connect) {
          fetchAll()
        } else {
          alert(`Connection failed: ${e.data.msg || 'unknown error'}`)
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [fetchAll])

  const handleConnect = async (platform) => {
    setConnectingPlatform(platform)
    try {
      const res = await api.get(`/admin/marketing/social-auth/${platform}/connect`)
      const { url } = res.data
      // Open OAuth popup
      const w = 600, h = 700
      const left = window.screenX + (window.outerWidth - w) / 2
      const top = window.screenY + (window.outerHeight - h) / 2
      window.open(url, `connect_${platform}`, `width=${w},height=${h},left=${left},top=${top}`)
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to start ${platform} connection`)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleDisconnect = async (platform) => {
    if (!confirm(`Disconnect ${PLATFORM_META[platform]?.label}?`)) return
    setDisconnecting(platform)
    try {
      await api.delete(`/admin/marketing/social-accounts/${platform}`)
      setAccounts(prev => prev.filter(a => a.platform !== platform))
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  const handlePublish = async (post) => {
    setPublishing(prev => ({ ...prev, [post.id]: true }))
    setPublishMsg(prev => ({ ...prev, [post.id]: null }))
    try {
      await api.post(`/admin/marketing/social-media/${post.id}/publish`)
      setPublishMsg(prev => ({ ...prev, [post.id]: { ok: true, text: 'Published successfully!' } }))
      // Refresh posts list
      const res = await api.get('/admin/marketing/social-media', { params: { limit: 1000 } })
      setPosts((res.data || []).map(p => ({ ...p, engagement: { likes: p.likes || 0, shares: p.shares || 0, comments: p.comments || 0 } })))
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to publish'
      setPublishMsg(prev => ({ ...prev, [post.id]: { ok: false, text: msg } }))
    } finally {
      setPublishing(prev => ({ ...prev, [post.id]: false }))
    }
  }

  const getPlatformColor = (platform) => PLATFORM_META[platform]?.color || 'bg-gray-600'

  const getPlatformIcon = (platform) => {
    const { Icon } = PLATFORM_META[platform] || {}
    return Icon ? <Icon className="h-5 w-5" /> : <Share2 className="h-5 w-5" />
  }

  const connectedSet = new Set(accounts.map(a => a.platform))
  // Instagram shares the Facebook connection
  if (connectedSet.has('facebook')) connectedSet.add('instagram')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Social Media</h1>
          <p className="text-xs text-gray-600 mt-0.5">Connect your accounts and publish posts</p>
        </div>
        <Link
          to="/social-media/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 self-start"
        >
          <Plus className="h-4 w-4" />
          Create Post
        </Link>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Connected Accounts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLATFORMS.map((platform) => {
            const { label, Icon, color, note } = PLATFORM_META[platform]
            const account = accounts.find(a => a.platform === platform)
            const isConnected = !!account
            const isInstagram = platform === 'instagram'
            const fbConnected = connectedSet.has('facebook')

            return (
              <div key={platform} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-1.5 ${color} rounded text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm text-gray-800">{label}</span>
                  {isConnected && (
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                  )}
                </div>
                {isConnected ? (
                  <div>
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {account?.page_name || account?.username || 'Connected'}
                    </p>
                    <button
                      onClick={() => handleDisconnect(isInstagram ? 'facebook' : platform)}
                      disabled={!!disconnecting}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <Unlink className="h-3 w-3" />
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{isInstagram ? (fbConnected ? 'Uses Facebook connection' : 'Connect Facebook first') : note}</p>
                    {!isInstagram && (
                      <button
                        onClick={() => handleConnect(platform)}
                        disabled={connectingPlatform === platform}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded text-white ${color} hover:opacity-90 disabled:opacity-50`}
                      >
                        {connectingPlatform === platform ? (
                          <Loader className="h-3 w-3 animate-spin" />
                        ) : (
                          <Link2 className="h-3 w-3" />
                        )}
                        Connect
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PLATFORMS.map((platform) => {
          const { Icon, color } = PLATFORM_META[platform]
          return (
            <div key={platform} className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${color} rounded-lg text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-gray-900 capitalize">{PLATFORM_META[platform].label}</span>
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
              <div className={`p-3 ${getPlatformColor(post.platform)} rounded-lg text-white shrink-0`}>
                {getPlatformIcon(post.platform)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900 capitalize">{PLATFORM_META[post.platform]?.label || post.platform}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        post.status === 'published' ? 'bg-green-100 text-green-800' :
                        post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        post.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{post.content}</p>
                  </div>
                  {/* Publish button — only for draft/scheduled posts with connected account */}
                  {post.status !== 'published' && connectedSet.has(post.platform) && (
                    <button
                      onClick={() => handlePublish(post)}
                      disabled={!!publishing[post.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 disabled:opacity-50 shrink-0"
                    >
                      {publishing[post.id] ? (
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Publish Now
                    </button>
                  )}
                  {post.status !== 'published' && !connectedSet.has(post.platform) && (
                    <span className="text-xs text-gray-400 italic shrink-0">Connect account to publish</span>
                  )}
                </div>

                {publishMsg[post.id] && (
                  <div className={`flex items-center gap-2 text-xs mb-2 ${publishMsg[post.id].ok ? 'text-green-700' : 'text-red-600'}`}>
                    {publishMsg[post.id].ok
                      ? <CheckCircle className="h-4 w-4" />
                      : <XCircle className="h-4 w-4" />
                    }
                    {publishMsg[post.id].text}
                  </div>
                )}

                {post.image_url && (
                  <img src={post.image_url} alt="Post" className="w-full max-w-md rounded-lg mb-3" />
                )}

                <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
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
