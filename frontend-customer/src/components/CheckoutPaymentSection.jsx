/**
 * Stripe payment form for the new checkout page.
 * Loads @stripe/* only via dynamic import in useEffect so the chunk never has top-level Stripe.
 */
import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

function CheckoutPaymentSection({ amount, token, onSuccess, onError, onPaymentReady, onCardReady }) {
  const [StripeForm, setStripeForm] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      import('@stripe/stripe-js'),
      import('@stripe/react-stripe-js')
    ])
      .then(([stripeJs, reactStripeJs]) => {
        if (cancelled) return
        const { loadStripe } = stripeJs
        const { Elements, PaymentElement, useStripe, useElements } = reactStripeJs

        const InnerForm = (props) => {
          const stripe = useStripe()
          const elements = useElements()
          const [processing, setProcessing] = useState(false)
          const [err, setErr] = useState(null)
          const processRef = useRef(null)

          const runPayment = async () => {
            if (!stripe || !elements) return { success: false, error: 'Not ready.' }
            setProcessing(true)
            setErr(null)
            try {
              const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: window.location.origin + '/orders', payment_method_data: {} },
                redirect: 'if_required'
              })
              if (error) {
                setErr(error.message)
                setProcessing(false)
                return { success: false, error: error.message }
              }
              const piId = (props.clientSecret || '').split('_secret_')[0] || null
              if (!piId) {
                setProcessing(false)
                return { success: false, error: 'Could not get payment result.' }
              }
              const data = { transaction_id: piId, payment_intent_id: piId, payment_method: 'stripe' }
              props.onSuccess(data)
              setProcessing(false)
              return { success: true, data }
            } catch (e) {
              setErr(e.message)
              setProcessing(false)
              return { success: false, error: e.message }
            }
          }

          useEffect(() => {
            if (stripe && elements && props.onPaymentReady) {
              processRef.current = runPayment
              props.onPaymentReady(() => processRef.current?.() ?? Promise.resolve({ success: false, error: 'Not ready.' }))
            }
          }, [stripe, elements, props.onPaymentReady])

          return (
            <div className="space-y-4">
              <div className="p-4 border border-gray-300 rounded-lg bg-white min-h-[220px]">
                <p className="text-sm text-gray-600 mb-3">Enter your card details. Payment is secure via Stripe.</p>
                <div className="min-h-[180px]">
                  <PaymentElement options={{ layout: 'tabs' }} />
                </div>
              </div>
              {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{err}</div>}
              {processing && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">Processing…</div>}
            </div>
          )
        }

        const StripeWrapper = (wrapProps) => {
          const [clientSecret, setClientSecret] = useState(null)
          const [stripePromise, setStripePromise] = useState(null)
          const [msg, setMsg] = useState(null)

          useEffect(() => {
            if (!wrapProps.amount || wrapProps.amount <= 0) return
            let c = false
            api.get('/customer/payments/config')
              .then((r) => r.data?.stripe_publishable_key)
              .then((key) => (key ? loadStripe(key) : null))
              .then((stripe) => { if (!c && stripe) setStripePromise(stripe) })
            return () => { c = true }
          }, [wrapProps.amount])

          useEffect(() => {
            if (!wrapProps.amount || wrapProps.amount <= 0) return
            const headers = wrapProps.token ? { Authorization: `Bearer ${wrapProps.token}` } : {}
            api.post('/customer/payments/create-payment-intent', { total_amount: wrapProps.amount, gateway: 'stripe' }, { headers })
              .then((res) => { if (res.data?.client_secret) setClientSecret(res.data.client_secret); else setMsg('Payment setup failed.') })
              .catch(() => setMsg('Failed to initialize payment.'))
          }, [wrapProps.amount, wrapProps.token])

          useEffect(() => {
            if (wrapProps.onCardReady) wrapProps.onCardReady(!!(clientSecret && stripePromise))
          }, [clientSecret, stripePromise, wrapProps.onCardReady])

          if (msg) return <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{msg}</div>
          if (!clientSecret || !stripePromise) {
            return (
              <div className="py-6 text-center text-gray-500">
                <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
                Loading Stripe…
              </div>
            )
          }
          return (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <InnerForm clientSecret={clientSecret} onSuccess={wrapProps.onSuccess} onPaymentReady={wrapProps.onPaymentReady} />
            </Elements>
          )
        }

        setStripeForm(() => StripeWrapper)
      })
      .catch((e) => { if (!cancelled) setLoadError(e.message || 'Failed to load payment') })
    return () => { cancelled = true }
  }, [])

  if (loadError) return <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{loadError}</div>
  if (!StripeForm) return <div className="py-6 text-center text-gray-500">Loading payment form…</div>
  return (
    <StripeForm
      amount={amount}
      token={token}
      onSuccess={onSuccess}
      onError={onError}
      onPaymentReady={onPaymentReady}
      onCardReady={onCardReady}
    />
  )
}

export default CheckoutPaymentSection
