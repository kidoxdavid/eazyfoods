import { useState, useEffect } from 'react'
import api from '../services/api'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState({
    availableDeliveries: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    const onRefresh = () => fetchNotifications()
    window.addEventListener('refresh-notifications', onRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-notifications', onRefresh)
    }
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

