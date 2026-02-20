import { useState, useEffect, useRef } from 'react'
import { CheckCircle } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

/**
 * Load Stripe only via dynamic import inside useEffect to avoid "Cannot access 'Tt' before initialization"
 * when the chunk is evaluated. No top-level @stripe imports.
 */
const StripePayment = ({ amount, token: tokenProp, onSuccess, onError, onPaymentReady, onCardReady }) => {
  const { token: authToken } = useAuth()
  const token = authToken ?? tokenProp ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null)
  const [clientSecret, setClientSecret] = useState(null)
  const [StripeRoot, setStripeRoot] = useState(null)
  const [error, setError] = useState(null)
  const stripeLoadedRef = useRef(false)
  const intentFetchedRef = useRef(false)

  useEffect(() => {
    if (!amount || amount <= 0 || stripeLoadedRef.current) return
    let cancelled = false
    stripeLoadedRef.current = true
    ;(async () => {
      try {
        const [stripeJs, reactStripeJs] = await Promise.all([
          import('@stripe/stripe-js'),
          import('@stripe/react-stripe-js')
        ])
        if (cancelled) return
        const { loadStripe } = stripeJs
        const { Elements, PaymentElement, useStripe, useElements } = reactStripeJs

        const StripePaymentFormInner = (props) => {
          const stripe = useStripe()
          const elements = useElements()
          const [processing, setProcessing] = useState(false)
          const [paymentComplete, setPaymentComplete] = useState(false)
          const [err, setErr] = useState(null)
          const processRef = useRef(null)

          const processPayment = async () => {
            if (!stripe || !elements) return { success: false, error: 'Stripe is not loaded yet.' }
            setProcessing(true)
            setErr(null)
            try {
              const { error: confirmError } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: window.location.origin + '/orders', payment_method_data: {} },
                redirect: 'if_required'
              })
              if (confirmError) {
                setErr(confirmError.message || 'Payment failed.')
                setProcessing(false)
                return { success: false, error: confirmError.message }
              }
              const piId = (props.clientSecret || '').split('_secret_')[0] || null
              if (!piId) {
                setProcessing(false)
                return { success: false, error: 'Could not get payment result.' }
              }
              setPaymentComplete(true)
              props.onSuccess({ transaction_id: piId, payment_intent_id: piId, payment_method: 'stripe' })
              setProcessing(false)
              return { success: true }
            } catch (e) {
              const msg = e.message || 'Payment failed.'
              setErr(msg)
              setProcessing(false)
              return { success: false, error: msg }
            }
          }

          useEffect(() => {
            if (stripe && elements && props.onPaymentReady) {
              processRef.current = processPayment
              props.onPaymentReady(() => processRef.current?.() ?? Promise.resolve({ success: false, error: 'Not ready.' }))
            }
          }, [stripe, elements, props.onPaymentReady])

          return (
            <div className="space-y-4">
              <div className="p-4 border border-gray-300 rounded-lg bg-white min-h-[280px]">
                <p className="text-sm text-gray-600 mb-3">Enter your card details below. Payment is secure via Stripe.</p>
                <div className="min-h-[220px]" id="stripe-payment-element">
                  <PaymentElement
                    options={{ layout: 'tabs' }}
                    onReady={() => props.onPaymentReady?.(() => processRef.current?.() ?? Promise.resolve({ success: false, error: 'Not ready.' }))}
                  />
                </div>
              </div>
              {err && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{err}</p>
                </div>
              )}
              {processing && (
                <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-blue-800 text-sm">Processing payment…</span>
                </div>
              )}
              {paymentComplete && (
                <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-green-800 text-sm font-semibold">Payment successful</span>
                </div>
              )}
            </div>
          )
        }

        const StripeRootWrapper = (wrapperProps) => {
          const [stripePromise, setStripePromise] = useState(null)
          useEffect(() => {
            let c = false
            api.get('/customer/payments/config')
              .then(r => r.data?.stripe_publishable_key)
              .then(key => key ? loadStripe(key) : null)
              .then(stripe => { if (!c && stripe) setStripePromise(stripe) })
              .catch(() => { if (!c) setStripeRoot(null) })
            return () => { c = true }
          }, [])
          if (!stripePromise) {
            return (
              <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[120px] flex flex-col items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mb-3" />
                <p className="text-gray-600 font-medium">Loading Stripe…</p>
              </div>
            )
          }
          const options = { clientSecret: wrapperProps.clientSecret, appearance: { theme: 'stripe' } }
          return (
            <Elements stripe={stripePromise} options={options}>
              <StripePaymentFormInner
                clientSecret={wrapperProps.clientSecret}
                onSuccess={wrapperProps.onSuccess}
                onError={wrapperProps.onError}
                onPaymentReady={wrapperProps.onPaymentReady}
              />
            </Elements>
          )
        }

        setStripeRoot(() => StripeRootWrapper)
      } catch (e) {
        if (!cancelled) {
          stripeLoadedRef.current = false
          setError('Could not load payment form. Please refresh.')
        }
      }
    })()
    return () => { cancelled = true }
  }, [amount])

  useEffect(() => {
    if (!amount || amount <= 0 || intentFetchedRef.current) return
    setError(null)
    intentFetchedRef.current = true
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    api.post('/customer/payments/create-payment-intent', { total_amount: amount, gateway: 'stripe' }, { headers })
      .then(res => {
        const secret = res.data?.client_secret
        if (secret) setClientSecret(secret)
        else {
          intentFetchedRef.current = false
          setError('Payment setup failed. Please try again.')
        }
      })
      .catch(err => {
        intentFetchedRef.current = false
        setError(err.response?.data?.detail || 'Failed to initialize payment.')
        if (onError) onError(err.response?.data?.detail)
      })
  }, [amount, token, onError])

  useEffect(() => {
    if (onCardReady) onCardReady(!!(clientSecret && StripeRoot))
  }, [clientSecret, StripeRoot, onCardReady])

  if (error && !clientSecret) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[120px] flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mb-3" />
        <p className="text-gray-600 font-medium">Loading Stripe…</p>
        <p className="text-gray-500 text-sm mt-1">Preparing secure payment form</p>
      </div>
    )
  }

  if (!StripeRoot) {
    return (
      <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[120px] flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mb-3" />
        <p className="text-gray-600 font-medium">Loading Stripe…</p>
      </div>
    )
  }

  return (
    <StripeRoot
      clientSecret={clientSecret}
      onSuccess={onSuccess}
      onError={onError}
      onPaymentReady={onPaymentReady}
    />
  )
}

export default StripePayment
