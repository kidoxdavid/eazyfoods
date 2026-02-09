import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api'
import api from '../services/api'
import { startLocationTracking, stopLocationTracking, getCurrentPosition } from '../services/locationTracking'
import { MapPin, Clock, Navigation, CheckCircle, X, ArrowLeft } from 'lucide-react'

const ActiveDelivery = () => {
  const { deliveryId } = useParams()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)

  const mapContainerStyle = {
    width: '100%',
    height: 'calc(100vh - 200px)',
    minHeight: '500px'
  }

  useEffect(() => {
    if (!deliveryId) return

    fetchDelivery()
    fetchRoute()

    // Start location tracking
    getCurrentPosition()
      .then(pos => {
        setCurrentLocation(pos)
        startLocationTracking(deliveryId, 30000) // Update every 30 seconds
      })
      .catch(err => {
        console.error('Failed to get current position:', err)
        alert('Please enable location services to track your delivery')
      })

    // Update location periodically
    const locationInterval = setInterval(async () => {
      try {
        const pos = await getCurrentPosition()
        setCurrentLocation(pos)
        await api.post(`/driver/deliveries/${deliveryId}/update-location`, {
          latitude: pos.latitude,
          longitude: pos.longitude
        })
      } catch (err) {
        console.error('Failed to update location:', err)
      }
    }, 30000)

    return () => {
      stopLocationTracking()
      clearInterval(locationInterval)
    }
  }, [deliveryId])

  const fetchDelivery = async () => {
    try {
      const response = await api.get(`/driver/deliveries/${deliveryId}`)
      setDelivery(response.data)
    } catch (error) {
      console.error('Failed to fetch delivery:', error)
      alert('Failed to load delivery details')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoute = async () => {
    try {
      const response = await api.get(`/driver/deliveries/${deliveryId}/route`)
      setRoute(response.data)
    } catch (error) {
      console.error('Failed to fetch route:', error)
    }
  }

  const handleStatusUpdate = async (status) => {
    if (!confirm(`Mark delivery as ${status.replace('_', ' ')}?`)) return

    try {
      const location = currentLocation || await getCurrentPosition()
      await api.put(`/driver/deliveries/${deliveryId}/status`, {
        status,
        latitude: location.latitude,
        longitude: location.longitude
      })
      alert(`Status updated to ${status}`)
      if (status === 'delivered') {
        stopLocationTracking()
        navigate('/deliveries')
      } else {
        fetchDelivery()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert(error.response?.data?.detail || 'Failed to update status')
    }
  }

  const openNavigation = () => {
    if (delivery?.delivery_latitude && delivery?.delivery_longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${delivery.delivery_latitude},${delivery.delivery_longitude}`
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!delivery) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Delivery not found</p>
        <button
          onClick={() => navigate('/deliveries')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Back to Deliveries
        </button>
      </div>
    )
  }

  const mapCenter = currentLocation 
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : delivery.current_latitude && delivery.current_longitude
    ? { lat: delivery.current_latitude, lng: delivery.current_longitude }
    : { lat: 51.0447, lng: -114.0719 }

  const deliveryLocation = delivery.delivery_latitude && delivery.delivery_longitude
    ? { lat: delivery.delivery_latitude, lng: delivery.delivery_longitude }
    : null

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              stopLocationTracking()
              navigate('/deliveries')
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delivery #{delivery.order_id?.slice(0, 8)}</h1>
            <p className="text-sm text-gray-600 capitalize">{delivery.status.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {delivery.status === 'picked_up' && (
            <button
              onClick={() => handleStatusUpdate('delivered')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Mark Delivered
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {delivery.current_eta_minutes !== null && delivery.current_eta_minutes !== undefined && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">ETA</span>
            </div>
            <p className="text-2xl font-bold text-primary-600">{delivery.current_eta_minutes} min</p>
          </div>
        )}
        
        {delivery.route_distance_km !== null && delivery.route_distance_km !== undefined && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Distance</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{delivery.route_distance_km.toFixed(1)} km</p>
          </div>
        )}

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <button
            onClick={openNavigation}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
            disabled={!deliveryLocation}
          >
            <Navigation className="h-5 w-5" />
            Open Navigation
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={deliveryLocation ? 13 : 10}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              zoomControl: true
            }}
          >
            {/* Delivery destination marker */}
            {deliveryLocation && (
              <Marker
                position={deliveryLocation}
                label="📍"
                title="Delivery Location"
              />
            )}

            {/* Current location marker */}
            {(currentLocation || (delivery.current_latitude && delivery.current_longitude)) && (
              <Marker
                position={currentLocation 
                  ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
                  : { lat: delivery.current_latitude, lng: delivery.current_longitude }
                }
                label="🚗"
                title="Your Location"
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />
            )}

            {/* Route polyline */}
            {route?.polyline && (
              <Polyline
                path={[]} // Would need polyline decoder
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
    </div>
  )
}

export default ActiveDelivery

