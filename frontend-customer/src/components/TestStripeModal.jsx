import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { X, CheckCircle, ExternalLink } from 'lucide-react'
import api from '../services/api'

const TEST_AMOUNT = 1.00
const STRIPE_PAYMENTS_URL = 'https://dashboard.stripe.com/test/payments'

function TestStripeForm({ clientSecret, onDone, onClose }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [paymentId, setPaymentId] = useState(null)

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    try {
      const { error: err } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + '/checkout' },
        redirect: 'if_required'
      })
      if (err) {
        setError(err.message || 'Payment failed')
        setProcessing(false)
        return
      }
      const piId = clientSecret.split('_secret_')[0]
      setPaymentId(piId)
    } catch (err) {
      setError(err.message || 'Payment failed')
    }
    setProcessing(false)
  }

  if (paymentId) {
    const directPaymentUrl = `https://dashboard.stripe.com/test/payments/${paymentId}`
    return (
      <div className="p-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-green-800 mb-1">Test payment succeeded</p>
        <p className="text-sm text-gray-600 mb-2">Payment ID: <code className="bg-gray-100 px-1 rounded">{paymentId}</code></p>
        <a
          href={directPaymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mb-3 font-medium"
        >
          Open this payment in Stripe Dashboard <ExternalLink className="h-4 w-4" />
        </a>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3 text-left">
          If the link shows &quot;Payment not found&quot;: you're in a different Stripe account. Log into the account where you got your API keys (Developers → API keys) and ensure <strong>Test mode</strong> is ON (top right).
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handlePay} className="p-4">
      <p className="text-sm text-gray-600 mb-3">Card: 4242 4242 4242 4242 (any future expiry, any CVC)</p>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {processing ? 'Processing…' : `Pay $${TEST_AMOUNT.toFixed(2)} test`}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function TestStripeModal({ open, clientSecret, stripeKeyPrefix, onClose }) {
  const [stripePromise, setStripePromise] = useState(null)

  useEffect(() => {
    if (!open) return
    api.get('/customer/payments/config')
      .then(r => r.data?.stripe_publishable_key)
      .then(key => key ? loadStripe(key) : null)
      .then(stripe => stripe && setStripePromise(stripe))
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Test Stripe — $1.00</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        {clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <TestStripeForm clientSecret={clientSecret} onClose={onClose} />
          </Elements>
        ) : (
          <div className="p-6 text-center text-gray-500">Loading Stripe…</div>
        )}
      </div>
    </div>
  )
}

export { TEST_AMOUNT, STRIPE_PAYMENTS_URL }
