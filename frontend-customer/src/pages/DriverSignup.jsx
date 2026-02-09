import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Truck, Mail, Lock, User, Phone, MapPin, Car, Eye, EyeOff } from 'lucide-react'
import { vehicleModels } from '../utils/vehicleModels'

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

const DriverSignup = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Canada',
    vehicle_type: '',
    vehicle_make: '',
    vehicle_model: '',
    custom_vehicle_make: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    driver_license_number: '',
    delivery_zone: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Clean up form data - remove empty strings for optional fields
      const cleanedData = {
        ...formData,
        state: formData.state || undefined,
        vehicle_type: formData.vehicle_type || undefined,
        // Use custom_vehicle_make if "Other" is selected, otherwise use vehicle_make
        vehicle_make: formData.vehicle_make === 'Other' 
          ? (formData.custom_vehicle_make || undefined)
          : (formData.vehicle_make || undefined),
        vehicle_model: formData.vehicle_model || undefined,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : undefined,
        vehicle_color: formData.vehicle_color || undefined,
        license_plate: formData.license_plate || undefined,
        driver_license_number: formData.driver_license_number || undefined
      }
      // Remove custom_vehicle_make from the data sent to API
      delete cleanedData.custom_vehicle_make
      
      // Add delivery zone if selected
      if (formData.delivery_zone) {
        cleanedData.preferred_delivery_zones = [formData.delivery_zone]
      }
      
      const response = await api.post('/driver/auth/signup', cleanedData)
      alert('Driver application submitted successfully! You will be notified once your application is reviewed.')
      navigate('/')
    } catch (err) {
      console.error('Driver signup error:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to submit application. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-nude-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Truck className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Become a Delivery Driver</h1>
            <p className="text-gray-600 mt-2">Join eazyfoods as a delivery partner and earn money on your schedule</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Zone */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Zone
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Your Delivery Zone *</label>
                  <select
                    required
                    value={formData.delivery_zone}
                    onChange={(e) => setFormData({ ...formData, delivery_zone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a delivery zone</option>
                    {DELIVERY_ZONES.map(zone => (
                      <option key={zone.value} value={zone.value}>{zone.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Select the zone where you will primarily deliver. Each zone covers approximately a 10-km radius from the hub center.
                  </p>
                </div>
                {formData.delivery_zone && (() => {
                  const selectedZone = DELIVERY_ZONES.find(z => z.value === formData.delivery_zone)
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

            {/* Address */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select vehicle type</option>
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="scooter">Scooter</option>
                    <option value="walking">Walking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Make</label>
                  <select
                    value={formData.vehicle_make}
                    onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value, vehicle_model: '', custom_vehicle_make: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select make</option>
                    {Object.keys(vehicleModels).map(make => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {formData.vehicle_make === 'Other' && (
                    <input
                      type="text"
                      placeholder="Enter vehicle make"
                      value={formData.custom_vehicle_make || ''}
                      onChange={(e) => setFormData({ ...formData, custom_vehicle_make: e.target.value })}
                      className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model</label>
                  {formData.vehicle_make && formData.vehicle_make !== 'Other' ? (
                    <select
                      value={formData.vehicle_model}
                      onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select model</option>
                      {vehicleModels[formData.vehicle_make]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  ) : formData.vehicle_make === 'Other' ? (
                    <input
                      type="text"
                      placeholder="Enter vehicle model"
                      value={formData.vehicle_model}
                      onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <select
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    >
                      <option value="">Select make first</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Year</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.vehicle_year}
                    onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Color</label>
                  <input
                    type="text"
                    value={formData.vehicle_color}
                    onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver License Number</label>
                  <input
                    type="text"
                    value={formData.driver_license_number}
                    onChange={(e) => setFormData({ ...formData, driver_license_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your application will be reviewed by our team. You'll receive an email notification once your application is approved. 
                You'll need to provide additional documents (driver's license, vehicle registration, insurance) after approval.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default DriverSignup

