import { useState, useEffect } from 'react'
import api from '../services/api'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState({
    ads: 0,
    campaigns: 0,
    budgets: 0
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
      let adsCount = 0
      let campaignsCount = 0
      let budgetsCount = 0
      
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
      
      // Fetch pending campaigns
      try {
        const campaignsRes = await api.get('/admin/marketing/campaigns', { 
          params: { status_filter: 'pending', limit: 1000 } 
        })
        const pendingCampaigns = Array.isArray(campaignsRes.data) ? campaignsRes.data.filter(c => c.status === 'pending') : []
        campaignsCount = pendingCampaigns.length
      } catch (error) {
        console.error('Failed to fetch campaigns notifications:', error)
      }
      
      // Fetch pending budgets
      try {
        const budgetsRes = await api.get('/admin/marketing/budgets', { 
          params: { status_filter: 'pending', limit: 1000 } 
        })
        const pendingBudgets = Array.isArray(budgetsRes.data) ? budgetsRes.data.filter(b => b.status === 'pending') : []
        budgetsCount = pendingBudgets.length
      } catch (error) {
        console.error('Failed to fetch budgets notifications:', error)
      }

      setNotifications({
        ads: adsCount,
        campaigns: campaignsCount,
        budgets: budgetsCount
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  return { notifications, loading, refresh: fetchNotifications }
}

