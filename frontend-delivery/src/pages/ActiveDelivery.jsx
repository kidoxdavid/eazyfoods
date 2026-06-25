import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api'
import api from '../services/api'
import { startLocationTracking, stopLocationTracking, getCurrentPosition } from '../services/locationTracking'
import { MapPin, Clock, Navigation, CheckCircle, ArrowLeft, ChevronRight } from 'lucide-react'

const ActiveDelivery = () => {
  const { deliveryId } = useParams()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tripStarted, setTripStarted] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [directionsResult, setDirectionsResult] = useState(null)
  // Callback-based ref so DirectionsRenderer gets the panel el as soon as it mounts
  const [panelEl, setPanelEl] = useState(null)
  const panelRef = useCallback((node) => { if (node) setPanelEl(node) }, [])
  // Track where we were when we last fetched directions; reset when we've moved >300 m
  const lastDirectionsOriginRef = useRef(null)
  // Stable ref to originForDirections so the callback doesn't need it in its deps
  const originForDirectionsRef = useRef(null)

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
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
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

  // Keep ref in sync so the stable callback can read the latest value
  originForDirectionsRef.current = originForDirections

  // Stable callback — empty dep array prevents DirectionsService from re-firing on every render
  const directionsCallback = useCallback((result, status) => {
    if (status === 'OK' && result) {
      setDirectionsResult(result)
      lastDirectionsOriginRef.current = originForDirectionsRef.current
    }
  }, [])

  // Only request directions when we don't already have a result
  const shouldFetchDirections = hasDirectionsRequest && !directionsResult

  // Auto-refresh directions when the driver moves more than 300 m from the last fetch point
  useEffect(() => {
    if (!currentLocation || !lastDirectionsOriginRef.current) return
    const last = lastDirectionsOriginRef.current
    const toRad = (d) => (d * Math.PI) / 180
    const dLat = toRad(currentLocation.latitude - last.lat)
    const dLng = toRad(currentLocation.longitude - last.lng)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(last.lat)) * Math.cos(toRad(currentLocation.latitude)) * Math.sin(dLng / 2) ** 2
    const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    if (distKm > 0.3) {
      setDirectionsResult(null)
      lastDirectionsOriginRef.current = null
    }
  }, [currentLocation])

  // Pull ETA / distance / next maneuver from the live directions result
  const routeLeg = directionsResult?.routes?.[0]?.legs?.[0]
  const etaText = routeLeg?.duration?.text
  const distText = routeLeg?.distance?.text
  const nextInstruction = routeLeg?.steps?.[0]?.instructions?.replace(/<[^>]*>/g, '') ?? null

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
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Turn-by-turn directions panel — desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 bg-white border-r border-gray-200 overflow-hidden shrink-0">
          <div className="p-3 border-b border-gray-200 bg-gray-50 shrink-0">
            <h3 className="font-semibold text-gray-900">Turn-by-turn directions</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {directionsResult
                ? `${etaText ?? ''} · ${distText ?? ''}`
                : shouldFetchDirections
                ? 'Calculating route…'
                : 'Enable location for turn-by-turn'}
            </p>
          </div>
          <div ref={panelRef} className="flex-1 overflow-auto p-2" />
        </aside>

        {/* Embedded map */}
        <div className="flex-1 relative min-w-0" style={{ minHeight: 400 }}>
          <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={deliveryLocation ? 14 : 12}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
                zoomControl: true
              }}
            >
              {/* Only fire DirectionsService when we don't already have a result — prevents infinite API calls */}
              {shouldFetchDirections && (
                <DirectionsService
                  options={{
                    origin: originForDirections,
                    destination: deliveryLocation,
                    travelMode: 'DRIVING'
                  }}
                  callback={directionsCallback}
                />
              )}

              {/* Route polyline + markers rendered from directions result */}
              {directionsResult && (
                <DirectionsRenderer
                  directions={directionsResult}
                  options={{ suppressMarkers: false, panel: panelEl ?? undefined }}
                />
              )}

              {/* Fallback markers before directions load */}
              {!directionsResult && deliveryLocation && (
                <Marker position={deliveryLocation} label="📍" title="Delivery Location" />
              )}
              {!directionsResult && (currentLocation || (delivery.current_latitude != null && delivery.current_longitude != null)) && (
                <Marker
                  position={
                    currentLocation
                      ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
                      : { lat: delivery.current_latitude, lng: delivery.current_longitude }
                  }
                  label="🚗"
                  title="Your Location"
                  icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
                />
              )}
            </GoogleMap>
          </LoadScript>

          {/* Mobile turn-by-turn overlay — shown only when directions are loaded */}
          {directionsResult && (
            <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
              {/* ETA / distance summary bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-primary-600 text-white">
                <div className="flex items-center gap-4">
                  {etaText && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold text-sm">{etaText}</span>
                    </div>
                  )}
                  {distText && (
                    <div className="flex items-center gap-1">
                      <Navigation className="h-4 w-4" />
                      <span className="text-sm">{distText}</span>
                    </div>
                  )}
                </div>
                {navUrl && (
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline font-medium"
                  >
                    Open Maps
                  </a>
                )}
              </div>
              {/* Next maneuver instruction */}
              {nextInstruction && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <ChevronRight className="h-5 w-5 text-primary-600 shrink-0" />
                  <p className="text-sm text-gray-800 line-clamp-2">{nextInstruction}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActiveDelivery

