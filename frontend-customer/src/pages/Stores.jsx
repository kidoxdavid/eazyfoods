import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { MapPin, Star, Clock, Truck, Store, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useLocation } from '../contexts/LocationContext'
import PageBanner from '../components/PageBanner'
import { StoreCardSkeleton } from '../components/SkeletonLoader'

const Stores = () => {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState('')
  const { coordinates, selectedCity } = useLocation()

  useEffect(() => {
    fetchStores()
  }, [coordinates, selectedRegion, selectedCity])

  // Check URL params for region filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const regionParam = urlParams.get('region')
    if (regionParam) {
      setSelectedRegion(regionParam)
    }
  }, [])

  const fetchStores = async () => {
    setLoading(true)
    try {
      const params = {}
      if (coordinates && coordinates.lat && coordinates.lng) {
        params.latitude = coordinates.lat
        params.longitude = coordinates.lng
        params.radius_km = 1000 // Very large radius to show all stores (1000km)
      }
      if (selectedRegion) {
        params.region = selectedRegion
      }
      // Filter by selected city (only if not "All")
      if (selectedCity && selectedCity !== 'All') {
        params.city = selectedCity
      }
      // If no coordinates, don't pass location params - show all active stores
      const response = await api.get('/customer/stores/', { params })
      // Handle both array response and object with data property
      const storesData = Array.isArray(response.data) ? response.data : (response.data?.stores || response.data || [])
      setStores(storesData)
    } catch (error) {
      console.error('Failed to fetch stores:', error)
      console.error('Error details:', error.response?.data)
      console.error('Full error:', error)
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  const isStoreOpen = (operatingHours) => {
    // If no operating hours specified, default to closed (not open)
    if (!operatingHours || typeof operatingHours !== 'object') {
      return false
    }
    
    const now = new Date()
    // Map JavaScript day index (0=Sunday) to full day names used in vendor portal
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const day = dayNames[now.getDay()]
    const hours = operatingHours[day]
    
    // If no hours for this day, store is closed
    if (!hours) {
      return false
    }
    
    // Check if the day is explicitly marked as closed
    if (hours.closed === true) {
      return false
    }
    
    // If no open/close times, store is closed
    if (!hours.open || !hours.close) {
      return false
    }
    
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [openHour, openMin] = hours.open.split(':').map(Number)
    const [closeHour, closeMin] = hours.close.split(':').map(Number)
    const openTime = openHour * 60 + openMin
    const closeTime = closeHour * 60 + closeMin
    
    return currentTime >= openTime && currentTime <= closeTime
  }

  if (loading) {
    return (
      <div className="w-full relative">
        <PageBanner
          title="Discover Local Markets"
          subtitle="Find authentic African groceries near you"
          icon={Store}
          placement="stores_top_banner"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const regions = [
    { value: '', label: 'All Regions' },
    { value: 'West African', label: 'West African' },
    { value: 'East African', label: 'East African' },
    { value: 'North African', label: 'North African' },
    { value: 'Central African', label: 'Central African' },
    { value: 'South African', label: 'South African' }
  ]

  return (
    <div className="w-full relative">
      {/* Banner Header with Ad Support */}
      <PageBanner
        title="Local Markets"
        subtitle="Find authentic African grocery stores near you"
        placement="stores_top_banner"
        defaultContent={
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Store className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Discover Local Markets
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Find authentic African grocery stores near you. Shop local and support your community!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Featured Stores</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Top Rated</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Nearby</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        {/* Region Filter - Compact */}
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Region:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {regions.map(region => (
                <option key={region.value} value={region.value}>{region.label}</option>
              ))}
            </select>
          </div>
        </div>

      {stores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1 text-base">No African stores nearby yet — but we're expanding! 🏪</p>
          <p className="text-xs text-gray-500 mb-4">More authentic African grocery stores are opening soon. Check back for updates!</p>
          <button
            onClick={fetchStores}
            className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            type="button"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {stores.map((store) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              {/* Store Image */}
              {store.store_profile_image_url ? (
                <div className="aspect-[4/3] bg-gray-200 overflow-hidden relative">
                  <img
                    src={resolveImageUrl(store.store_profile_image_url)}
                    alt={store.business_name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      console.error('[Stores] Store image failed to load:', store.store_profile_image_url)
                      e.target.style.display = 'none'
                      const fallback = e.target.parentElement.querySelector('.image-fallback')
                      if (fallback) {
                        fallback.style.display = 'flex'
                      }
                    }}
                  />
                  <div className="image-fallback absolute inset-0 w-full h-full flex items-center justify-center text-gray-400 text-xs hidden">
                    No Image
                  </div>
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <Store className="h-10 w-10 text-primary-600" />
                </div>
              )}
              
              <div className="p-3">
                {/* Store Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 leading-tight">{store.business_name}</h3>
                    {store.average_rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                        <span className="text-xs font-semibold text-gray-900">{store.average_rating.toFixed(1)}</span>
                        {store.total_reviews > 0 && (
                          <span className="text-xs text-gray-500">({store.total_reviews})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                    isStoreOpen(store.operating_hours)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {isStoreOpen(store.operating_hours) ? 'Open' : 'Closed'}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-start text-gray-600 mb-2">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span className="text-xs leading-snug line-clamp-2">{store.street_address}, {store.city}</span>
                </div>
                
                {/* Distance */}
                {store.distance_km && (
                  <div className="flex items-center text-gray-600 mb-2">
                    <Truck className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs font-medium">{parseFloat(store.distance_km).toFixed(1)} km</span>
                  </div>
                )}

                {/* Delivery Options */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                  {store.delivery_available && (
                    <span className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                      Delivery
                    </span>
                  )}
                  {store.pickup_available && (
                    <span className="px-2 py-1 bg-nude-50 text-nude-700 rounded text-xs font-medium">
                      Pickup
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}

export default Stores

