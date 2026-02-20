/**
 * Stripe payment form using the CDN script only – no @stripe/* npm packages.
 * This guarantees Stripe code never gets into any JS bundle and avoids the "Tt" TDZ error.
 */
import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

const STRIPE_SCRIPT_URL = 'https://js.stripe.com/v3/'

function loadStripeScript() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.Stripe) return Promise.resolve(window.Stripe)
  const existing = document.querySelector(`script[src="${STRIPE_SCRIPT_URL}"]`)
  if (existing) {
    return new Promise((resolve) => {
      const check = () => (window.Stripe ? resolve(window.Stripe) : setTimeout(check, 50))
      check()
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = STRIPE_SCRIPT_URL
    script.async = true
    script.onload = () => resolve(window.Stripe || null)
    script.onerror = () => reject(new Error('Failed to load Stripe'))
    document.head.appendChild(script)
  })
}

function CheckoutPaymentSection({ amount, token, onSuccess, onError, onPaymentReady, onCardReady }) {
  const containerRef = useRef(null)
  const elementsRef = useRef(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState(false)
  const stripeRef = useRef(null)
  const clientSecretRef = useRef(null)

  // Load Stripe script, get key, create payment intent, mount Payment Element
  useEffect(() => {
    if (!amount || amount <= 0) return
    let cancelled = false

    const init = async () => {
      try {
        const StripeFn = await loadStripeScript()
        if (cancelled || !StripeFn) {
          setStatus('error')
          setMessage('Could not load Stripe.')
          return
        }

        const configRes = await api.get('/customer/payments/config')
        const key = configRes.data?.stripe_publishable_key
        if (!key) {
          setStatus('error')
          setMessage('Stripe is not configured.')
          return
        }
        if (cancelled) return

        const stripe = StripeFn(key)
        stripeRef.current = stripe

        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const intentRes = await api.post('/customer/payments/create-payment-intent', { total_amount: amount, gateway: 'stripe' }, { headers })
        const clientSecret = intentRes.data?.client_secret
        if (!clientSecret) {
          setStatus('error')
          setMessage('Payment setup failed.')
          return
        }
        if (cancelled) return

        clientSecretRef.current = clientSecret
        const elements = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } })
        elementsRef.current = elements

        const paymentElement = elements.create('payment', { layout: 'tabs' })
        if (!containerRef.current) return
        paymentElement.mount(containerRef.current)
        if (cancelled) return

        setStatus('ready')
        onCardReady?.(true)
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setMessage(e.message || 'Failed to load payment.')
        }
      }
    }

    init()
    return () => {
      cancelled = true
      if (elementsRef.current && containerRef.current?.firstChild) {
        try {
          elementsRef.current.destroy()
        } catch (_) {}
      }
      onCardReady?.(false)
    }
  }, [amount, token])

  const runPayment = async () => {
    const stripe = stripeRef.current
    const elements = elementsRef.current
    const clientSecret = clientSecretRef.current
    if (!stripe || !elements || !clientSecret) return { success: false, error: 'Not ready.' }
    setProcessing(true)
    setMessage('')
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + '/orders', payment_method_data: {} },
        redirect: 'if_required'
      })
      if (error) {
        setMessage(error.message)
        setProcessing(false)
        return { success: false, error: error.message }
      }
      const piId = (clientSecret || '').split('_secret_')[0] || null
      if (!piId) {
        setProcessing(false)
        return { success: false, error: 'Could not get payment result.' }
      }
      const data = { transaction_id: piId, payment_intent_id: piId, payment_method: 'stripe' }
      onSuccess(data)
      setProcessing(false)
      return { success: true, data }
    } catch (e) {
      setMessage(e.message)
      setProcessing(false)
      return { success: false, error: e.message }
    }
  }

  useEffect(() => {
    if (status === 'ready' && onPaymentReady) {
      onPaymentReady(() => runPayment())
    }
  }, [status, onPaymentReady])

  if (status === 'error') {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{message}</div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="py-6 text-center text-gray-500">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
        Loading Stripe…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-lg bg-white min-h-[220px]">
        <p className="text-sm text-gray-600 mb-3">Enter your card details. Payment is secure via Stripe.</p>
        <div ref={containerRef} className="min-h-[180px]" />
      </div>
      {message && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{message}</div>}
      {processing && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">Processing…</div>}
    </div>
  )
}

export default CheckoutPaymentSection
