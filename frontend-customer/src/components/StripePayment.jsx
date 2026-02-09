import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CheckCircle } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const StripePaymentForm = ({ amount, token, clientSecret, onSuccess, onError, onPaymentReady }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [error, setError] = useState(null)
  const processRef = useRef(null)

  const processPayment = async () => {
    if (!stripe || !elements) {
      return { success: false, error: 'Stripe is not loaded yet.' }
    }
    setProcessing(true)
    setError(null)
    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/orders',
          payment_method_data: {}
        },
        redirect: 'if_required'
      })
      if (confirmError) {
        const msg = confirmError.message || 'Payment failed.'
        setError(msg)
        setProcessing(false)
        return { success: false, error: msg }
      }
      const clientSecretForId = clientSecret
      const piId = clientSecretForId ? clientSecretForId.split('_secret_')[0] : null
      if (!piId) {
        setProcessing(false)
        return { success: false, error: 'Could not get payment result.' }
      }
      setPaymentComplete(true)
      const data = { transaction_id: piId, payment_intent_id: piId, payment_method: 'stripe' }
      onSuccess(data)
      setProcessing(false)
      return { success: true, data }
    } catch (err) {
      const msg = err.message || 'Payment failed.'
      setError(msg)
      setProcessing(false)
      return { success: false, error: msg }
    }
  }

  useEffect(() => {
    if (stripe && elements && onPaymentReady) {
      processRef.current = processPayment
      onPaymentReady(() => processRef.current?.() ?? Promise.resolve({ success: false, error: 'Not ready.' }))
    }
  }, [stripe, elements, onPaymentReady])

  return (
    <div className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-lg bg-white min-h-[280px]">
        <p className="text-sm text-gray-600 mb-3">
          Enter your card details below. Payment is secure via Stripe.
        </p>
        <div className="min-h-[220px]" id="stripe-payment-element">
          <PaymentElement
            options={{ layout: 'tabs' }}
            onReady={() => onPaymentReady?.(() => processRef.current?.() ?? Promise.resolve({ success: false, error: 'Not ready.' }))}
          />
        </div>
      </div>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
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

const StripePayment = ({ amount, token: tokenProp, onSuccess, onError, onPaymentReady, onCardReady }) => {
  const { token: authToken } = useAuth()
  const token = authToken ?? tokenProp ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null)
  const [clientSecret, setClientSecret] = useState(null)
  const [stripePromise, setStripePromise] = useState(null)
  const [error, setError] = useState(null)
  const stripeLoadedRef = useRef(false)
  const intentFetchedRef = useRef(false)

  // Load Stripe only once per mount – Stripe.js forbids changing the stripe prop after set
  useEffect(() => {
    if (!amount || amount <= 0 || !token || stripeLoadedRef.current) return
    let cancelled = false
    const init = async () => {
      try {
        const configRes = await api.get('/customer/payments/config')
        const key = configRes.data?.stripe_publishable_key
        if (!key) {
          setError('Stripe is not configured. Add STRIPE_PUBLISHABLE_KEY to .env.')
          return
        }
        if (cancelled) return
        stripeLoadedRef.current = true
        const stripe = await loadStripe(key)
        if (!cancelled && stripe) setStripePromise(stripe)
        else if (!stripe) {
          stripeLoadedRef.current = false
          setError('Could not load Stripe. Check your publishable key.')
        }
      } catch (e) {
        if (!cancelled) {
          stripeLoadedRef.current = false
          setError('Could not load payment config. Is the backend running?')
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [amount, token])

  // Create payment intent only once per mount – clientSecret must not change after Elements is shown
  useEffect(() => {
    if (!amount || amount <= 0 || !token || intentFetchedRef.current) return
    setError(null)
    intentFetchedRef.current = true
    api.post('/customer/payments/create-payment-intent', { total_amount: amount, gateway: 'stripe' }, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const secret = res.data?.client_secret
        if (secret) {
          setClientSecret(secret)
        } else {
          intentFetchedRef.current = false
          setError('Payment setup failed. Please try again.')
        }
      })
      .catch(err => {
        intentFetchedRef.current = false
        const msg = err.response?.data?.detail || 'Failed to initialize payment.'
        setError(msg)
        if (onError) onError(msg)
      })
  }, [amount, token])

  useEffect(() => {
    if (onCardReady) onCardReady(!!(clientSecret && stripePromise))
  }, [clientSecret, stripePromise, onCardReady])

  if (error && !clientSecret) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    )
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[120px] flex flex-col items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-primary-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-gray-600 font-medium">Loading Stripe…</p>
        <p className="text-gray-500 text-sm mt-1">Preparing secure payment form</p>
      </div>
    )
  }

  const options = { clientSecret, appearance: { theme: 'stripe' } }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentForm
        amount={amount}
        token={token}
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
        onPaymentReady={onPaymentReady}
      />
    </Elements>
  )
}

export default StripePayment
