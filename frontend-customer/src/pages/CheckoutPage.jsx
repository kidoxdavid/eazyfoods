/**
 * New checkout page – no lazy(), no top-level Stripe imports.
 * Payment uses CheckoutPaymentSection (Stripe via CDN only, no npm packages in bundle).
 */
const STRIPE_DISCONNECTED = false

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, CreditCard, Truck, Lock, ChefHat } from 'lucide-react'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'

const MAPS_LIBRARIES = ['places']

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart()
  const { token } = useAuth()
  // No accounts: every shopper checks out with the contact details below (remembered on this device).
  const isGuest = true
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [stores, setStores] = useState([])
  const [chefs, setChefs] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('delivery')
  const [paymentData, setPaymentData] = useState(null)
  const [processPaymentFn, setProcessPaymentFn] = useState(null)
  const [paymentConfig, setPaymentConfig] = useState({ stripe_enabled: true, payments_suspended: false })
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(5)
  const [useDistanceBasedDelivery, setUseDistanceBasedDelivery] = useState(false)
  const [deliveryFeeFromEstimate, setDeliveryFeeFromEstimate] = useState(null)
  const [estimatingDelivery, setEstimatingDelivery] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [PaymentSection, setPaymentSection] = useState(null)
  const [guestInfo, setGuestInfo] = useState(() => {
    const blank = { guest_email: '', guest_first_name: '', guest_last_name: '', guest_phone: '' }
    try { return { ...blank, ...JSON.parse(localStorage.getItem('eazy_contact') || '{}') } } catch { return blank }
  })
  const [address, setAddress] = useState({
    street_address: '', city: '', state: '', postal_code: '', country: 'Canada'
  })
  const [deliveryLatLng, setDeliveryLatLng] = useState(null)
  const autocompleteRef = useRef(null)

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  })

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    setDeliveryLatLng({ lat, lng })
    // Parse address components from the selected place
    const comp = {}
    for (const c of place.address_components || []) {
      for (const t of c.types) comp[t] = { long: c.long_name, short: c.short_name }
    }
    const streetNum = comp.street_number?.long || ''
    const route = comp.route?.long || ''
    const city = comp.locality?.long || comp.sublocality_level_1?.long || comp.administrative_area_level_3?.long || ''
    const state = comp.administrative_area_level_1?.short || ''
    const postalCode = comp.postal_code?.long || ''
    const country = comp.country?.long || 'Canada'
    setAddress({ street_address: `${streetNum} ${route}`.trim(), city, state, postal_code: postalCode, country })
  }, [])

  // Load payment section only when Stripe connected (when disconnected, this chunk is never loaded)
  useEffect(() => {
    if (STRIPE_DISCONNECTED) return
    let cancelled = false
    import('../components/CheckoutPaymentSection').then((m) => {
      if (!cancelled) setPaymentSection(() => m.default)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    api.get('/customer/stores/').then((r) => setStores(r.data || [])).catch(() => setStores([]))
  }, [])

  useEffect(() => {
    api.get('/customer/payments/config').then((r) => {
      const d = r.data || {}
      setPaymentConfig({ stripe_enabled: !!d.stripe_enabled, payments_suspended: !!d.payments_suspended })
    }).catch(() => {})
    api.get('/customer/config').then((r) => {
      const d = r.data || {}
      const fee = d.default_delivery_fee
      if (typeof fee === 'number' && fee >= 0) setDefaultDeliveryFee(fee)
      setUseDistanceBasedDelivery(!!d.use_distance_based_delivery)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const chefIds = [...new Set(cart.filter((i) => i.chef_id).map((i) => i.chef_id))]
    if (chefIds.length === 0) {
      setChefs([])
      return
    }
    Promise.all(chefIds.map((id) => api.get(`/customer/chefs/${id}`).then((r) => r.data).catch(() => null)))
      .then((results) => setChefs(results.filter(Boolean)))
  }, [cart])

  useEffect(() => {
    if (stores.length === 0 || cart.length === 0) return
    const storeIds = cart.map((i) => i.store_id).filter(Boolean)
    const unique = [...new Set(storeIds)]
    if (unique.length === 1) {
      const sid = unique[0]
      if (stores.some((s) => s.id === sid) && selectedStoreId !== sid) setSelectedStoreId(sid)
    } else if (unique.length === 0 && !cart.some((i) => !i.chef_id && i.type !== 'cuisine') && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id)
    }
  }, [stores, cart, selectedStoreId])

  // When distance-based or dynamic delivery is on, fetch delivery fee (pass order value for dynamic)
  const subtotal = getCartTotal()
  useEffect(() => {
    if (!useDistanceBasedDelivery || !selectedStoreId || !address.street_address?.trim() || !address.city?.trim() || !address.postal_code?.trim()) {
      setDeliveryFeeFromEstimate(null)
      setEstimatingDelivery(false)
      return
    }
    setEstimatingDelivery(true)
    setDeliveryFeeFromEstimate(null)
    const params = new URLSearchParams({
      store_id: selectedStoreId,
      street_address: address.street_address.trim(),
      city: address.city.trim(),
      state: (address.state || '').trim(),
      postal_code: address.postal_code.trim(),
      country: (address.country || 'Canada').trim()
    })
    if (subtotal > 0) params.set('order_value', String(subtotal))
    if (deliveryLatLng) {
      params.set('lat', String(deliveryLatLng.lat))
      params.set('lng', String(deliveryLatLng.lng))
    }
    api.get(`/customer/delivery-estimate?${params}`)
      .then((r) => {
        if (typeof r.data?.delivery_fee === 'number') setDeliveryFeeFromEstimate(r.data.delivery_fee)
        else setDeliveryFeeFromEstimate(null)
      })
      .catch(() => setDeliveryFeeFromEstimate(null))
      .finally(() => setEstimatingDelivery(false))
  }, [useDistanceBasedDelivery, selectedStoreId, address.street_address, address.city, address.state, address.postal_code, address.country, subtotal, deliveryLatLng])

  const hasStoreItems = cart.some((i) => i.store_id)
  const hasChefItems = cart.some((i) => i.chef_id && i.cuisine_id)
  const needsStoreSelection = hasStoreItems
  const selectedStore = stores.find((s) => s.id === selectedStoreId)
  const tax = subtotal * 0.08
  const deliveryFeeAmount = (() => {
    if (deliveryMethod !== 'delivery') return 0
    if (useDistanceBasedDelivery) {
      // When distance-based is on, only use the estimate (never fall back to flat $10)
      return deliveryFeeFromEstimate != null ? deliveryFeeFromEstimate : 0
    }
    if (hasStoreItems && selectedStore?.delivery_fee != null) return Number(selectedStore.delivery_fee)
    return defaultDeliveryFee
  })()
  const shipping = deliveryMethod === 'delivery' ? deliveryFeeAmount : 0
  const total = subtotal + tax + shipping

  const handlePaymentReady = useCallback((fn) => setProcessPaymentFn(() => fn), [])
  const handleCardReady = useCallback((isReady) => setCardReady(isReady), [])
  const handlePaymentSuccess = useCallback((data) => setPaymentData(data), [])
  const handlePaymentError = useCallback((msg) => alert(`Payment error: ${msg}`), [])

  const isFormValid =
    (!needsStoreSelection || selectedStoreId) &&
    (deliveryMethod === 'pickup' || (address.street_address && address.city && address.postal_code)) &&
    (deliveryMethod !== 'delivery' || !useDistanceBasedDelivery || deliveryFeeFromEstimate != null) &&
    (guestInfo.guest_email && guestInfo.guest_first_name && guestInfo.guest_last_name && guestInfo.guest_phone) &&
    (paymentConfig.payments_suspended || cardReady)

  const handlePlaceOrder = async () => {
    if (needsStoreSelection && !selectedStoreId) {
      alert('Please select a store')
      return
    }
    if (!guestInfo.guest_email || !guestInfo.guest_first_name || !guestInfo.guest_last_name || !guestInfo.guest_phone) {
      alert('Please enter your first name, last name, email and phone number so we can reach you about your order.')
      return
    }
    if (deliveryMethod === 'delivery' && (!address.street_address || !address.city || !address.postal_code)) {
      alert('Please fill in the delivery address')
      return
    }
    const paymentsSuspended = !!paymentConfig.payments_suspended
    if (!paymentsSuspended && !paymentData) {
      if (!processPaymentFn) {
        alert('Payment is not ready. Please wait a moment and try again.')
        return
      }
      setProcessingPayment(true)
      const result = await processPaymentFn()
      if (!result.success) {
        setProcessingPayment(false)
        alert(result.error || 'Payment failed.')
        return
      }
      setPaymentData(result.data)
      setProcessingPayment(false)
    }
    setLoading(true)
    try {
      const items = cart.map((item) => {
        if (item.chef_id && item.cuisine_id) {
          return { chef_id: item.chef_id, cuisine_id: item.cuisine_id, quantity: item.quantity }
        }
        return { product_id: item.id, quantity: item.quantity }
      })
      const orderData = {
        items,
        store_id: selectedStoreId || null,
        delivery_method: deliveryMethod,
        address: deliveryMethod === 'delivery' ? address : null,
        shipping_amount: deliveryMethod === 'delivery' ? deliveryFeeAmount : null,
        payment_method: paymentsSuspended ? 'cash' : 'stripe',
        payment_intent_id: paymentsSuspended ? null : (paymentData?.transaction_id || null),
        helcim_transaction_id: null,
        stripe_payment_intent_id: paymentsSuspended ? null : (paymentData?.transaction_id || paymentData?.payment_intent_id || null)
      }
      orderData.guest_email = guestInfo.guest_email.trim()
      orderData.guest_first_name = guestInfo.guest_first_name.trim()
      orderData.guest_last_name = guestInfo.guest_last_name.trim()
      orderData.guest_phone = guestInfo.guest_phone.trim()
      const response = await api.post('/customer/cart/checkout', orderData)
      try { localStorage.setItem('eazy_contact', JSON.stringify(guestInfo)) } catch { /* private mode */ }
      clearCart()
      const first = response.data?.orders?.[0]
      if (first) {
        navigate('/order-confirmation', { state: { orderNumber: first.order_number, orderId: first.order_id } })
      } else {
        navigate('/orders')
      }
    } catch (error) {
      const detail = error.response?.data?.detail
      let message = error.response?.data?.message || 'Failed to place order'
      if (typeof detail === 'string') message = detail
      else if (Array.isArray(detail) && detail[0]) message = detail[0].msg || detail[0].message || String(detail[0])
      else if (detail && typeof detail === 'object' && detail.msg) message = detail.msg
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {paymentConfig.payments_suspended && (
        <div className="mb-8 rounded-lg border border-ochre-200 bg-ochre-50 p-4" role="status">
          <p className="font-semibold text-ochre-800">Online payments are paused</p>
          <p className="mt-1 text-sm text-ochre-800">You can place your order and pay on delivery or later.</p>
        </div>
      )}
      <p className="eyebrow mb-3">Secure checkout</p>
      <h1 className="mb-8 font-display text-4xl font-medium tracking-tight text-ink-900 sm:text-5xl">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
        <div className="space-y-6 lg:col-span-2">
          {hasStoreItems && (
            selectedStore ? (
              <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6">
                <h2 className="mb-4 flex items-center font-display text-xl text-ink-900">
                  <MapPin className="h-4 w-4 mr-2 text-ink-500" /> Store
                </h2>
                <div className="rounded-md border border-paper-300 bg-paper-200/60 p-3">
                  <p className="font-semibold text-sm">{selectedStore.store_name}</p>
                  <p className="text-xs text-ink-600">{selectedStore.street_address}, {selectedStore.city}, {selectedStore.state}</p>
                  {!useDistanceBasedDelivery && selectedStore.delivery_fee != null && <p className="text-xs text-ink-600 mt-1">Delivery: ${Number(selectedStore.delivery_fee).toFixed(2)}</p>}
                {useDistanceBasedDelivery && <p className="text-xs text-ink-600 mt-1">Delivery: based on distance (enter address at checkout)</p>}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6">
                <p className="text-sm text-gray-500">Loading store…</p>
              </div>
            )
          )}

          {hasChefItems && chefs.length > 0 && (
            <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center font-display text-xl text-ink-900">
                <ChefHat className="h-4 w-4 mr-2 text-ink-500" /> Chef{chefs.length > 1 ? 's' : ''}
              </h2>
              <div className="space-y-3">
                {chefs.map((chef) => (
                  <div key={chef.id} className="rounded-md border border-paper-300 bg-paper-200/60 p-3">
                    <p className="font-semibold text-sm">{chef.chef_name || `${chef.first_name || ''} ${chef.last_name || ''}`.trim()}</p>
                    {chef.city && <p className="text-xs text-ink-600">{chef.city}{chef.state ? `, ${chef.state}` : ''}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isGuest && (
            <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6">
              <h2 className="mb-1 font-display text-xl text-ink-900">Your details</h2>
              <p className="text-xs text-gray-500 mb-3">No account needed. We use these to confirm and deliver your order, and remember them on this device.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Email *</label>
                  <input aria-label="Email" type="email" required value={guestInfo.guest_email} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_email: e.target.value }))} className="input" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input aria-label="Phone" type="tel" required value={guestInfo.guest_phone} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_phone: e.target.value }))} className="input" placeholder="So the driver or store can reach you" autoComplete="tel" />
                </div>
                <div>
                  <label className="label">First name *</label>
                  <input aria-label="First name" type="text" required value={guestInfo.guest_first_name} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_first_name: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Last name *</label>
                  <input aria-label="Last name" type="text" required value={guestInfo.guest_last_name} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_last_name: e.target.value }))} className="input" />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center font-display text-xl text-ink-900">
              <Truck className="h-4 w-4 mr-2 text-ink-500" /> Delivery Method
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${deliveryMethod === 'delivery' ? 'border-ink-900 bg-white ring-1 ring-ink-900' : 'border-paper-400 hover:border-ink-400'}`}>
                <input type="radio" name="delivery" value="delivery" checked={deliveryMethod === 'delivery'} onChange={(e) => setDeliveryMethod(e.target.value)} className="mr-2" />
                <Truck className="h-4 w-4 mr-2 text-ink-500" />
                <div>
                  <p className="font-semibold text-sm">Delivery</p>
                  <p className="text-xs text-ink-600">
                    {estimatingDelivery
                      ? 'Calculating…'
                      : useDistanceBasedDelivery && deliveryFeeFromEstimate == null
                        ? 'Enter address for price'
                        : `$${deliveryFeeAmount.toFixed(2)}`}
                  </p>
                </div>
              </label>
              <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${deliveryMethod === 'pickup' ? 'border-ink-900 bg-white ring-1 ring-ink-900' : 'border-paper-400 hover:border-ink-400'}`}>
                <input type="radio" name="delivery" value="pickup" checked={deliveryMethod === 'pickup'} onChange={(e) => setDeliveryMethod(e.target.value)} className="mr-2" />
                <MapPin className="h-4 w-4 mr-2 text-ink-500" />
                <div><p className="font-semibold text-sm">Pickup</p><p className="text-xs text-ink-600">Free</p></div>
              </label>
            </div>
          </div>

          {deliveryMethod === 'delivery' && (
            <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6">
              <h2 className="mb-4 font-display text-xl text-ink-900">Delivery Address</h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Street Address *</label>
                  {mapsLoaded && import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                    <Autocomplete
                      onLoad={(ac) => { autocompleteRef.current = ac }}
                      onPlaceChanged={onPlaceChanged}
                      options={{ types: ['address'], componentRestrictions: { country: ['ca', 'us'] } }}
                    >
                      <input type="text" required value={address.street_address} onChange={(e) => { setAddress((a) => ({ ...a, street_address: e.target.value })); setDeliveryLatLng(null) }} className="input" placeholder="Start typing your address…" />
                    </Autocomplete>
                  ) : (
                    <input type="text" required value={address.street_address} onChange={(e) => setAddress((a) => ({ ...a, street_address: e.target.value }))} className="input" placeholder="123 Main Street" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">City *</label>
                    <input aria-label="City" type="text" required value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Province</label>
                    <input aria-label="Province" type="text" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Postal Code *</label>
                    <input aria-label="Postal Code" type="text" required value={address.postal_code} onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Country</label>
                    <input aria-label="Country" type="text" value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} className="input" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center font-display text-xl text-ink-900">
              <CreditCard className="h-4 w-4 mr-2 text-ink-500" /> Payment
            </h2>
            {PaymentSection && !paymentConfig.payments_suspended && (
              <PaymentSection
                key={`pay-${total}`}
                amount={total}
                token={token}
                billingAddress={address}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onPaymentReady={handlePaymentReady}
                onCardReady={handleCardReady}
              />
            )}
            {paymentConfig.payments_suspended && (
              <p className="text-sm text-ink-600">Pay on delivery or later.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-lg border border-paper-300 bg-white p-5 sm:p-6 lg:sticky lg:top-32">
            <h2 className="mb-4 font-display text-xl text-ink-900">Order Summary</h2>
            <div className="space-y-2 mb-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 border-b border-paper-300 py-3 text-xs last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-paper-300 pt-4">
              <div className="flex justify-between text-xs"><span className="text-ink-600">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-600">Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-600">Shipping</span>
                <span>
                  {estimatingDelivery && deliveryMethod === 'delivery'
                    ? 'Calculating…'
                    : useDistanceBasedDelivery && deliveryFeeFromEstimate == null && deliveryMethod === 'delivery'
                      ? 'Enter address'
                      : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-paper-300 pt-4 text-base font-semibold">
                <span>Total</span><span className="price text-2xl">${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !isFormValid || processingPayment}
              className="btn-primary mt-6 w-full !py-3.5 !text-base"
            >
              {loading || processingPayment ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {processingPayment ? 'Processing payment…' : 'Placing order…'}
                </>
              ) : (
                <>
                  {!paymentConfig.payments_suspended && <Lock className="h-5 w-5 mr-2" />}
                  {paymentConfig.payments_suspended ? 'Place order (pay on delivery)' : 'Pay & Place Order'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
