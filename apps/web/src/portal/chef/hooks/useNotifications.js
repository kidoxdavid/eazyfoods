import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch (_) {}
}

export const useNotifications = () => {
  const [ordersCount, setOrdersCount] = useState(0)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const previousCountRef = useRef(null)

  const fetchCount = async () => {
    try {
      const res = await api.get('/chef/orders/', { params: { limit: 500 } })
      const list = Array.isArray(res.data) ? res.data : []
      const FINAL_STATUSES = ['picked_up', 'delivered', 'cancelled']
      const newCount = list.filter(o => !FINAL_STATUSES.includes((o.status || '').toLowerCase())).length
      if (previousCountRef.current !== null && newCount > previousCountRef.current) {
        playNewOrderSound()
        setNewOrderAlert(true)
        setTimeout(() => setNewOrderAlert(false), 5000)
      }
      previousCountRef.current = newCount
      setOrdersCount(newCount)
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

  return { ordersCount, newOrderAlert, dismissNewOrderAlert: () => setNewOrderAlert(false), refresh: fetchCount }
}
