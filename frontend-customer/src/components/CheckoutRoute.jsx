import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const checkoutFallback = (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
  </div>
)

/**
 * Allows access to checkout when:
 * - User is logged in, or
 * - allow_guest_checkout is true in admin customer settings.
 *
 * Load Checkout via import() in useEffect (not React.lazy) so the chunk is evaluated
 * after mount and avoids "Cannot access 'Tt' before initialization" in the bundle.
 */
const CheckoutRoute = () => {
  const { token, loading: authLoading } = useAuth()
  const [config, setConfig] = useState({ allow_guest_checkout: false })
  const [configLoading, setConfigLoading] = useState(true)
  const [CheckoutComponent, setCheckoutComponent] = useState(null)
  const [checkoutLoadError, setCheckoutLoadError] = useState(null)

  useEffect(() => {
    api.get('/customer/config').then((r) => setConfig(r.data || {})).catch(() => {}).finally(() => setConfigLoading(false))
  }, [])

  const hasToken = token || localStorage.getItem('token')
  const shouldShowCheckout = hasToken || config.allow_guest_checkout

  useEffect(() => {
    if (!shouldShowCheckout || CheckoutComponent || checkoutLoadError) return
    let cancelled = false
    import('../pages/Checkout')
      .then((m) => {
        if (!cancelled) setCheckoutComponent(() => m.default)
      })
      .catch((err) => {
        if (!cancelled) setCheckoutLoadError(err)
      })
    return () => { cancelled = true }
  }, [shouldShowCheckout, CheckoutComponent, checkoutLoadError])

  if (authLoading || configLoading) {
    return checkoutFallback
  }

  if (!shouldShowCheckout) {
    return <Navigate to="/login" replace />
  }

  if (checkoutLoadError) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-2">Could not load checkout.</p>
          <button
            type="button"
            onClick={() => { setCheckoutLoadError(null); setCheckoutComponent(null) }}
            className="text-sm text-primary-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!CheckoutComponent) {
    return checkoutFallback
  }

  return <CheckoutComponent />
}

export default CheckoutRoute
