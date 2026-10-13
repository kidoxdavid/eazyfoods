import { useState, useEffect } from 'react'

const fallback = (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
  </div>
)

/**
 * Loads the checkout page. Guest checkout is always allowed (there is no sign-in).
 *
 * Checkout is loaded via import() in an effect (not React.lazy) so the chunk is evaluated
 * after mount; this avoids a "Cannot access 'Tt' before initialization" error in the bundle.
 */
const CheckoutRoute = () => {
  const [Checkout, setCheckout] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (Checkout || error) return
    let cancelled = false
    import('../pages/CheckoutPage')
      .then((m) => { if (!cancelled) setCheckout(() => m.default) })
      .catch((err) => { if (!cancelled) setError(err) })
    return () => { cancelled = true }
  }, [Checkout, error])

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-red-600">Could not load checkout.</p>
        <button type="button" className="btn-secondary" onClick={() => { setError(null); setCheckout(null) }}>Try again</button>
      </div>
    )
  }
  return Checkout ? <Checkout /> : fallback
}

export default CheckoutRoute
