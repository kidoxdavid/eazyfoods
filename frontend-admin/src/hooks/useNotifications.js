import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

export const useNotifications = () => {
  const reviewsSeenRef = useRef(false)
  const [reviewsSeen, setReviewsSeen] = useState(false)
  const [notifications, setNotifications] = useState({
    pendingAds: 0,
    pendingVendors: 0,
    pendingPromotions: 0,
    pendingSupport: 0,
    pendingDrivers: 0,
    pendingReviews: 0
  })
  const [loading, setLoading] = useState(true)

  const markReviewsSeen = () => {
    reviewsSeenRef.current = true
    setReviewsSeen(true)
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    const onRefresh = () => fetchNotifications()
    const onReviewsVisited = () => {
      reviewsSeenRef.current = true
      setReviewsSeen(true)
      setNotifications(prev => ({ ...prev, pendingReviews: 0 }))
    }
    window.addEventListener('refresh-notifications', onRefresh)
    window.addEventListener('reviews-visited', onReviewsVisited)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-notifications', onRefresh)
      window.removeEventListener('reviews-visited', onReviewsVisited)
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      let adsCount = 0
      let vendorsCount = 0
      let promotionsCount = 0
      let supportCount = 0
      let driversCount = 0
      let reviewsCount = 0

      // Fetch pending ads
      try {
        const adsRes = await api.get('/admin/marketing/ads', { 
          params: { approval_status: 'pending', limit: 1000 } 
        })
        const pendingAds = Array.isArray(adsRes.data) ? adsRes.data.filter(ad => ad.approval_status === 'pending') : []
        adsCount = pendingAds.length
      } catch (error) {
        console.error('Failed to fetch ads notifications:', error)
      }
      
      // Fetch pending vendor signups
      try {
        const vendorsRes = await api.get('/admin/vendors', { 
          params: { status_filter: 'pending', limit: 1000 } 
        })
        const pendingVendors = Array.isArray(vendorsRes.data) ? vendorsRes.data.filter(v => v.status === 'pending') : []
        vendorsCount = pendingVendors.length
      } catch (error) {
        console.error('Failed to fetch vendors notifications:', error)
      }
      
      // Fetch pending promotions
      try {
        const promotionsRes = await api.get('/admin/promotions', { 
          params: { status_filter: 'pending', limit: 1000 } 
        })
        const pendingPromotions = Array.isArray(promotionsRes.data) ? promotionsRes.data.filter(p => p.status === 'pending') : []
        promotionsCount = pendingPromotions.length
      } catch (error) {
        console.error('Failed to fetch promotions notifications:', error)
      }
      
      // Fetch unread support tickets
      try {
        const supportRes = await api.get('/admin/support/', { params: { limit: 1000 } })
        const unreadSupport = Array.isArray(supportRes.data) ? supportRes.data.filter(ticket => 
          ticket.status !== 'resolved' && !ticket.is_read
        ) : []
        supportCount = unreadSupport.length
      } catch (error) {
        console.error('Failed to fetch support notifications:', error)
      }
      
      // Fetch pending driver signups
      try {
        const driversRes = await api.get('/admin/drivers', { 
          params: { status_filter: 'pending', limit: 1000 } 
        })
        const pendingDrivers = Array.isArray(driversRes.data) ? driversRes.data.filter(d => d.status === 'pending') : []
        driversCount = pendingDrivers.length
      } catch (error) {
        console.error('Failed to fetch drivers notifications:', error)
      }

      // Fetch review stats (reported / needing attention for badge)
      try {
        const statsRes = await api.get('/admin/reviews/stats')
        const stats = statsRes.data || {}
        reviewsCount = (stats.reported_reviews || 0) + (stats.abusive_reviews || 0)
      } catch (error) {
        console.error('Failed to fetch reviews notifications:', error)
      }

      setNotifications({
        pendingAds: adsCount,
        pendingVendors: vendorsCount,
        pendingPromotions: promotionsCount,
        pendingSupport: supportCount,
        pendingDrivers: driversCount,
        pendingReviews: reviewsSeenRef.current ? 0 : reviewsCount
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  return { notifications, loading, refresh: fetchNotifications, markReviewsSeen }
}

