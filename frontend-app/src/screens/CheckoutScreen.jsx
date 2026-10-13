import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MapPin, ChevronDown, ChevronUp, CheckCircle, Truck, Store } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useCart } from '../contexts/CartContext'
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

const TAX_RATE = 0.08 // same rate the API applies at checkout

const readContact = () => {
  try { return { first_name: '', last_name: '', email: '', phone: '', ...JSON.parse(localStorage.getItem('eazy_contact') || '{}') } }
  catch { return { first_name: '', last_name: '', email: '', phone: '' } }
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1">{label}</label>
    {children}
  </div>
)
const inputCls = 'w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100'

export default function CheckoutScreen() {
  const { items, cartTotal, storeId, clearCart } = useCart()
  const { error: showError } = useToast()
  const navigate = useNavigate()

  const [step, setStep]           = useState(1) // 1 = details, 2 = payment
  const [method, setMethod]       = useState('delivery') // delivery | pickup
  const [contact, setContact]     = useState(readContact)
  const [addresses, setAddresses] = useState([])
  const [selectedAddr, setSelectedAddr] = useState(null)
  const [newAddr, setNewAddr]     = useState({ street_address: '', city: '', state: '', postal_code: '', country: 'Canada' })
  const [useNew, setUseNew]       = useState(false)
  const [notes, setNotes]         = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(5)
  const [paymentsSuspended, setPaymentsSuspended] = useState(false)

  // Stripe state
  const stripeRef     = useRef(null)
  const elementsRef   = useRef(null)
  const secretRef     = useRef(null)
  const mountRef      = useRef(null)
  const [payReady, setPayReady]   = useState(false)
  const [processing, setProcessing] = useState(false)
  const [placed, setPlaced]       = useState(null) // { orderId, orderNumber }

  const subtotal = cartTotal
  const delivery = method === 'delivery' && subtotal > 0 ? deliveryFee : 0
  const tax      = subtotal * TAX_RATE
  const total    = subtotal + delivery + tax

  const detailsOk = contact.first_name.trim() && contact.last_name.trim() && contact.email.trim() && contact.phone.trim()
  const addrOk = method === 'pickup' || (useNew ? (newAddr.street_address && newAddr.city && newAddr.postal_code) : !!selectedAddr)

  // Delivery fee, payment mode and this device's saved addresses
  useEffect(() => {
    api.get('/customer/config').then(r => { if (r.data?.default_delivery_fee != null) setDeliveryFee(Number(r.data.default_delivery_fee)) }).catch(() => {})
    api.get('/customer/payments/config').then(r => setPaymentsSuspended(!!r.data?.payments_suspended)).catch(() => {})
    api.get('/customer/addresses')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.addresses || []
        setAddresses(list)
        if (list.length > 0) setSelectedAddr(list.find(a => a.is_default) || list[0])
        else setUseNew(true)
      })
      .catch(() => setUseNew(true))
  }, [])

  // Init Stripe when on the payment step (skipped when payments are suspended)
  useEffect(() => {
    if (step !== 2 || paymentsSuspended) return
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
        const intent = await api.post('/customer/payments/create-payment-intent', { total_amount: total, gateway: 'stripe' })
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
  }, [step, total, paymentsSuspended]) // eslint-disable-line react-hooks/exhaustive-deps

  const deliveryAddress = () => (method !== 'delivery' ? null : useNew ? newAddr : {
    street_address: selectedAddr?.street_address,
    city: selectedAddr?.city,
    state: selectedAddr?.state,
    postal_code: selectedAddr?.postal_code,
    country: selectedAddr?.country || 'Canada',
  })

  const submitOrder = async (payment) => {
    const { data } = await api.post('/customer/cart/checkout', {
      items: items.map(i => ({ product_id: i.product_id || i.id, quantity: i.quantity })),
      store_id: storeId,
      delivery_method: method,
      address: deliveryAddress(),
      shipping_amount: method === 'delivery' ? delivery : null,
      special_instructions: notes || undefined,
      ...payment,
      guest_first_name: contact.first_name.trim(),
      guest_last_name: contact.last_name.trim(),
      guest_email: contact.email.trim(),
      guest_phone: contact.phone.trim(),
    })
    try { localStorage.setItem('eazy_contact', JSON.stringify(contact)) } catch { /* private mode */ }
    clearCart()
    const first = data?.orders?.[0]
    setPlaced({ orderId: first?.order_id, orderNumber: first?.order_number })
  }

  const handlePay = async () => {
    if (processing) return
    setProcessing(true)
    try {
      if (paymentsSuspended) {
        await submitOrder({ payment_method: 'cash' })
        return
      }
      if (!stripeRef.current || !elementsRef.current || !secretRef.current) return
      const addr = method === 'delivery' ? (useNew ? newAddr : selectedAddr) : null
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
      if (result.error) { showError(result.error.message); return }
      const piId = result.paymentIntent?.id || (secretRef.current || '').split('_secret_')[0]
      await submitOrder({ payment_method: 'stripe', payment_intent_id: piId, stripe_payment_intent_id: piId })
    } catch (e) {
      showError(e?.response?.data?.detail || 'Order failed: ' + e.message)
    } finally {
      setProcessing(false)
    }
  }

  if (placed) return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-8 text-center pt-safe">
      <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-12 w-12 text-primary-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Order placed</h2>
        {placed.orderNumber && <p className="text-sm text-gray-700 mt-1">#{placed.orderNumber}</p>}
        <p className="text-gray-500 text-sm mt-2">We&apos;ll keep you posted as it&apos;s prepared. Orders are saved on this device.</p>
      </div>
      <button onClick={() => navigate(placed.orderId ? `/orders/${placed.orderId}` : '/orders', { replace: true })}
        className="w-full py-3.5 bg-primary-700 text-white font-bold rounded-xl press-scale">
        Track my order
      </button>
      <button onClick={() => navigate('/home', { replace: true })} className="text-primary-700 font-semibold text-sm">
        Back to home
      </button>
    </div>
  )

  return (
    <div className="h-full flex flex-col pt-safe">
      <AppHeader title={step === 1 ? 'Your details' : 'Payment'} back />

      {/* Step indicator */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        {[1, 2].map(n => (
          <div key={n} className={`flex-1 h-1 rounded-full transition-colors ${n <= step ? 'bg-primary-700' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="flex-1 scroll-content px-4 pt-4 space-y-4">
        {/* Order summary collapse */}
        <button onClick={() => setSummaryOpen(v => !v)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between press-scale">
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">Order total: ${total.toFixed(2)}</p>
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
              <div className="flex justify-between text-sm font-bold pt-1"><span>Total</span><span className="text-primary-800">${total.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            {/* Contact */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your details</p>
              <p className="text-xs text-gray-400 -mt-1">No account needed. We use these to confirm and deliver your order, and remember them on this device.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name *"><input className={inputCls} autoComplete="given-name" value={contact.first_name} onChange={e => setContact(c => ({ ...c, first_name: e.target.value }))} /></Field>
                <Field label="Last name *"><input className={inputCls} autoComplete="family-name" value={contact.last_name} onChange={e => setContact(c => ({ ...c, last_name: e.target.value }))} /></Field>
              </div>
              <Field label="Email *"><input type="email" className={inputCls} autoComplete="email" placeholder="you@example.com" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} /></Field>
              <Field label="Phone *"><input type="tel" className={inputCls} autoComplete="tel" placeholder="So the driver or store can reach you" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} /></Field>
            </div>

            {/* Delivery / pickup */}
            <div className="grid grid-cols-2 gap-3">
              {[['delivery', Truck, 'Delivery', `$${deliveryFee.toFixed(2)}`], ['pickup', Store, 'Pickup', 'Free']].map(([key, Icon, label, sub]) => (
                <button key={key} onClick={() => setMethod(key)}
                  className={`bg-white rounded-2xl p-3 shadow-sm flex items-center gap-2 border-2 press-scale ${method === key ? 'border-primary-600' : 'border-transparent'}`}>
                  <Icon className={`h-5 w-5 ${method === key ? 'text-primary-700' : 'text-gray-400'}`} />
                  <div className="text-left"><p className="text-sm font-semibold text-gray-900">{label}</p><p className="text-xs text-gray-400">{sub}</p></div>
                </button>
              ))}
            </div>

            {/* Saved addresses */}
            {method === 'delivery' && addresses.length > 0 && !useNew && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved addresses</p>
                {addresses.map(addr => (
                  <button key={addr.id} onClick={() => setSelectedAddr(addr)}
                    className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3 press-scale border-2 transition-colors ${selectedAddr?.id === addr.id ? 'border-primary-600' : 'border-transparent'}`}>
                    <MapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${selectedAddr?.id === addr.id ? 'text-primary-700' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{addr.street_address}</p>
                      <p className="text-xs text-gray-500">{[addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => setUseNew(true)} className="text-xs text-primary-700 font-semibold px-1">+ Use a different address</button>
              </div>
            )}

            {/* New address form */}
            {method === 'delivery' && (useNew || addresses.length === 0) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery address</p>
                {[
                  { key: 'street_address', label: 'Street address', placeholder: '123 Main St' },
                  { key: 'city', label: 'City', placeholder: 'Toronto' },
                  { key: 'state', label: 'Province', placeholder: 'Ontario' },
                  { key: 'postal_code', label: 'Postal code', placeholder: 'M5H 2N2' },
                ].map(({ key, label, placeholder }) => (
                  <Field key={key} label={label}>
                    <input value={newAddr[key]} onChange={e => setNewAddr(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className={inputCls} />
                  </Field>
                ))}
                {addresses.length > 0 && (
                  <button onClick={() => setUseNew(false)} className="text-xs text-gray-400 font-semibold">← Use saved address</button>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Special instructions</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allergies, access instructions…" rows={3}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none" />
            </div>
          </>
        )}

        {step === 2 && (paymentsSuspended ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-900">Pay on delivery or later</p>
            <p className="text-xs text-amber-800 mt-1">Online payments are paused. Place your order now and pay when it arrives.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Card details</p>
            <div ref={mountRef} className="min-h-[200px]" />
            {!payReady && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment…
              </div>
            )}
          </div>
        ))}

        <div className="h-4" />
      </div>

      {/* Bottom CTA */}
      <div className="bg-white border-t border-gray-100 px-4 pt-3 flex-shrink-0"
           style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 64px + 12px), 88px)' }}>
        {step === 1 ? (
          <button onClick={() => setStep(2)} disabled={!detailsOk || !addrOk || items.length === 0}
            className="w-full h-14 bg-primary-700 text-white font-bold rounded-2xl press-scale disabled:opacity-50 flex items-center justify-center gap-2">
            {detailsOk ? 'Continue' : 'Fill in your details to continue'}
          </button>
        ) : (
          <button onClick={handlePay} disabled={(!paymentsSuspended && !payReady) || processing}
            className="w-full h-14 bg-primary-700 text-white font-bold rounded-2xl press-scale disabled:opacity-50 flex items-center justify-center gap-2">
            {processing
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Placing order…</>
              : `Place order · $${total.toFixed(2)}`}
          </button>
        )}
      </div>
    </div>
  )
}
