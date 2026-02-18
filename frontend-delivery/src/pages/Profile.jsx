import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { User, Mail, Phone, MapPin, Car, Shield, DollarSign, Package, Star, Edit, Save, X, Eye, EyeOff } from 'lucide-react'
import { CANADIAN_PROVINCES, getCitiesForProvince } from '../constants/locations'

// Calgary Delivery Zones with neighborhoods
const DELIVERY_ZONES = [
  { 
    value: 'Zone 1 — Downtown / City Centre Hub', 
    label: 'Zone 1 — Downtown / City Centre Hub',
    center: 'Downtown / City Hall area',
    neighborhoods: [
      'Beltline', 'East Village', 'Bridgeland',
      'Kensington', 'Sunalta', 'Mission',
      'Inglewood', 'Ramsay',
      'Parts of Renfrew', 'Crescent Heights'
    ],
    description: 'Good for: office orders, apartments, quick runs.'
  },
  { 
    value: 'Zone 2 — Northwest Hub', 
    label: 'Zone 2 — Northwest Hub',
    center: 'around North Hill / SAIT',
    neighborhoods: [
      'Capitol Hill', 'Mount Pleasant',
      'Dalhousie', 'Brentwood', 'Varsity',
      'Bowness', 'Montgomery',
      'Parts of Tuscany / Rocky Ridge (edge of range)'
    ]
  },
  { 
    value: 'Zone 3 — North Central Hub', 
    label: 'Zone 3 — North Central Hub',
    center: 'Country Hills / Harvest Hills',
    neighborhoods: [
      'Coventry Hills', 'Panorama Hills',
      'Hidden Valley',
      'Sandstone', 'Beddington',
      'Carrington', 'Livingston (newer communities)'
    ]
  },
  { 
    value: 'Zone 4 — Northeast Hub', 
    label: 'Zone 4 — Northeast Hub',
    center: 'Sunridge / Marlborough area',
    neighborhoods: [
      'Forest Lawn',
      'Rundle', 'Whitehorn', 'Marlborough',
      'Falconridge', 'Castleridge',
      'Temple', 'Pineridge',
      'Parts of Saddleridge'
    ]
  },
  { 
    value: 'Zone 5 — Southeast Hub', 
    label: 'Zone 5 — Southeast Hub',
    center: 'Ogden / Quarry Park',
    neighborhoods: [
      'Riverbend', 'Douglas Glen',
      'McKenzie Towne',
      'Mahogany', 'Auburn Bay',
      'Seton / Hospital area',
      'Copperfield', 'New Brighton'
    ],
    description: 'Great for groceries — lots of families'
  },
  { 
    value: 'Zone 6 — South / Chinook Hub', 
    label: 'Zone 6 — South / Chinook Hub',
    center: 'Chinook / Kingsland',
    neighborhoods: [
      'Fairview', 'Haysboro',
      'Acadia', 'Willow Park',
      'Maple Ridge',
      'Reaches west toward Glamorgan and Lakeview'
    ]
  },
  { 
    value: 'Zone 7 — Southwest Hub', 
    label: 'Zone 7 — Southwest Hub',
    center: 'Westhills / Signal Hill',
    neighborhoods: [
      'Signal Hill', 'Aspen Woods',
      'Strathcona', 'Cougar Ridge',
      'Glenbrook', 'Rosscarrock',
      'Parts of Discovery Ridge'
    ]
  },
  { 
    value: 'Zone 8 — Deep South Hub', 
    label: 'Zone 8 — Deep South Hub',
    center: 'Shawnessy area',
    neighborhoods: [
      'Somerset', 'Bridlewood',
      'Evergreen',
      'Silverado', 'Chaparral',
      'Walden', 'Legacy'
    ]
  }
]

const Profile = () => {
  const { driver, token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const isApproved = profile?.verification_status === 'approved'
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    vehicle_type: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    driver_license_number: '',
    delivery_zone: ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (token) {
      fetchProfile()
    }
  }, [token])

  useEffect(() => {
    if (profile?.verification_status === 'approved' && editing) {
      setEditing(false)
    }
  }, [profile?.verification_status, editing])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/driver/me')
      const data = response.data
      setProfile(data)
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        street_address: data.street_address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        country: data.country || 'Canada',
        vehicle_type: data.vehicle_type || '',
        vehicle_make: data.vehicle_make || '',
        vehicle_model: data.vehicle_model || '',
        vehicle_year: data.vehicle_year || '',
        vehicle_color: data.vehicle_color || '',
        license_plate: data.license_plate || '',
        driver_license_number: data.driver_license_number || '',
        delivery_zone: data.preferred_delivery_zones && data.preferred_delivery_zones.length > 0 
          ? data.preferred_delivery_zones[0] 
          : ''
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile data' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Clean up form data - remove empty strings
      const cleanedData = {}
      Object.keys(formData).forEach(key => {
        if (key === 'delivery_zone') {
          // Skip delivery_zone, we'll handle it separately
          return
        }
        if (formData[key] !== '') {
          cleanedData[key] = formData[key]
        }
      })
      
      // Add delivery zone if selected
      if (formData.delivery_zone) {
        cleanedData.preferred_delivery_zones = [formData.delivery_zone]
      }

      await api.put('/driver/me', cleanedData)
      setMessage({ type: 'success', text: 'Profile updated successfully' })
      setEditing(false)
      await fetchProfile() // Refresh profile data
    } catch (error) {
      console.error('Failed to update profile:', error)
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update profile' })
    }
  }

  const handleCancel = () => {
    if (isApproved) return
    setEditing(false)
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        street_address: profile.street_address || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: profile.country || 'Canada',
        vehicle_type: profile.vehicle_type || '',
        vehicle_make: profile.vehicle_make || '',
        vehicle_model: profile.vehicle_model || '',
        vehicle_year: profile.vehicle_year || '',
        vehicle_color: profile.vehicle_color || '',
        license_plate: profile.license_plate || '',
        driver_license_number: profile.driver_license_number || '',
        delivery_zone: profile.preferred_delivery_zones && profile.preferred_delivery_zones.length > 0 
          ? profile.preferred_delivery_zones[0] 
          : ''
      })
    }
    setMessage({ type: '', text: '' })
  }

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      // Note: You may need to implement a password change endpoint
      // For now, this is a placeholder
      setMessage({ type: 'error', text: 'Password change functionality not yet implemented' })
      // await api.put('/driver/change-password', {
      //   current_password: passwordData.current_password,
      //   new_password: passwordData.new_password
      // })
      // setMessage({ type: 'success', text: 'Password changed successfully' })
      // setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    } catch (error) {
      console.error('Failed to change password:', error)
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to change password' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Failed to load profile data</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your driver profile</p>
        </div>
        {!editing && !isApproved && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex-shrink-0"
          >
            <Edit className="h-5 w-5" />
            Edit Profile
          </button>
        )}
        {isApproved && (
          <p className="text-xs sm:text-sm text-gray-500">Profile is locked after approval. Contact support to update details.</p>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Personal Information</h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.first_name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.last_name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="text-gray-900">{profile.email || 'Not set'}</p>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.phone || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.street_address || 'Not set'}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  {editing ? (
                    <select
                      value={formData.state}
                      onChange={(e) => {
                        setFormData({ ...formData, state: e.target.value, city: '' })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select province</option>
                      {CANADIAN_PROVINCES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.state || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  {editing ? (
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select city</option>
                      {getCitiesForProvince(formData.state).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.city || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.postal_code || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.country || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Zone */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Zone
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Your Delivery Zone</label>
                {editing ? (
                  <select
                    value={formData.delivery_zone}
                    onChange={(e) => setFormData({ ...formData, delivery_zone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a delivery zone</option>
                    {DELIVERY_ZONES.map(zone => (
                      <option key={zone.value} value={zone.value}>{zone.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">
                    {profile.preferred_delivery_zones && profile.preferred_delivery_zones.length > 0 
                      ? profile.preferred_delivery_zones[0] 
                      : 'Not set'}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Select the zone where you will primarily deliver. Each zone covers approximately a 10-km radius from the hub center.
                </p>
              </div>
              {(editing ? formData.delivery_zone : (profile.preferred_delivery_zones && profile.preferred_delivery_zones.length > 0 ? profile.preferred_delivery_zones[0] : '')) && (() => {
                const currentZone = editing ? formData.delivery_zone : (profile.preferred_delivery_zones && profile.preferred_delivery_zones.length > 0 ? profile.preferred_delivery_zones[0] : '')
                const selectedZone = DELIVERY_ZONES.find(z => z.value === currentZone)
                return selectedZone ? (
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <h3 className="font-semibold text-primary-900 mb-2">{selectedZone.label}</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Center:</span> {selectedZone.center}
                    </p>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Covers:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedZone.neighborhoods.map((neighborhood, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-primary-600 mr-2">•</span>
                            <span>{neighborhood}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {selectedZone.description && (
                      <p className="text-sm text-primary-700 italic mt-2">{selectedZone.description}</p>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  {editing ? (
                    <select
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Type</option>
                      <option value="car">Car</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="scooter">Scooter</option>
                      <option value="walking">Walking</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{profile.vehicle_type || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Make</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.vehicle_make}
                      onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.vehicle_make || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.vehicle_model}
                      onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.vehicle_model || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Year</label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.vehicle_year}
                      onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.vehicle_year || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Color</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.vehicle_color}
                      onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.vehicle_color || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.license_plate}
                      onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.license_plate || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver's License Number</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.driver_license_number}
                      onChange={(e) => setFormData({ ...formData, driver_license_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.driver_license_number || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Change Password
              </button>
            </div>
          </div>

          {editing && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Save className="h-5 w-5" />
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Summary */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-gray-600">{profile.email}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Verification Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(profile.verification_status)}`}>
                  {profile.verification_status || 'pending'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Account Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <span className="text-sm text-gray-600">Total Deliveries</span>
                </div>
                <span className="font-bold text-gray-900">{profile.total_deliveries || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-600">Average Rating</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900">
                    {profile.average_rating ? profile.average_rating.toFixed(1) : 'N/A'}
                  </span>
                  {profile.total_ratings > 0 && (
                    <div className="text-xs text-gray-500">({profile.total_ratings} {profile.total_ratings === 1 ? 'rating' : 'ratings'})</div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Total Earnings</span>
                </div>
                <span className="font-bold text-gray-900">
                  ${profile.total_earnings ? parseFloat(profile.total_earnings).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile

