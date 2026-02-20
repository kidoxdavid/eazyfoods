import { useState, useEffect, lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

// Load Checkout in its own chunk so main bundle order stays stable and Stripe loads only when checkout is shown
const Checkout = lazy(() => import('../pages/Checkout'))

const checkoutFallback = (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
  </div>
)

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
    return checkoutFallback
  }

  const hasToken = token || localStorage.getItem('token')
  if (hasToken || config.allow_guest_checkout) {
    return (
      <Suspense fallback={checkoutFallback}>
        <Checkout />
      </Suspense>
    )
  }

  return <Navigate to="/login" replace />
}

export default CheckoutRoute
