import { useEffect, useState } from 'react'
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api'
import api from '../services/api'
import { MapPin, Clock, Navigation, Phone } from 'lucide-react'
import { TextSkeleton } from './SkeletonLoader'

const DeliveryTracker = ({ deliveryId }) => {
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '8px'
  }

  const defaultCenter = {
    lat: 51.0447, // Calgary default
    lng: -114.0719
  }

  useEffect(() => {
    if (!deliveryId) return

    const fetchTracking = async () => {
      try {
        const response = await api.get(`/customer/deliveries/${deliveryId}/tracking`)
        setTrackingData(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch tracking data:', err)
        setError('Failed to load tracking information')
      } finally {
        setLoading(false)
      }
    }

    fetchTracking()
    // Poll every 15 seconds for updates
    const interval = setInterval(fetchTracking, 15000)

    return () => clearInterval(interval)
  }, [deliveryId])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="h-64 bg-gray-200 rounded-lg mb-4 animate-pulse" />
        <TextSkeleton lines={3} />
      </div>
    )
  }

  if (error || !trackingData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Tracking information not available'}</p>
      </div>
    )
  }

  const mapCenter = trackingData.driver_location || trackingData.customer_location || defaultCenter
  const mapZoom = trackingData.driver_location && trackingData.customer_location ? 12 : 10

  // Decode polyline if available (simplified - you may want to use a library like @mapbox/polyline)
  const routePath = trackingData.route_polyline ? [] : null // Would need polyline decoder

  return (
    <div className="space-y-4">
      {/* ETA and Distance Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trackingData.eta_minutes !== null && trackingData.eta_minutes !== undefined && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">Estimated Arrival</h3>
            </div>
            <p className="text-2xl font-bold text-primary-600">
              {trackingData.eta_minutes} min
            </p>
          </div>
        )}
        
        {trackingData.distance_km !== null && trackingData.distance_km !== undefined && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Distance</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {trackingData.distance_km.toFixed(1)} km
            </p>
          </div>
        )}

        {trackingData.driver_name && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Driver</h3>
            </div>
            <p className="text-lg font-medium text-gray-900">{trackingData.driver_name}</p>
            {trackingData.driver_phone && (
              <a
                href={`tel:${trackingData.driver_phone}`}
                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-1"
              >
                <Phone className="h-4 w-4" />
                Call Driver
              </a>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true
            }}
          >
            {/* Customer location marker */}
            {trackingData.customer_location && (
              <Marker
                position={trackingData.customer_location}
                label="📍"
                title="Your Location"
              />
            )}

            {/* Driver location marker */}
            {trackingData.driver_location && (
              <Marker
                position={trackingData.driver_location}
                label="🚗"
                title="Driver Location"
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />
            )}

            {/* Route polyline */}
            {routePath && routePath.length > 0 && (
              <Polyline
                path={routePath}
                options={{
                  strokeColor: '#10B981',
                  strokeWeight: 4,
                  strokeOpacity: 0.8
                }}
              />
            )}
          </GoogleMap>
        </LoadScript>
      </div>

      {/* Status */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Status: <span className="font-semibold capitalize">{trackingData.status.replace('_', ' ')}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Map updates every 15 seconds
        </p>
      </div>
    </div>
  )
}

export default DeliveryTracker

