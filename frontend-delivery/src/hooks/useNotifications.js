import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../services/api'

export const useNotifications = () => {
  const location = useLocation()
  const [notifications, setNotifications] = useState({
    availableDeliveries: 0,
    activeDeliveries: 0,
    unreadRatings: 0
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

  // When driver visits Ratings page, persist "viewed" count so badge stays 0 until new ratings
  useEffect(() => {
    if (location.pathname !== '/ratings') return
    const current = parseInt(localStorage.getItem('driver_ratings_viewed_count') || '0', 10)
    const totalNow = (notifications.unreadRatings || 0) + current
    localStorage.setItem('driver_ratings_viewed_count', String(totalNow))
  }, [location.pathname, notifications.unreadRatings])

  const fetchNotifications = async () => {
    try {
      const [availableRes, myDeliveriesRes, ratingsRes] = await Promise.all([
        api.get('/driver/available-orders').catch(() => ({ data: [] })),
        api.get('/driver/deliveries').catch(() => ({ data: [] })),
        api.get('/driver/ratings').catch(() => ({ data: { ratings: [] } }))
      ])
      const availableDeliveries = Array.isArray(availableRes.data) ? availableRes.data : []
      const myDeliveries = Array.isArray(myDeliveriesRes.data) ? myDeliveriesRes.data : []
      const activeDeliveries = myDeliveries.filter(
        (d) => d.status && !['delivered', 'cancelled'].includes(d.status)
      ).length
      const ratingsData = ratingsRes.data?.ratings ?? (Array.isArray(ratingsRes.data) ? ratingsRes.data : [])
      const totalRatings = Array.isArray(ratingsData) ? ratingsData.length : 0
      const viewedKey = 'driver_ratings_viewed_count'
      const viewed = parseInt(localStorage.getItem(viewedKey) || '0', 10)
      const unreadRatings = Math.max(0, totalRatings - viewed)

      setNotifications({
        availableDeliveries: availableDeliveries.length,
        activeDeliveries,
        unreadRatings
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRatingsPage = location.pathname === '/ratings'
  return {
    notifications: onRatingsPage
      ? { ...notifications, unreadRatings: 0 }
      : notifications,
    loading,
    refresh: fetchNotifications
  }
}

