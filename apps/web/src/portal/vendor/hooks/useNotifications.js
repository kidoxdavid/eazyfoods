import { useState, useEffect, useCallback } from 'react'
import { makeHttp } from '../../http'

const { raw } = makeHttp('vendor')

/** Red badge counts for the menu (new orders, unanswered questions...), refreshed every 15 seconds. */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState({ orders: 0, reviews: 0, support: 0, pickupCount: 0, deliveryCount: 0 })
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try {
      const b = await raw('GET', '/vendor/badges')
      const sid = (await raw('GET', '/vendor/stores'))[0]?.id
      const rv = sid ? await raw('GET', `/vendor/stores/${sid}/reviews/summary`).catch(() => ({})) : {}
      setNotifications((n) => ({ ...n, orders: b['/vendor/orders'] || 0, support: b['/vendor/questions'] || 0, reviews: rv.unread || 0 }))
    } catch { /* keep the last counts */ } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    const onRefresh = () => refresh()
    window.addEventListener('refresh-notifications', onRefresh)
    const onRead = () => setNotifications((n) => ({ ...n, reviews: 0 }))
    window.addEventListener('reviews-marked-read', onRead)
    document.addEventListener('visibilitychange', onRefresh)
    return () => { clearInterval(t); window.removeEventListener('refresh-notifications', onRefresh); document.removeEventListener('visibilitychange', onRefresh) }
  }, [refresh])
  return { notifications, loading, refresh }
}
