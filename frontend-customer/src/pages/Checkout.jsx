import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, CreditCard, Truck, Lock, ChefHat } from 'lucide-react'
import PrivateRoute from '../components/PrivateRoute'
import HelcimPayment from '../components/HelcimPayment'
import StripePayment from '../components/StripePayment'
import TestStripeModal, { TEST_AMOUNT } from '../components/TestStripeModal'

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useCart()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [stores, setStores] = useState([])
  const [chefs, setChefs] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('delivery')
  const [paymentData, setPaymentData] = useState(null)
  const [processPaymentFn, setProcessPaymentFn] = useState(null)
  const [paymentConfig, setPaymentConfig] = useState({ stripe_enabled: true, helcim_enabled: false, payments_suspended: false })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe') // 'stripe' | 'helcim'
  const [cardReady, setCardReady] = useState(false)
  const [address, setAddress] = useState({
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Canada'
  })
  const [showRefreshBanner, setShowRefreshBanner] = useState(false)
  const [testStripeOpen, setTestStripeOpen] = useState(false)
  const [testStripeClientSecret, setTestStripeClientSecret] = useState(null)

  useEffect(() => {
    fetchStores()
  }, [])

  // Fetch chef details for chef items in cart
  useEffect(() => {
    const chefIds = [...new Set(cart.filter(item => item.chef_id).map(item => item.chef_id))]
    if (chefIds.length === 0) {
      setChefs([])
      return
    }
    Promise.all(chefIds.map(id => api.get(`/customer/chefs/${id}`).then(r => r.data).catch(() => null)))
      .then(results => setChefs(results.filter(Boolean)))
  }, [cart])

  useEffect(() => {
    api.get('/customer/payments/config').then(r => {
      const d = r.data || {}
      setPaymentConfig({
        stripe_enabled: !!d.stripe_enabled,
        helcim_enabled: !!d.helcim_enabled,
        payments_suspended: !!d.payments_suspended
      })
      setSelectedPaymentMethod(prev => {
        if (prev === 'stripe' && !d.stripe_enabled && d.helcim_enabled) return 'helcim'
        if (prev === 'helcim' && !d.helcim_enabled && d.stripe_enabled) return 'stripe'
        return prev
      })
    }).catch(() => setPaymentConfig({ stripe_enabled: true, helcim_enabled: false, payments_suspended: false }))
  }, [])

  const handleCreateTestStripePayment = async () => {
    if (!token) {
      alert('Please log in first.')
      return
    }
    try {
      const res = await api.post('/customer/payments/create-payment-intent', { total_amount: TEST_AMOUNT, gateway: 'stripe' }, { headers: { Authorization: `Bearer ${token}` } })
      const secret = res.data?.client_secret
      if (secret) {
        setTestStripeClientSecret(secret)
        setTestStripeOpen(true)
      } else {
        alert('Could not create test payment.')
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create test payment. Is the backend running?')
    }
  }

  const handleCloseTestStripe = () => {
    setTestStripeOpen(false)
    setTestStripeClientSecret(null)
  }

  const handleSelectPaymentMethod = (method) => {
    if (method === 'stripe' && !paymentConfig.stripe_enabled) return
    if (method === 'helcim' && !paymentConfig.helcim_enabled) return
    setSelectedPaymentMethod(method)
    setPaymentData(null)
    setProcessPaymentFn(null)
    setCardReady(false)
  }

  // Auto-select store from cart items (all items should be from same store)
  useEffect(() => {
    if (stores.length > 0 && cart.length > 0) {
      const storeIds = cart.map(item => item.store_id).filter(Boolean)
      const uniqueStoreIds = [...new Set(storeIds)]
      
      // All items should be from the same store (validated at cart page)
      if (uniqueStoreIds.length === 1) {
        const cartStoreId = uniqueStoreIds[0]
        // Verify store exists in stores list
        const cartStore = stores.find(s => s.id === cartStoreId)
        if (cartStore && selectedStoreId !== cartStoreId) {
          setSelectedStoreId(cartStoreId)
          console.log('Auto-selected store from cart:', cartStore.store_name)
        }
      } else if (uniqueStoreIds.length === 0) {
        // No store IDs in cart - could be chef-only cart or old cart items
        const hasStoreProducts = cart.some(item => !item.chef_id && item.type !== 'cuisine')
        if (hasStoreProducts) {
          console.warn('Cart items missing store_id. Please refresh and re-add items to cart.')
          if (!selectedStoreId && stores.length > 0) {
            setSelectedStoreId(stores[0].id)
          }
        } else {
          setSelectedStoreId('') // Chef-only cart, no store needed
        }
      } else {
        // Multiple stores - this should have been caught at cart page
        console.error('Multiple stores detected in cart:', uniqueStoreIds)
      }
    } else if (stores.length > 0 && !selectedStoreId && cart.length === 0) {
      // Empty cart - select first store as default
      setSelectedStoreId(stores[0].id)
    }
  }, [stores, cart, selectedStoreId])

  const fetchStores = async () => {
    try {
      const response = await api.get('/customer/stores/')
      setStores(response.data || [])
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    }
  }

  const hasStoreItems = cart.some(item => item.store_id)
  const hasChefItems = cart.some(item => item.chef_id && item.cuisine_id)
  const needsStoreSelection = hasStoreItems

  const handlePlaceOrder = async () => {
    if (needsStoreSelection && !selectedStoreId) {
      alert('Please select a store')
      return
    }

    if (deliveryMethod === 'delivery' && (!address.street_address || !address.city || !address.postal_code)) {
      alert('Please fill in the delivery address')
      return
    }

    const paymentsSuspended = !!paymentConfig.payments_suspended

    // Process payment only when payments are not suspended
    if (!paymentsSuspended && !paymentData) {
      if (!processPaymentFn) {
        alert('Payment system is not ready. Please wait a moment and try again.')
        return
      }

      setProcessingPayment(true)
      const result = await processPaymentFn()

      if (!result.success) {
        setProcessingPayment(false)
        const msg = result.error || ''
        if (msg.includes('full card') || msg.includes('secure payment window')) {
          setShowRefreshBanner(true)
          alert('This page is using an old version. Please hard refresh to load the secure payment:\n\n• Mac: Cmd + Shift + R\n• Windows: Ctrl + Shift + R\n\nThen use "Pay & Place Order" to open the payment window.')
        } else {
          alert(`Payment failed: ${msg}`)
        }
        return
      }

      setPaymentData(result.data)
      setProcessingPayment(false)
    }

    setLoading(true)

    try {
      const isStripe = !paymentsSuspended && paymentData?.payment_method === 'stripe'
      const items = cart.map(item => {
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
        payment_method: paymentsSuspended ? 'cash' : (paymentData?.payment_method || selectedPaymentMethod),
        payment_intent_id: paymentsSuspended ? null : (paymentData?.transaction_id || null),
        helcim_transaction_id: paymentsSuspended ? null : (isStripe ? null : (paymentData?.transaction_id || null)),
        stripe_payment_intent_id: paymentsSuspended ? null : (isStripe ? (paymentData?.transaction_id || paymentData?.payment_intent_id) : null)
      }

      // Use token from AuthContext so we always send the same customer JWT that passed PrivateRoute
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await api.post('/customer/cart/checkout', orderData, { headers })
      clearCart()
      
      if (response.data.orders && response.data.orders.length > 0) {
        const orderId = response.data.orders[0].order_id
        navigate(`/orders/${orderId}`, { 
          state: { 
            orderPlaced: true,
            orderNumber: response.data.orders[0].order_number 
          } 
        })
      } else {
        navigate('/orders')
      }
    } catch (error) {
      const detail = error.response?.data?.detail
      let message = error.userMessage || error.response?.data?.message || 'Failed to place order'
      if (detail) {
        if (typeof detail === 'string') message = detail
        else if (Array.isArray(detail) && detail[0]) message = detail[0].msg || detail[0].message || String(detail[0])
        else if (typeof detail === 'object' && detail.msg) message = detail.msg
      }
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (data) => {
    setPaymentData(data)
  }

  const handlePaymentError = (error) => {
    alert(`Payment error: ${error}`)
  }

  const handlePaymentReady = useCallback((fn) => {
    setProcessPaymentFn(() => fn)
  }, [])

  const handleCardReady = useCallback((isReady) => {
    console.log('🔄 handleCardReady called with:', isReady)
    setCardReady(prev => {
      if (prev !== isReady) {
        console.log('✅ cardReady state updating from', prev, 'to', isReady)
        return isReady
      }
      return prev
    })
  }, [])
  
  useEffect(() => {
    console.log('📊 Card ready state:', cardReady)
  }, [cardReady])

  const subtotal = getCartTotal()
  const tax = subtotal * 0.08
  const shipping = deliveryMethod === 'delivery' ? 5.00 : 0.00
  const total = subtotal + tax + shipping

  // When payments are suspended, card is not required; otherwise card must be ready
  // selectedStoreId only required when cart has store items
  const isFormValid =
    (!needsStoreSelection || selectedStoreId) &&
    (deliveryMethod === 'pickup' || (address.street_address && address.city && address.postal_code)) &&
    (paymentConfig.payments_suspended || cardReady)
  
  useEffect(() => {
    const addressComplete = deliveryMethod === 'pickup' || (address.street_address && address.city && address.postal_code)
    console.log('🔍 Form validation check:', {
      selectedStoreId: !!selectedStoreId,
      deliveryMethod,
      addressComplete,
      cardReady,
      isFormValid,
      buttonShouldBeEnabled: !loading && !processingPayment && isFormValid
    })
  }, [selectedStoreId, deliveryMethod, address, cardReady, isFormValid, loading, processingPayment])

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <PrivateRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {showRefreshBanner && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
            <span className="text-amber-600 font-semibold shrink-0">⚠️ Update required</span>
            <div className="text-sm text-amber-800">
              <p className="font-medium">Your browser is showing an old checkout page.</p>
              <p className="mt-1">Hard refresh to load the secure payment: <strong>Mac: Cmd + Shift + R</strong> or <strong>Windows: Ctrl + Shift + R</strong>. Then click &quot;Pay & Place Order&quot; to open the payment window.</p>
            </div>
          </div>
        )}
        {paymentConfig.payments_suspended && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-400 rounded-lg">
            <p className="text-amber-800 font-semibold">Payments are currently suspended</p>
            <p className="text-sm text-amber-700 mt-1">You can place your order and pay on delivery or later.</p>
          </div>
        )}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Checkout Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Store Info - when cart has store items */}
            {hasStoreItems && (
              selectedStore ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-semibold mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-primary-600" />
                    Store
                  </h2>
                  <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-primary-600" />
                        <div>
                          <p className="font-semibold text-sm">{selectedStore.store_name}</p>
                          <p className="text-xs text-gray-600">{selectedStore.street_address}, {selectedStore.city}, {selectedStore.state}</p>
                        </div>
                      </div>
                      {selectedStore.delivery_fee != null && (
                        <p className="text-xs text-gray-600">Delivery: ${Number(selectedStore.delivery_fee).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Loading store information...</p>
                </div>
              )
            )}

            {/* Chef Info - when cart has chef items */}
            {hasChefItems && chefs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold mb-3 flex items-center">
                  <ChefHat className="h-4 w-4 mr-2 text-primary-600" />
                  Chef{chefs.length > 1 ? 's' : ''}
                </h2>
                <div className="space-y-3">
                  {chefs.map((chef) => (
                    <div key={chef.id} className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                      <div className="flex items-center">
                        <ChefHat className="h-4 w-4 mr-2 text-primary-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">{chef.chef_name || `${chef.first_name || ''} ${chef.last_name || ''}`.trim()}</p>
                          {chef.city && (
                            <p className="text-xs text-gray-600">{chef.city}{chef.state ? `, ${chef.state}` : ''}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold mb-3 flex items-center">
                <Truck className="h-4 w-4 mr-2 text-primary-600" />
                Delivery Method
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  deliveryMethod === 'delivery' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="delivery"
                    checked={deliveryMethod === 'delivery'}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="mr-2"
                  />
                  <Truck className="h-4 w-4 mr-2 text-primary-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Delivery</p>
                    <p className="text-xs text-gray-600">$5.00</p>
                  </div>
                </label>
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  deliveryMethod === 'pickup' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="pickup"
                    checked={deliveryMethod === 'pickup'}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="mr-2"
                  />
                  <MapPin className="h-4 w-4 mr-2 text-primary-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Pickup</p>
                    <p className="text-xs text-gray-600">Free</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Delivery Address */}
            {deliveryMethod === 'delivery' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold mb-3">Delivery Address</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={address.street_address}
                      onChange={(e) => setAddress({ ...address, street_address: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
                      <input
                        type="text"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code *</label>
                      <input
                        type="text"
                        required
                        value={address.postal_code}
                        onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={address.country}
                        onChange={(e) => setAddress({ ...address, country: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method – A/B style: choose Stripe or Helcim */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold mb-3 flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-primary-600" />
                Payment Method
              </h2>
              <p className="text-xs text-gray-500 mb-3">Choose how you’d like to pay. You can switch and compare both options.</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethod('stripe')}
                  disabled={!paymentConfig.stripe_enabled}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    selectedPaymentMethod === 'stripe'
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                      : paymentConfig.stripe_enabled
                        ? 'border-gray-200 bg-gray-50 opacity-75 hover:opacity-100 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="font-semibold text-sm text-gray-900 block">Stripe</span>
                  <span className="text-xs text-gray-500 mt-0.5">Card form on this page. Test payments: Dashboard → Test mode → Payments.</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethod('helcim')}
                  disabled={!paymentConfig.helcim_enabled}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    selectedPaymentMethod === 'helcim'
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                      : paymentConfig.helcim_enabled
                        ? 'border-gray-200 bg-gray-50 opacity-75 hover:opacity-100 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="font-semibold text-sm text-gray-900 block">Helcim</span>
                  <span className="text-xs text-gray-500 mt-0.5">Opens secure payment window</span>
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Verify Stripe Test mode: create a $1 test payment and see it in your Dashboard.</p>
                <button
                  type="button"
                  onClick={handleCreateTestStripePayment}
                  className="px-3 py-1.5 text-sm border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50"
                >
                  Test Stripe — Send $1 to Dashboard
                </button>
              </div>

              {selectedPaymentMethod === 'stripe' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <StripePayment
                    key={`stripe-${total}`}
                    amount={total}
                    token={token}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onPaymentReady={handlePaymentReady}
                    onCardReady={handleCardReady}
                  />
                </div>
              )}
              {selectedPaymentMethod === 'helcim' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <HelcimPayment
                    amount={total}
                    token={token}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onPaymentReady={handlePaymentReady}
                    onCardReady={handleCardReady}
                  />
                </div>
              )}
            </div>
          </div>

          <TestStripeModal open={testStripeOpen} clientSecret={testStripeClientSecret} onClose={handleCloseTestStripe} />

          {/* Order Summary Sidebar */}
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
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-primary-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Debug info */}
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                <div>Store: {!needsStoreSelection ? 'N/A' : selectedStoreId ? '✓' : '✗'}</div>
                <div>Address: {deliveryMethod === 'pickup' || (address.street_address && address.city && address.postal_code) ? '✓' : '✗'}</div>
                <div>{paymentConfig.payments_suspended ? 'Payments suspended' : `Card Ready: ${cardReady ? '✓' : '✗'}`}</div>
                <div>Form Valid: {isFormValid ? '✓' : '✗'}</div>
                <div>Button Disabled: {loading || !isFormValid || processingPayment ? 'YES' : 'NO'}</div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !isFormValid || processingPayment}
                className="w-full mt-4 bg-primary-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm transition-colors"
              >
                {loading || processingPayment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {processingPayment ? 'Processing Payment...' : 'Placing Order...'}
                  </>
                ) : (
                  <>
                    {paymentConfig.payments_suspended ? null : <Lock className="h-5 w-5 mr-2" />}
                    {paymentConfig.payments_suspended ? 'Place order (pay on delivery)' : 'Pay & Place Order'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PrivateRoute>
  )
}

export default Checkout
