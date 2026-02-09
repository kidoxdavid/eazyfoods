import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Save, Eye, Palette, Type, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'

const AdDesigner = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    ad_type: 'banner',
    title: '',
    description: '',
    image_url: '',
    video_url: '',
    cta_text: 'Shop Now',
    cta_link: '',
    placement: 'home_top_banner',
    priority: 0,
    start_date: '',
    end_date: '',
    slideshow_duration: 5,
    slideshow_enabled: true,
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
      const response = await api.get(`/admin/marketing/ads/${id}`)
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
        cta_text: ad.cta_text || 'Shop Now',
        cta_link: ad.cta_link || '',
        placement: ad.placement || 'home_top_banner',
        priority: ad.priority || 0,
        start_date: ad.start_date ? ad.start_date.split('T')[0] : '',
        end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
        slideshow_duration: ad.slideshow_duration || 5,
        slideshow_enabled: ad.slideshow_enabled !== undefined ? ad.slideshow_enabled : true,
        transition_style: ad.transition_style || 'fade',
        design_data: ad.design_data || {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontFamily: 'Arial',
          fontSize: 16
        }
      })
      console.log('Form data set:', {
        name: ad.name,
        title: ad.title,
        image_url: ad.image_url,
        start_date: ad.start_date
      })
    } catch (error) {
      console.error('Failed to fetch ad:', error)
      console.error('Error response:', error.response?.data)
      alert(`Failed to load ad: ${error.response?.data?.detail || error.message}`)
      navigate('/ads')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate that either image_url or video_url is provided (and not just empty strings)
    const hasImage = formData.image_url && formData.image_url.trim() !== ''
    const hasVideo = formData.video_url && formData.video_url.trim() !== ''
    
    if (!hasImage && !hasVideo) {
      alert('Please provide an image URL or video URL')
      return
    }
    
    setSaving(true)
    try {
      const data = {
        ...formData,
        // Only send URL if it's not empty (trim whitespace)
        image_url: hasImage ? formData.image_url.trim() : null,
        video_url: hasVideo ? formData.video_url.trim() : null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        slideshow_duration: formData.slideshow_duration || 5,
        transition_style: formData.transition_style || 'fade'
      }
      
      if (isEdit) {
        await api.put(`/admin/marketing/ads/${id}`, data)
      } else {
        await api.post('/admin/marketing/ads', data)
      }
      
      alert(isEdit ? 'Ad updated successfully' : 'Ad created successfully')
      navigate('/ads')
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save ad'
      alert(`Failed to save ad: ${errorMessage}`)
      console.error('Error:', error)
      console.error('Error response:', error.response?.data)
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
        <button
          onClick={() => setPreview(!preview)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Summer Sale Banner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ad Type *</label>
                  <select
                    value={formData.ad_type}
                    onChange={(e) => setFormData({ ...formData, ad_type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Special Offer!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Get 20% off on all products..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="https://example.com/image.jpg (optional)"
                  />
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="h-10 w-10 rounded object-cover" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTA Text</label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Shop Now"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTA Link</label>
                  <input
                    type="text"
                    value={formData.cta_link}
                    onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="/products?category=sale"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Slideshow Settings - show for home top banner and all bottom banners (multi-ad rotation) */}
              {(formData.placement === 'home_top_banner' || formData.placement?.endsWith('_bottom_banner') || formData.placement?.startsWith('become_a_driver')) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Slideshow Settings</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="slideshow_enabled"
                      checked={formData.slideshow_enabled}
                      onChange={(e) => setFormData({ ...formData, slideshow_enabled: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="slideshow_enabled" className="text-sm text-gray-700">
                      {formData.placement === 'home_top_banner'
                        ? 'Include in homepage slideshow'
                        : 'Include in banner rotation'}
                    </label>
                  </div>
                  {formData.slideshow_enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Display Duration (seconds)
                        </label>
                        <select
                          value={formData.slideshow_duration}
                          onChange={(e) => setFormData({ ...formData, slideshow_duration: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value={3}>3 seconds</option>
                          <option value={5}>5 seconds</option>
                          <option value={7}>7 seconds</option>
                          <option value={10}>10 seconds</option>
                          <option value={15}>15 seconds</option>
                          <option value={20}>20 seconds</option>
                          <option value={30}>30 seconds</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          How long this ad will be displayed before switching to the next one
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transition Style
                        </label>
                        <select
                          value={formData.transition_style}
                          onChange={(e) => setFormData({ ...formData, transition_style: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="fade">Fade</option>
                          <option value="slide">Slide</option>
                          <option value="none">None (Instant)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          How the ad transitions to the next one in the slideshow
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Design Settings */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Design Settings
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.design_data.backgroundColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      design_data: { ...formData.design_data, backgroundColor: e.target.value }
                    })}
                    className="h-10 w-20 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={formData.design_data.backgroundColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      design_data: { ...formData.design_data, backgroundColor: e.target.value }
                    })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.design_data.textColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      design_data: { ...formData.design_data, textColor: e.target.value }
                    })}
                    className="h-10 w-20 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={formData.design_data.textColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      design_data: { ...formData.design_data, textColor: e.target.value }
                    })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                <select
                  value={formData.design_data.fontFamily}
                  onChange={(e) => setFormData({
                    ...formData,
                    design_data: { ...formData.design_data, fontFamily: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                <input
                  type="number"
                  value={formData.design_data.fontSize}
                  onChange={(e) => setFormData({
                    ...formData,
                    design_data: { ...formData.design_data, fontSize: parseInt(e.target.value) }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="10"
                  max="72"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
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
                  src={formData.image_url}
                  alt="Ad preview"
                  className="w-full h-32 object-cover rounded mb-4"
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
                  style={{ fontSize: `${formData.design_data.fontSize * 0.875}px` }}
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

