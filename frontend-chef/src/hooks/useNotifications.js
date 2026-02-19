import { useState, useEffect } from 'react'
import api from '../services/api'

export const useNotifications = () => {
  const [ordersCount, setOrdersCount] = useState(0)

  const fetchCount = async () => {
    try {
      const res = await api.get('/chef/orders/', { params: { status: 'new', limit: 500 } })
      const list = Array.isArray(res.data) ? res.data : []
      setOrdersCount(list.length)
    } catch (error) {
      console.error('Failed to fetch chef order notifications:', error)
    }
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 10000)
    const onRefresh = () => fetchCount()
    window.addEventListener('refresh-orders-list', onRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-orders-list', onRefresh)
    }
  }, [])

  return { ordersCount, refresh: fetchCount }
}
