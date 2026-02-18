import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api'
import api from '../services/api'
import { startLocationTracking, stopLocationTracking, getCurrentPosition } from '../services/locationTracking'
import { MapPin, Clock, Navigation, CheckCircle, ArrowLeft } from 'lucide-react'

const ActiveDelivery = () => {
  const { deliveryId } = useParams()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tripStarted, setTripStarted] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [directionsResult, setDirectionsResult] = useState(null)
  const directionsPanelRef = useRef(null)

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '400px'
  }

  useEffect(() => {
    if (!deliveryId) return

    fetchDelivery()

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

  const getNavigationUrl = () => {
    if (delivery?.delivery_latitude && delivery?.delivery_longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${delivery.delivery_latitude},${delivery.delivery_longitude}`
    }
    // Fallback: use address text when lat/long are missing
    const addr = delivery?.delivery_address
    if (addr && (addr.street || addr.city)) {
      const parts = [addr.street, addr.city, addr.state, addr.postal_code].filter(Boolean)
      if (parts.length) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parts.join(', '))}`
      }
    }
    return null
  }

  const navUrl = getNavigationUrl()

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
    : delivery.pickup_latitude && delivery.pickup_longitude
    ? { lat: delivery.pickup_latitude, lng: delivery.pickup_longitude }
    : { lat: 51.0447, lng: -114.0719 }

  const deliveryLocation = delivery.delivery_latitude && delivery.delivery_longitude
    ? { lat: delivery.delivery_latitude, lng: delivery.delivery_longitude }
    : null

  // Origin for directions: current position > last known > pickup location
  const originForDirections = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : delivery.current_latitude != null && delivery.current_longitude != null
    ? { lat: delivery.current_latitude, lng: delivery.current_longitude }
    : delivery.pickup_latitude != null && delivery.pickup_longitude != null
    ? { lat: delivery.pickup_latitude, lng: delivery.pickup_longitude }
    : null

  const hasDirectionsRequest = originForDirections && deliveryLocation &&
    (originForDirections.lat !== deliveryLocation.lat || originForDirections.lng !== deliveryLocation.lng)

  const directionsCallback = (result, status) => {
    if (status === 'OK' && result) {
      setDirectionsResult(result)
    }
  }

  // Start Trip screen: show before map + directions
  if (!tripStarted) {
    const addr = delivery?.delivery_address
    const addrStr = addr ? [addr.street, addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ') : 'Delivery address'
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
          <button onClick={() => navigate('/my-deliveries')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delivery #{delivery.order_id?.slice(0, 8)}</h1>
            <p className="text-sm text-gray-600 capitalize">{delivery.status.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <MapPin className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to start your trip?</h2>
            <p className="text-gray-600 mb-6">Tap Start Trip to see the map and turn-by-turn directions to the delivery location.</p>
            <p className="text-sm text-gray-500 mb-6 truncate" title={addrStr}>{addrStr}</p>
            <button
              onClick={() => setTripStarted(true)}
              className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              <Navigation className="h-5 w-5" />
              Start Trip
            </button>
          </div>
        </div>
      </div>
    )
  }

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
          {navUrl ? (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              <Navigation className="h-5 w-5" />
              Open Navigation
            </a>
          ) : (
            <div className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
              <Navigation className="h-5 w-5" />
              Open Navigation (no address)
            </div>
          )}
        </div>
      </div>

      {/* Map + Directions panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Turn-by-turn directions panel */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 bg-white border-l border-gray-200 overflow-hidden shrink-0">
          <div className="p-3 border-b border-gray-200 bg-gray-50 shrink-0">
            <h3 className="font-semibold text-gray-900">Directions to delivery</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {directionsResult ? 'Route loaded' : hasDirectionsRequest ? 'Loading…' : 'Enable location for turn-by-turn'}
            </p>
          </div>
          <div ref={directionsPanelRef} className="flex-1 overflow-auto p-2" />
        </aside>

        {/* Embedded map */}
        <div className="flex-1 relative min-w-0" style={{ minHeight: 400 }}>
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
              {/* Fetch and render directions when we have origin + destination */}
              {hasDirectionsRequest && (
                <DirectionsService
                  options={{
                    origin: originForDirections,
                    destination: deliveryLocation,
                    travelMode: 'DRIVING'
                  }}
                  callback={directionsCallback}
                />
              )}

              {/* Draw route + directions in panel when we have results */}
              {directionsResult && (
                <DirectionsRenderer
                  directions={directionsResult}
                  panel={directionsPanelRef.current}
                  options={{ suppressMarkers: false }}
                />
              )}

              {/* Fallback markers when no directions yet */}
              {!directionsResult && deliveryLocation && (
                <Marker
                  position={deliveryLocation}
                  label="📍"
                  title="Delivery Location"
                />
              )}
              {!directionsResult && (currentLocation || (delivery.current_latitude != null && delivery.current_longitude != null)) && (
                <Marker
                  position={currentLocation 
                    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
                    : { lat: delivery.current_latitude, lng: delivery.current_longitude }
                  }
                  label="🚗"
                  title="Your Location"
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                  }}
                />
              )}
            </GoogleMap>
          </LoadScript>
        </div>
      </div>
    </div>
  )
}

export default ActiveDelivery

