import { useState, useEffect } from 'react'
import api from '../services/api'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState({
    orders: 0,
    reviews: 0,
    support: 0
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
      let ordersCount = 0
      let reviewsCount = 0
      let supportCount = 0
      
      // Fetch pending/new orders
      try {
        const ordersRes = await api.get('/orders/', { params: { status: 'pending', limit: 1000 } })
        const pendingOrders = Array.isArray(ordersRes.data) ? ordersRes.data.filter(order => 
          order.status === 'pending' || order.status === 'confirmed'
        ) : []
        ordersCount = pendingOrders.length
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
        support: supportCount
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  return { notifications, loading, refresh: fetchNotifications }
}

