import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import Checkout from '../pages/Checkout'

/**
 * Allows access to checkout when:
 * - User is logged in, or
 * - allow_guest_checkout is true in admin customer settings.
 */
const CheckoutRoute = () => {
  const { token, loading: authLoading } = useAuth()
  const [config, setConfig] = useState({ allow_guest_checkout: false })
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    api.get('/customer/config').then((r) => setConfig(r.data || {})).catch(() => {}).finally(() => setConfigLoading(false))
  }, [])

  if (authLoading || configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  const hasToken = token || localStorage.getItem('token')
  if (hasToken || config.allow_guest_checkout) {
    return <Checkout />
  }

  return <Navigate to="/login" replace />
}

export default CheckoutRoute
