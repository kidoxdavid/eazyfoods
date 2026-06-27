import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MapPin, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

const STRIPE_URL = 'https://js.stripe.com/v3/'
const COUNTRY_MAP = { canada: 'CA', 'united states': 'US', usa: 'US', us: 'US' }
const toISO = c => COUNTRY_MAP[(c || '').toLowerCase()] || (c || 'CA').toUpperCase().slice(0, 2)

function loadStripe() {
  if (window.Stripe) return Promise.resolve(window.Stripe)
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = STRIPE_URL; s.async = true
    s.onload = () => res(window.Stripe)
    s.onerror = () => rej(new Error('Stripe load failed'))
    document.head.appendChild(s)
  })
}

export default function CheckoutScreen() {
  const { items, cartTotal, storeId, clearCart } = useCart()
  const { token } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const navigate = useNavigate()

  const [step, setStep]           = useState(1) // 1=address, 2=payment
  const [addresses, setAddresses] = useState([])
  const [selectedAddr, setSelectedAddr] = useState(null)
  const [newAddr, setNewAddr]     = useState({ street_address: '', city: '', state: '', postal_code: '', country: 'Canada' })
  const [useNew, setUseNew]       = useState(false)
  const [notes, setNotes]         = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Stripe state
  const stripeRef     = useRef(null)
  const elementsRef   = useRef(null)
  const secretRef     = useRef(null)
  const mountRef      = useRef(null)
  const [payReady, setPayReady]   = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone]           = useState(false)

  const subtotal = cartTotal
  const delivery = subtotal > 0 ? 5.99 : 0
  const tax      = subtotal * 0.05
  const total    = subtotal + delivery + tax

  // Fetch saved addresses
  useEffect(() => {
    if (!token) return
    api.get('/customer/addresses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.addresses || []
        setAddresses(list)
        if (list.length > 0) setSelectedAddr(list.find(a => a.is_default) || list[0])
        else setUseNew(true)
      })
      .catch(() => setUseNew(true))
  }, [token])

  // Init Stripe when on step 2
  useEffect(() => {
    if (step !== 2) return
    let cancelled = false
    const init = async () => {
      try {
        const StripeFn = await loadStripe()
        if (cancelled || !StripeFn) return
        const cfg = await api.get('/customer/payments/config')
        const key = cfg.data?.stripe_publishable_key
        if (!key) { showError('Payment not configured'); return }
        const stripe = StripeFn(key)
        stripeRef.current = stripe
        const intent = await api.post('/customer/payments/create-payment-intent',
          { total_amount: total, gateway: 'stripe' },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const secret = intent.data?.client_secret
        if (!secret) { showError('Payment setup failed'); return }
        secretRef.current = secret
        const elements = stripe.elements({ clientSecret: secret, appearance: { theme: 'stripe' } })
        elementsRef.current = elements
        const pe = elements.create('payment', {
          layout: 'tabs',
          fields: { billingDetails: { address: 'never', name: 'auto' } },
          wallets: { applePay: 'never', googlePay: 'never', link: 'never' },
        })
        await new Promise(r => requestAnimationFrame(r))
        if (cancelled || !mountRef.current) return
        pe.mount(mountRef.current)
        if (!cancelled) setPayReady(true)
      } catch (e) {
        if (!cancelled) showError('Could not load payment: ' + e.message)
      }
    }
    init()
    return () => { cancelled = true }
  }, [step, total, token])

  const handlePay = async () => {
    if (!stripeRef.current || !elementsRef.current || !secretRef.current) return
    setProcessing(true)
    try {
      const addr = useNew ? newAddr : selectedAddr
      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: window.location.origin + '/orders',
          payment_method_data: {
            billing_details: {
              address: {
                country: toISO(addr?.country),
                city: addr?.city || undefined,
                line1: addr?.street_address || undefined,
                postal_code: addr?.postal_code || undefined,
                state: addr?.state || undefined,
              }
            }
          }
        },
        redirect: 'if_required'
      })
      if (result.error) { showError(result.error.message); setProcessing(false); return }

      const piId = result.paymentIntent?.id || (secretRef.current || '').split('_secret_')[0]
      const deliveryAddr = useNew ? newAddr : {
        street_address: selectedAddr?.street_address,
        city: selectedAddr?.city,
        state: selectedAddr?.state,
        postal_code: selectedAddr?.postal_code,
        country: selectedAddr?.country || 'Canada',
      }
      await api.post('/customer/orders', {
        items: items.map(i => ({ product_id: i.product_id || i.id, quantity: i.quantity, unit_price: i.price })),
        store_id: storeId,
        delivery_method: 'delivery',
        delivery_address: deliveryAddr,
        special_instructions: notes || undefined,
        payment_method: 'stripe',
        transaction_id: piId,
        payment_intent_id: piId,
        subtotal, tax_amount: tax, shipping_amount: delivery, total_amount: total,
        commission_rate: 0.15,
        commission_amount: subtotal * 0.15,
        gross_sales: subtotal,
        net_payout: subtotal * 0.85,
      }, { headers: { Authorization: `Bearer ${token}` } })

      clearCart()
      setDone(true)
    } catch (e) {
      showError(e?.response?.data?.detail || 'Order failed: ' + e.message)
    } finally {
      setProcessing(false)
    }
  }

  if (done) return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-8 text-center pt-safe">
      <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-12 w-12 text-primary-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Order Placed!</h2>
        <p className="text-gray-500 text-sm mt-2">Your order is confirmed and will be delivered soon.</p>
      </div>
      <button onClick={() => navigate('/orders', { replace: true })}
        className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-xl press-scale">
        Track My Order
      </button>
      <button onClick={() => navigate('/home', { replace: true })} className="text-primary-600 font-semibold text-sm">
        Back to Home
      </button>
    </div>
  )

  return (
    <div className="h-full flex flex-col pt-safe">
      <AppHeader title={step === 1 ? 'Delivery Address' : 'Payment'} back />

      {/* Step indicator */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        {[1, 2].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="flex-1 scroll-content px-4 pt-4 space-y-4">
        {/* Order summary collapse */}
        <button onClick={() => setSummaryOpen(v => !v)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between press-scale">
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">Order Total: ${total.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          {summaryOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {summaryOpen && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2 -mt-2">
            {items.map(i => (
              <div key={i.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{i.name} ×{i.quantity}</span>
                <span className="text-gray-900">${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-400"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-gray-400"><span>Delivery</span><span>${delivery.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-gray-400"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm font-bold pt-1"><span>Total</span><span className="text-primary-700">${total.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            {/* Saved addresses */}
            {addresses.length > 0 && !useNew && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved Addresses</p>
                {addresses.map(addr => (
                  <button key={addr.id} onClick={() => setSelectedAddr(addr)}
                    className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3 press-scale border-2 transition-colors ${selectedAddr?.id === addr.id ? 'border-primary-500' : 'border-transparent'}`}>
                    <MapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${selectedAddr?.id === addr.id ? 'text-primary-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{addr.street_address}</p>
                      <p className="text-xs text-gray-500">{[addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => setUseNew(true)} className="text-xs text-primary-600 font-semibold px-1">
                  + Use a different address
                </button>
              </div>
            )}

            {/* New address form */}
            {(useNew || addresses.length === 0) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Address</p>
                {[
                  { key: 'street_address', label: 'Street Address', placeholder: '123 Main St' },
                  { key: 'city', label: 'City', placeholder: 'Calgary' },
                  { key: 'state', label: 'Province', placeholder: 'Alberta' },
                  { key: 'postal_code', label: 'Postal Code', placeholder: 'T2X 1Y6' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input value={newAddr[key]} onChange={e => setNewAddr(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
                  </div>
                ))}
                {addresses.length > 0 && (
                  <button onClick={() => setUseNew(false)} className="text-xs text-gray-400 font-semibold">
                    ← Use saved address
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Special Instructions</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Allergies, access instructions…"
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none" />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Card Details</p>
            <div ref={mountRef} className="min-h-[200px]" />
            {!payReady && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment…
              </div>
            )}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Bottom CTA */}
      <div className="bg-white border-t border-gray-100 px-4 pt-3 flex-shrink-0"
           style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 64px + 12px), 88px)' }}>
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!useNew && !selectedAddr}
            className="w-full h-14 bg-primary-600 text-white font-bold rounded-2xl press-scale disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Continue to Payment
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={!payReady || processing}
            className="w-full h-14 bg-primary-600 text-white font-bold rounded-2xl press-scale disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
              : `Place Order · $${total.toFixed(2)}`
            }
          </button>
        )}
      </div>
    </div>
  )
}
