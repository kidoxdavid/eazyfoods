import { useEffect, useState } from 'react'
import api from '../services/api'
import { Save, Upload, X, MapPin, ChefHat, Globe, DollarSign, Clock, Users } from 'lucide-react'

// Cuisine types: African countries (same as CuisineForm dropdown)
const AFRICAN_CUISINE_TYPES = [
  'Algerian', 'Angolan', 'Beninese', 'Botswanan', 'Burkinabe', 'Burundian', 'Cameroonian',
  'Central African', 'Chadian', 'Comorian', 'Congolese', 'Djiboutian', 'Egyptian',
  'Equatorial Guinean', 'Eritrean', 'Eswatini', 'Ethiopian', 'Gabonese', 'Gambian',
  'Ghanaian', 'Guinean', 'Ivorian', 'Kenyan', 'Lesotho', 'Liberian', 'Libyan',
  'Madagascan', 'Malawian', 'Malian', 'Mauritanian', 'Mauritian', 'Moroccan',
  'Mozambican', 'Namibian', 'Nigerian', 'Nigerien', 'Rwandan', 'Sao Tomean',
  'Senegalese', 'Seychellois', 'Sierra Leonean', 'Somali', 'South African', 'South Sudanese',
  'Sudanese', 'Tanzanian', 'Togolese', 'Tunisian', 'Ugandan', 'Zambian', 'Zimbabwean'
].sort()

const Profile = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    chef_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    bio: '',
    cuisine_description: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Canada',
    cuisines: [],
    service_radius_km: 10.0,
    minimum_order_amount: 0.00,
    service_fee: 0.00,
    estimated_prep_time_minutes: 60,
    accepts_online_payment: true,
    accepts_cash_on_delivery: true,
    website_url: '',
    social_media_links: {
      facebook: '',
      instagram: '',
      youtube: ''
    },
    profile_image_url: '',
    banner_image_url: '',
    is_available: true
  })
  const [uploading, setUploading] = useState({ profile: false, banner: false })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/chef/profile')
      const data = response.data
      setProfile(data)
      
      setFormData({
        chef_name: data.chef_name || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        email: data.email || '',
        bio: data.bio || '',
        cuisine_description: data.cuisine_description || '',
        street_address: data.street_address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        country: data.country || 'Canada',
        cuisines: data.cuisines || [],
        service_radius_km: parseFloat(data.service_radius_km) || 10.0,
        minimum_order_amount: parseFloat(data.minimum_order_amount) || 0.00,
        service_fee: parseFloat(data.service_fee) || 0.00,
        estimated_prep_time_minutes: data.estimated_prep_time_minutes || 60,
        accepts_online_payment: data.accepts_online_payment !== undefined ? data.accepts_online_payment : true,
        accepts_cash_on_delivery: data.accepts_cash_on_delivery !== undefined ? data.accepts_cash_on_delivery : true,
        website_url: data.website_url || '',
        social_media_links: data.social_media_links || { facebook: '', instagram: '', youtube: '' },
        profile_image_url: data.profile_image_url || '',
        banner_image_url: data.banner_image_url || '',
        is_available: data.is_available !== undefined ? data.is_available : true
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      alert('Failed to load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSocialMediaChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      social_media_links: {
        ...prev.social_media_links,
        [platform]: value
      }
    }))
  }

  const addCuisine = (cuisine) => {
    if (cuisine && !formData.cuisines.includes(cuisine)) {
      setFormData(prev => ({
        ...prev,
        cuisines: [...prev.cuisines, cuisine]
      }))
    }
  }

  const removeCuisine = (cuisine) => {
    setFormData(prev => ({
      ...prev,
      cuisines: prev.cuisines.filter(c => c !== cuisine)
    }))
  }

  const handleImageUpload = async (type, file) => {
    if (!file) return
    
    setUploading(prev => ({ ...prev, [type]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const imageUrl = response.data.url || response.data.image_url
      setFormData(prev => ({
        ...prev,
        [`${type}_image_url`]: imageUrl
      }))
    } catch (error) {
      console.error(`Failed to upload ${type} image:`, error)
      alert(`Failed to upload ${type} image. Please try again.`)
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const updateData = {
        ...formData,
        service_radius_km: parseFloat(formData.service_radius_km),
        minimum_order_amount: parseFloat(formData.minimum_order_amount),
        service_fee: parseFloat(formData.service_fee),
        estimated_prep_time_minutes: parseInt(formData.estimated_prep_time_minutes)
      }
      
      const response = await api.put('/chef/profile', updateData)
      setProfile(response.data)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chef Name *</label>
                <input
                  type="text"
                  name="chef_name"
                  value={formData.chef_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Bio & Description */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About You</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Tell customers about yourself and your culinary journey..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Description</label>
                <textarea
                  name="cuisine_description"
                  value={formData.cuisine_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your cooking style and specialties..."
                />
              </div>
            </div>
          </div>

          {/* Cuisines */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuisines You Cook</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 max-w-xs"
                value=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v) addCuisine(v)
                  e.target.value = ''
                }}
              >
                <option value="">Add a cuisine...</option>
                {AFRICAN_CUISINE_TYPES.filter((c) => !formData.cuisines.includes(c)).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {formData.cuisines.length === 0 && (
                <span className="text-sm text-gray-500 self-center">Select from the dropdown</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.cuisines.map((cuisine, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  {cuisine}
                  <button
                    type="button"
                    onClick={() => removeCuisine(cuisine)}
                    className="hover:text-primary-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
                <div className="flex items-center gap-4">
                  {formData.profile_image_url && (
                    <img
                      src={formData.profile_image_url}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('profile', e.target.files[0])}
                        className="hidden"
                      />
                      <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {uploading.profile ? 'Uploading...' : 'Upload'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
                <div className="flex items-center gap-4">
                  {formData.banner_image_url && (
                    <img
                      src={formData.banner_image_url}
                      alt="Banner"
                      className="w-32 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('banner', e.target.files[0])}
                        className="hidden"
                      />
                      <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {uploading.banner ? 'Uploading...' : 'Upload'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  name="street_address"
                  value={formData.street_address}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
                <input
                  type="number"
                  name="service_radius_km"
                  value={formData.service_radius_km}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Service Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Minimum Order Amount
                </label>
                <input
                  type="number"
                  name="minimum_order_amount"
                  value={formData.minimum_order_amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Fee</label>
                <input
                  type="number"
                  name="service_fee"
                  value={formData.service_fee}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Prep Time (minutes)</label>
                <input
                  type="number"
                  name="estimated_prep_time_minutes"
                  value={formData.estimated_prep_time_minutes}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="accepts_online_payment"
                  checked={formData.accepts_online_payment}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Accept Online Payments</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="accepts_cash_on_delivery"
                  checked={formData.accepts_cash_on_delivery}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Accept Cash on Delivery</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_available"
                  checked={formData.is_available}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Available for Orders</span>
              </label>
            </div>
          </div>

          {/* Social Media & Website */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Social Media & Website
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  name="website_url"
                  value={formData.website_url}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                <input
                  type="url"
                  value={formData.social_media_links.facebook}
                  onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input
                  type="url"
                  value={formData.social_media_links.instagram}
                  onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                <input
                  type="url"
                  value={formData.social_media_links.youtube}
                  onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile
