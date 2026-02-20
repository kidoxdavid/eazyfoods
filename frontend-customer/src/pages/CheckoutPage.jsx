/**
 * New checkout page – no lazy(), no top-level Stripe imports.
 * Payment form is loaded via dynamic import in useEffect to avoid bundle initialization errors.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, CreditCard, Truck, Lock, ChefHat } from 'lucide-react'

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart()
  const { token } = useAuth()
  const isGuest = !(token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null))
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
  const [cardReady, setCardReady] = useState(false)
  const [PaymentSection, setPaymentSection] = useState(null)
  const [guestInfo, setGuestInfo] = useState({ guest_email: '', guest_first_name: '', guest_last_name: '', guest_phone: '' })
  const [address, setAddress] = useState({
    street_address: '', city: '', state: '', postal_code: '', country: 'Canada'
  })

  // Load payment section only after mount (no Stripe in this chunk)
  useEffect(() => {
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
      const fee = r.data?.default_delivery_fee
      if (typeof fee === 'number' && fee >= 0) setDefaultDeliveryFee(fee)
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

  const hasStoreItems = cart.some((i) => i.store_id)
  const hasChefItems = cart.some((i) => i.chef_id && i.cuisine_id)
  const needsStoreSelection = hasStoreItems
  const selectedStore = stores.find((s) => s.id === selectedStoreId)
  const subtotal = getCartTotal()
  const tax = subtotal * 0.08
  const deliveryFeeAmount = (hasStoreItems && selectedStore?.delivery_fee != null) ? Number(selectedStore.delivery_fee) : defaultDeliveryFee
  const shipping = deliveryMethod === 'delivery' ? deliveryFeeAmount : 0
  const total = subtotal + tax + shipping

  const handlePaymentReady = useCallback((fn) => setProcessPaymentFn(() => fn), [])
  const handleCardReady = useCallback((isReady) => setCardReady(isReady), [])
  const handlePaymentSuccess = useCallback((data) => setPaymentData(data), [])
  const handlePaymentError = useCallback((msg) => alert(`Payment error: ${msg}`), [])

  const isFormValid =
    (!needsStoreSelection || selectedStoreId) &&
    (deliveryMethod === 'pickup' || (address.street_address && address.city && address.postal_code)) &&
    (!isGuest || (guestInfo.guest_email && guestInfo.guest_first_name && guestInfo.guest_last_name)) &&
    (paymentConfig.payments_suspended || cardReady)

  const handlePlaceOrder = async () => {
    if (needsStoreSelection && !selectedStoreId) {
      alert('Please select a store')
      return
    }
    if (isGuest && (!guestInfo.guest_email || !guestInfo.guest_first_name || !guestInfo.guest_last_name)) {
      alert('Please enter your email, first name, and last name')
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
        payment_method: paymentsSuspended ? 'cash' : 'stripe',
        payment_intent_id: paymentsSuspended ? null : (paymentData?.transaction_id || null),
        helcim_transaction_id: null,
        stripe_payment_intent_id: paymentsSuspended ? null : (paymentData?.transaction_id || paymentData?.payment_intent_id || null)
      }
      if (isGuest) {
        orderData.guest_email = guestInfo.guest_email
        orderData.guest_first_name = guestInfo.guest_first_name
        orderData.guest_last_name = guestInfo.guest_last_name
        orderData.guest_phone = guestInfo.guest_phone || null
      }
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await api.post('/customer/cart/checkout', orderData, { headers })
      clearCart()
      if (response.data?.orders?.length > 0) {
        const orderId = response.data.orders[0].order_id
        const orderNumber = response.data.orders[0].order_number
        if (isGuest) navigate('/order-confirmation', { state: { orderNumber, orderId } })
        else navigate(`/orders/${orderId}`, { state: { orderPlaced: true, orderNumber } })
      } else {
        navigate(isGuest ? '/' : '/orders')
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {paymentConfig.payments_suspended && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-400 rounded-lg">
          <p className="text-amber-800 font-semibold">Payments are currently suspended</p>
          <p className="text-sm text-amber-700 mt-1">You can place your order and pay on delivery or later.</p>
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {hasStoreItems && (
            selectedStore ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-primary-600" /> Store
                </h2>
                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <p className="font-semibold text-sm">{selectedStore.store_name}</p>
                  <p className="text-xs text-gray-600">{selectedStore.street_address}, {selectedStore.city}, {selectedStore.state}</p>
                  {selectedStore.delivery_fee != null && <p className="text-xs text-gray-600 mt-1">Delivery: ${Number(selectedStore.delivery_fee).toFixed(2)}</p>}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Loading store…</p>
              </div>
            )
          )}

          {hasChefItems && chefs.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold mb-3 flex items-center">
                <ChefHat className="h-4 w-4 mr-2 text-primary-600" /> Chef{chefs.length > 1 ? 's' : ''}
              </h2>
              <div className="space-y-3">
                {chefs.map((chef) => (
                  <div key={chef.id} className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <p className="font-semibold text-sm">{chef.chef_name || `${chef.first_name || ''} ${chef.last_name || ''}`.trim()}</p>
                    {chef.city && <p className="text-xs text-gray-600">{chef.city}{chef.state ? `, ${chef.state}` : ''}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isGuest && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold mb-3">Your details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required value={guestInfo.guest_email} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_email: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={guestInfo.guest_phone} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_phone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First name *</label>
                  <input type="text" required value={guestInfo.guest_first_name} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_first_name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last name *</label>
                  <input type="text" required value={guestInfo.guest_last_name} onChange={(e) => setGuestInfo((p) => ({ ...p, guest_last_name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-base font-semibold mb-3 flex items-center">
              <Truck className="h-4 w-4 mr-2 text-primary-600" /> Delivery Method
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${deliveryMethod === 'delivery' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                <input type="radio" name="delivery" value="delivery" checked={deliveryMethod === 'delivery'} onChange={(e) => setDeliveryMethod(e.target.value)} className="mr-2" />
                <Truck className="h-4 w-4 mr-2 text-primary-600" />
                <div><p className="font-semibold text-sm">Delivery</p><p className="text-xs text-gray-600">${deliveryFeeAmount.toFixed(2)}</p></div>
              </label>
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${deliveryMethod === 'pickup' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                <input type="radio" name="delivery" value="pickup" checked={deliveryMethod === 'pickup'} onChange={(e) => setDeliveryMethod(e.target.value)} className="mr-2" />
                <MapPin className="h-4 w-4 mr-2 text-primary-600" />
                <div><p className="font-semibold text-sm">Pickup</p><p className="text-xs text-gray-600">Free</p></div>
              </label>
            </div>
          </div>

          {deliveryMethod === 'delivery' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold mb-3">Delivery Address</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Street Address *</label>
                  <input type="text" required value={address.street_address} onChange={(e) => setAddress((a) => ({ ...a, street_address: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="123 Main Street" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                    <input type="text" required value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
                    <input type="text" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input type="text" required value={address.postal_code} onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                    <input type="text" value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-base font-semibold mb-3 flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-primary-600" /> Payment
            </h2>
            {PaymentSection && !paymentConfig.payments_suspended && (
              <PaymentSection
                key={`pay-${total}`}
                amount={total}
                token={token}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onPaymentReady={handlePaymentReady}
                onCardReady={handleCardReady}
              />
            )}
            {paymentConfig.payments_suspended && (
              <p className="text-sm text-gray-600">Pay on delivery or later.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-base font-semibold mb-3">Order Summary</h2>
            <div className="space-y-2 mb-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-gray-600">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600">Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600">Shipping</span><span>${shipping.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span>Total</span><span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !isFormValid || processingPayment}
              className="w-full mt-4 bg-primary-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
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
