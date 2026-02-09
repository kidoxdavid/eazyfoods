import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Eye, Palette, Upload, X, Video, Image as ImageIcon } from 'lucide-react'

const AdDesigner = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [selectedVideoFile, setSelectedVideoFile] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    ad_type: 'banner',
    title: '',
    description: '',
    image_url: '',
    video_url: '',
    cta_text: 'View My Cuisines',
    cta_link: '',
    placement: 'chefs_top_banner',
    priority: 0,
    start_date: '',
    end_date: '',
    slideshow_duration: 5,
    transition_style: 'fade',
    design_data: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontFamily: 'Arial',
      fontSize: 16
    }
  })

  useEffect(() => {
    if (isEdit) {
      fetchAd()
    }
  }, [id])

  const fetchAd = async () => {
    try {
      console.log('Fetching ad with ID:', id)
      const response = await api.get(`/chef/marketing/ads/${id}`)
      console.log('Ad response:', response.data)
      const ad = response.data
      
      if (!ad) {
        console.error('No ad data received')
        alert('Failed to load ad data')
        navigate('/ads')
        return
      }
      
      setFormData({
        name: ad.name || '',
        ad_type: ad.ad_type || 'banner',
        title: ad.title || '',
        description: ad.description || '',
        image_url: ad.image_url || '',
        video_url: ad.video_url || '',
        cta_text: ad.cta_text || 'View My Cuisines',
        cta_link: ad.cta_link || '',
        placement: ad.placement || 'chefs_top_banner',
        priority: ad.priority || 0,
        start_date: ad.start_date ? ad.start_date.split('T')[0] : '',
        end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
        slideshow_duration: ad.slideshow_duration || 5,
        transition_style: ad.transition_style || 'fade',
        design_data: ad.design_data || {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontFamily: 'Arial',
          fontSize: 16
        }
      })
      console.log('Form data set successfully')
    } catch (error) {
      console.error('Failed to fetch ad:', error)
      console.error('Error response:', error.response?.data)
      alert(`Failed to load ad: ${error.response?.data?.detail || error.message}`)
      navigate('/ads')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to resolve image/video URLs for display
  const resolveMediaUrl = (url) => {
    if (!url) return ''
    
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    // If it starts with /api/v1, use it as is (works with Vite proxy in dev)
    if (url.startsWith('/api/v1')) {
      return url
    }
    
    // If it starts with /uploads, prepend /api/v1
    if (url.startsWith('/uploads')) {
      return `/api/v1${url}`
    }
    
    // If it's a relative path without leading slash, construct full path
    const baseURL = api.defaults.baseURL || '/api/v1'
    if (baseURL.startsWith('http')) {
      return url.startsWith('/') 
        ? `${baseURL}${url}` 
        : `${baseURL}/${url}`
    }
    
    // Relative base URL - ensure proper path
    return url.startsWith('/') ? url : `/api/v1/uploads/ads/${url}`
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB')
      return
    }

    setSelectedImageFile(file)
    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/chefs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const imageUrl = response.data.url
      setFormData(prev => ({ ...prev, image_url: imageUrl }))
      alert('Image uploaded successfully!')
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid video file (MP4, WebM, OGG, or QuickTime)')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Video file size must be less than 50MB')
      return
    }

    setSelectedVideoFile(file)
    setUploadingVideo(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/chefs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const videoUrl = response.data.url
      setFormData(prev => ({ ...prev, video_url: videoUrl }))
      alert('Video uploaded successfully!')
    } catch (error) {
      console.error('Failed to upload video:', error)
      alert('Failed to upload video. Please try again.')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const hasImage = formData.image_url && formData.image_url.trim() !== ''
    const hasVideo = formData.video_url && formData.video_url.trim() !== ''
    
    if (!hasImage && !hasVideo) {
      alert('Please upload an image or video, or provide an image/video URL')
      return
    }
    
    setSaving(true)
    try {
      const data = {
        ...formData,
        image_url: hasImage ? formData.image_url.trim() : null,
        video_url: hasVideo ? formData.video_url.trim() : null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        slideshow_duration: formData.slideshow_duration || 5,
        transition_style: formData.transition_style || 'fade'
      }
      
      if (isEdit) {
        await api.put(`/chef/marketing/ads/${id}`, data)
      } else {
        await api.post('/chef/marketing/ads', data)
      }
      
      alert(isEdit ? 'Ad updated successfully. Waiting for Marketing approval.' : 'Ad created successfully. Waiting for Marketing approval.')
      navigate('/ads')
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save ad'
      alert(`Failed to save ad: ${errorMessage}`)
      console.error('Error:', error)
    } finally {
      setSaving(false)
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
        <Link to="/ads" className="text-primary-600 hover:text-primary-700 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Ads
        </Link>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Your ads will be reviewed by Marketing before they go live. You can edit ads that are pending approval.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ad Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Authentic Nigerian Cuisine"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ad Type *</label>
                  <select
                    value={formData.ad_type}
                    onChange={(e) => setFormData({ ...formData, ad_type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="banner">Banner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Placement *</label>
                  <select
                    value={formData.placement}
                    onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <optgroup label="Home Page">
                      <option value="home_top_banner">Home Top Banner</option>
                      <option value="home_bottom_banner">Home Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Products Page">
                      <option value="products_top_banner">Products Top Banner</option>
                      <option value="products_bottom_banner">Products Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Stores Page">
                      <option value="stores_top_banner">Stores Top Banner</option>
                      <option value="stores_bottom_banner">Stores Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Chefs Page">
                      <option value="chefs_top_banner">Chefs Top Banner</option>
                      <option value="chefs_bottom_banner">Chefs Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Cart Page">
                      <option value="cart_top_banner">Cart Top Banner</option>
                      <option value="cart_bottom_banner">Cart Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Orders Page">
                      <option value="orders_top_banner">Orders Top Banner</option>
                      <option value="orders_bottom_banner">Orders Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Profile Page">
                      <option value="profile_top_banner">Profile Top Banner</option>
                      <option value="profile_bottom_banner">Profile Bottom Banner</option>
                    </optgroup>
                    <optgroup label="About Page">
                      <option value="about_top_banner">About Top Banner</option>
                      <option value="about_bottom_banner">About Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Contact Page">
                      <option value="contact_top_banner">Contact Top Banner</option>
                      <option value="contact_bottom_banner">Contact Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Meals Page">
                      <option value="meals_top_banner">Meals Top Banner</option>
                      <option value="meals_bottom_banner">Meals Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Top Market Deals Page">
                      <option value="top_market_deals_top_banner">Top Market Deals Top Banner</option>
                      <option value="top_market_deals_bottom_banner">Top Market Deals Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Checkout Page">
                      <option value="checkout_top_banner">Checkout Top Banner</option>
                      <option value="checkout_bottom_banner">Checkout Bottom Banner</option>
                    </optgroup>
                    <optgroup label="Become a Driver Page">
                      <option value="become_a_driver_top_banner">Become a Driver Top Banner</option>
                      <option value="become_a_driver_bottom_banner">Become a Driver Bottom Banner</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Authentic African Cuisine"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Experience authentic African flavors..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
                <div>
                  <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                    <div className="flex flex-col items-center">
                      <Upload className="h-5 w-5 text-gray-400 mb-1" />
                      <span className="text-sm text-gray-600">
                        {uploadingImage ? 'Uploading...' : 'Click to Upload Image'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, GIF (max 10MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  {selectedImageFile && formData.image_url && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg p-2">
                      <ImageIcon className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">{selectedImageFile.name} - Uploaded successfully</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null)
                          setFormData({ ...formData, image_url: '' })
                        }}
                        className="ml-auto text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {formData.image_url && (
                  <div className="mt-3">
                    <img
                      src={resolveMediaUrl(formData.image_url)}
                      alt="Preview"
                      className="max-w-full h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        console.error('Image failed to load:', formData.image_url)
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTA Text</label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="View My Cuisines"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTA Link</label>
                  <input
                    type="url"
                    value={formData.cta_link}
                    onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="/chefs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule & Display Settings</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">Higher priority ads show first (0-100)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>
            
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              style={{
                backgroundColor: formData.design_data.backgroundColor,
                color: formData.design_data.textColor,
                fontFamily: formData.design_data.fontFamily,
                fontSize: `${formData.design_data.fontSize}px`
              }}
            >
              {formData.image_url && (
                <img
                  src={resolveMediaUrl(formData.image_url)}
                  alt="Ad preview"
                  className="w-full h-32 object-cover rounded mb-4"
                  onError={(e) => {
                    console.error('Preview image failed to load:', formData.image_url)
                    e.target.style.display = 'none'
                  }}
                />
              )}
              {formData.title && (
                <h3 className="font-bold mb-2">{formData.title}</h3>
              )}
              {formData.description && (
                <p className="text-sm mb-4">{formData.description}</p>
              )}
              {formData.cta_text && (
                <button
                  type="button"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {formData.cta_text}
                </button>
              )}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : isEdit ? 'Update Ad' : 'Create Ad'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AdDesigner

