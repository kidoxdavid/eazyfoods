import { useState, useEffect } from 'react'
import api from '../services/api'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState({
    availableDeliveries: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      // Fetch available deliveries
      const deliveriesRes = await api.get('/driver/available-orders')
      const availableDeliveries = Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []

      setNotifications({
        availableDeliveries: availableDeliveries.length
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  return { notifications, loading, refresh: fetchNotifications }
}

