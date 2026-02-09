/**
 * Location tracking service for drivers
 * Handles GPS location updates and tracking
 */
import api from './api'

let watchId = null
let updateInterval = null
let currentDeliveryId = null

/**
 * Start tracking location for a delivery
 * @param {string} deliveryId - The delivery ID to track
 * @param {number} updateIntervalMs - How often to update location (default: 30000 = 30 seconds)
 */
export const startLocationTracking = (deliveryId, updateIntervalMs = 30000) => {
  if (watchId) {
    stopLocationTracking()
  }

  currentDeliveryId = deliveryId

  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by this browser')
    return null
  }

  // Watch position and update every updateIntervalMs
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      
      // Update location on server
      updateLocation(deliveryId, latitude, longitude)
    },
    (error) => {
      console.error('Location tracking error:', error)
      // Handle different error types
      switch (error.code) {
        case error.PERMISSION_DENIED:
          alert('Location permission denied. Please enable location services.')
          break
        case error.POSITION_UNAVAILABLE:
          console.warn('Location information unavailable')
          break
        case error.TIMEOUT:
          console.warn('Location request timeout')
          break
        default:
          console.error('Unknown location error')
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )

  return watchId
}

/**
 * Stop location tracking
 */
export const stopLocationTracking = () => {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
  
  currentDeliveryId = null
}

/**
 * Update location on server
 * @param {string} deliveryId - The delivery ID
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 */
const updateLocation = async (deliveryId, latitude, longitude) => {
  try {
    await api.post(`/driver/deliveries/${deliveryId}/update-location`, {
      latitude,
      longitude
    })
    console.log(`[Location] Updated: ${latitude}, ${longitude}`)
  } catch (error) {
    console.error('Failed to update location:', error)
  }
}

/**
 * Get current position once (for initial location)
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    )
  })
}

/**
 * Check if location tracking is active
 */
export const isTrackingActive = () => {
  return watchId !== null
}

/**
 * Get current delivery ID being tracked
 */
export const getCurrentDeliveryId = () => {
  return currentDeliveryId
}

