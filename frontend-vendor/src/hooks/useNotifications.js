import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../services/api'

export const useNotifications = () => {
  const location = useLocation()
  const [notifications, setNotifications] = useState({
    orders: 0,
    reviews: 0,
    support: 0,
    pickupCount: 0,
    deliveryCount: 0
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
      let ordersCount = 0
      let pickupCount = 0
      let deliveryCount = 0
      let reviewsCount = 0
      let supportCount = 0
      
      // Count orders that are not yet in a final status (badge stays until pickup/delivery complete)
      const FINAL_STATUSES = ['picked_up', 'delivered', 'cancelled']
      const isFinal = (order) => {
        const status = (order.delivery_status || order.status || '').toLowerCase()
        return FINAL_STATUSES.includes(status)
      }
      try {
        const ordersRes = await api.get('/orders/', { params: { limit: 1000 } })
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : []
        const nonFinal = orders.filter(o => !isFinal(o))
        const pickupNonFinal = nonFinal.filter(o => (o.delivery_method && String(o.delivery_method).toLowerCase()) === 'pickup')
        const deliveryNonFinal = nonFinal.filter(o => (o.delivery_method && String(o.delivery_method).toLowerCase()) === 'delivery')
        ordersCount = nonFinal.length
        pickupCount = pickupNonFinal.length
        deliveryCount = deliveryNonFinal.length
      } catch (error) {
        console.error('Failed to fetch orders notifications:', error)
      }
      
      // Fetch unread reviews
      try {
        const reviewsRes = await api.get('/reviews/', { params: { limit: 1000 } })
        const unreadReviews = Array.isArray(reviewsRes.data) ? reviewsRes.data.filter(review => !review.is_read) : []
        reviewsCount = unreadReviews.length
      } catch (error) {
        console.error('Failed to fetch reviews notifications:', error)
      }
      
      // Fetch unread support tickets
      try {
        const supportRes = await api.get('/support/', { params: { limit: 1000 } })
        const unreadSupport = Array.isArray(supportRes.data) ? supportRes.data.filter(ticket => 
          ticket.status !== 'resolved' && !ticket.is_read
        ) : []
        supportCount = unreadSupport.length
      } catch (error) {
        console.error('Failed to fetch support notifications:', error)
      }

      setNotifications({
        orders: ordersCount,
        reviews: reviewsCount,
        support: supportCount,
        pickupCount,
        deliveryCount
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    notifications: location.pathname === '/reviews'
      ? { ...notifications, reviews: 0 }
      : notifications,
    loading,
    refresh: fetchNotifications
  }
}

