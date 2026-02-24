import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useLocation } from '../contexts/LocationContext'
import { useSaveForLater } from '../contexts/SaveForLaterContext'
import { useToast } from '../contexts/ToastContext'
import { Minus, Plus, Trash2, ShoppingCart, Sparkles, TrendingUp, Users, ArrowRightLeft, Bookmark, BookmarkCheck, Zap } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { resolveImageUrl } from '../utils/imageUtils'
import api from '../services/api'

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart, addToCart } = useCart()
  const { saved, addToSaveForLater, removeFromSaveForLater, moveToCart } = useSaveForLater()
  const { success: showSuccessToast, info: showInfoToast, error: showErrorToast } = useToast()
  const navigate = useNavigate()
  const [compareData, setCompareData] = useState(null)
  const [upsellProducts, setUpsellProducts] = useState([])
  const { selectedCity } = useLocation()

  const handleSaveForLater = (item) => {
    addToSaveForLater(item, item.quantity)
    removeFromCart(item.id)
    showSuccessToast(`${item.name} saved for later`)
  }

  // Check if product items are from multiple stores (chef items don't have store_id)
  const getStoreIds = () => {
    const storeIds = cart.filter(item => item.store_id).map(item => item.store_id)
    return [...new Set(storeIds)]
  }

  const storeIds = getStoreIds()
  const hasMultipleStores = storeIds.length > 1
  const productOnlyCart = cart.filter(item => item.store_id && !item.chef_id)
  const canCompare = storeIds.length === 1 && productOnlyCart.length > 0

  useEffect(() => {
    if (!canCompare || !storeIds[0]) return
    const keywords = productOnlyCart.map(i => i.name).join(',').slice(0, 200)
    api.get('/customer/stores/compare', { params: { store_id: storeIds[0], keywords } })
      .then(r => {
        if (r.data?.alternate_store && (r.data?.similar_products?.length > 0 || r.data?.total >= 0)) setCompareData(r.data)
        else setCompareData(null)
      })
      .catch(() => setCompareData(null))
  }, [storeIds[0], canCompare, cart.length])

  const handleSwitchToCompareStore = () => {
    if (!compareData?.alternate_store || !compareData?.similar_products?.length) return
    clearCart()
    compareData.similar_products.forEach(p => {
      addToCart({ ...p, store_id: compareData.alternate_store.id }, p.quantity || 1, false)
    })
    showSuccessToast(`Switched to ${compareData.alternate_store.store_name || compareData.alternate_store.business_name}. Compare prices at checkout.`)
    setCompareData(null)
  }
  
  const handleUpdateQuantity = (itemId, newQuantity) => {
    const item = cart.find(i => i.id === itemId)
    updateQuantity(itemId, newQuantity)
    if (item) {
      if (newQuantity > item.quantity) {
        showSuccessToast(`${item.name} quantity increased`)
      } else {
        showInfoToast(`${item.name} quantity decreased`)
      }
    }
  }
  
  const handleRemoveFromCart = (itemId) => {
    const item = cart.find(i => i.id === itemId)
    removeFromCart(itemId)
    if (item) {
      showInfoToast(`${item.name} removed from cart`)
    }
  }
  
  const handleClearCart = () => {
    clearCart()
    showInfoToast('Cart cleared')
  }

  // Deals / upsell products (similar to Top Market Deals)
  useEffect(() => {
    const fetchUpsellProducts = async () => {
      try {
        const params = { discounted: true, limit: 5 }
        if (selectedCity && selectedCity !== 'All') {
          params.city = selectedCity
        }
        const res = await api.get('/customer/products', { params })
        const list = res.data?.products || res.data || []
        setUpsellProducts(Array.isArray(list) ? list.slice(0, 5) : [])
      } catch {
        setUpsellProducts([])
      }
    }

    fetchUpsellProducts()
  }, [selectedCity])

  if (cart.length === 0) {
    return (
      <div className="w-full">
        {/* Banner Header with Ad Support */}
        <PageBanner
          title="Shopping Cart"
          subtitle="Your items are waiting for you"
          placement="cart_top_banner"
          defaultContent={
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Your Shopping Cart
                </h1>
              </div>
              <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
                Your cart is empty. Start adding authentic African groceries and ingredients to your cart!
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Featured Items</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Top Deals</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Popular Now</span>
                </div>
              </div>
            </div>
          }
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <ShoppingCart className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty — let's fill it with African flavors! 🛒</h2>
            <p className="text-gray-600 mb-6">Discover authentic African groceries, spices, and ingredients waiting for you</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/groceries" className="btn-primary inline-block">
                Continue Shopping
              </Link>
              <Link
                to="/top-market-deals"
                className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-semibold"
              >
                Browse Top Market Deals
              </Link>
              <Link
                to="/stores"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-semibold"
              >
                Discover Local Markets
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <PageBanner
        title="Shopping Cart"
        subtitle="Review your items before checkout"
        placement="cart_top_banner"
        defaultContent={
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Review Your Cart
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Review your items before checkout. Ready to complete your order?
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Secure Checkout</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Fast Delivery</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Easy Returns</span>
              </div>
            </div>
          </div>
        }
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-4 sm:pb-8">
        {/* Deals / upsell strip */}
        {upsellProducts.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Save more on these deals
              </h2>
              <Link
                to="/top-market-deals"
                className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                View all deals
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {upsellProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    addToCart(p, 1)
                    showSuccessToast(`${p.name} added to cart!`)
                  }}
                  className="flex-shrink-0 w-32 sm:w-36 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden text-left"
                >
                  <div className="relative aspect-square bg-gray-100">
                    {p.image_url && (
                      <img
                        src={resolveImageUrl(p.image_url)}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-xs font-bold text-primary-600">
                      ${Number(p.price).toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Two panes: Cart (left) | Saved for later (right) on desktop; stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Pane 1: Your cart */}
          <div className="lg:col-span-1 space-y-2 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary-600" />
              Your cart ({cart.length})
            </h2>
          {cart.map((item) => {
            const itemLink = item.chef_id ? `/chefs/${item.chef_id}` : `/products/${item.id}`
            return (
            <div key={item.id} className="card flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4">
              <Link to={itemLink} className="flex-shrink-0 w-full sm:w-auto">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {item.image_url ? (
                    <img
                      src={resolveImageUrl(item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error('[Cart] Image failed to load:', item.image_url)
                        e.target.style.display = 'none'
                        const fallback = e.target.parentElement.querySelector('.image-fallback')
                        if (fallback) {
                          fallback.style.display = 'flex'
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No Image
                    </div>
                  )}
                  <div className="image-fallback absolute inset-0 w-full h-full flex items-center justify-center text-gray-400 text-xs hidden">
                    No Image
                  </div>
                </div>
              </Link>
              <div className="flex-1 w-full sm:w-auto min-w-0">
                <Link to={itemLink}>
                  <h3 className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-base line-clamp-2">{item.name}</h3>
                </Link>
                <p className="text-sm sm:text-lg font-bold text-gray-900">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2 sm:gap-4">
                <div className="flex items-center space-x-1 sm:space-x-2 border border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    className="p-1.5 sm:p-2 hover:bg-gray-50"
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <span className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    className="p-1.5 sm:p-2 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleSaveForLater(item)}
                  className="p-1.5 sm:p-2 text-gray-500 hover:text-primary-600"
                  title="Save for later"
                >
                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button
                  onClick={() => handleRemoveFromCart(item.id)}
                  className="p-1.5 sm:p-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <div className="text-right sm:hidden">
                  <p className="text-sm font-bold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-base sm:text-lg font-bold text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          )})}

          {/* Compare with another store (inside cart pane) */}
          {compareData?.alternate_store && (
            <div className="card p-4 sm:p-5 border-2 border-primary-200 bg-primary-50/30">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary-600" />
                Compare with another store
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Similar items at <strong>{compareData.alternate_store.store_name || compareData.alternate_store.business_name}</strong> in the same city:
              </p>
              <ul className="space-y-1.5 mb-3 max-h-32 overflow-y-auto text-sm">
                {compareData.similar_products.slice(0, 8).map(p => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <span className="font-medium shrink-0">${Number(p.price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-primary-200">
                <span className="font-semibold text-gray-900">
                  Est. total: ${typeof compareData.total === 'number' ? compareData.total.toFixed(2) : '0.00'}
                </span>
                <button
                  type="button"
                  onClick={handleSwitchToCompareStore}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm"
                >
                  Switch to this store
                </button>
              </div>
            </div>
          )}
          </div>

          {/* Pane 2: Saved for later */}
          <div className="lg:col-span-1 space-y-2 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-primary-600" />
              Saved for later ({saved.length})
            </h2>
            <div className="card p-4 sm:p-5 min-h-[200px]">
              {saved.length === 0 ? (
                <p className="text-gray-500 py-6 text-center text-sm">No items saved. Use the bookmark on any cart item to save it for later.</p>
              ) : (
                <div className="space-y-3">
                  {saved.map((item) => {
                    const itemLink = item.chef_id ? `/chefs/${item.chef_id}` : `/products/${item.id}`
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Link to={itemLink} className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded-lg overflow-hidden">
                          {item.image_url ? (
                            <img src={resolveImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={itemLink} className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 hover:text-primary-600">{item.name}</Link>
                          <p className="text-sm font-bold text-primary-600">${(item.price || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => moveToCart(item.id, addToCart)}
                            className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                          >
                            Move to cart
                          </button>
                          <button
                            onClick={() => { removeFromSaveForLater(item.id); showInfoToast('Removed from saved') }}
                            className="p-1.5 text-gray-400 hover:text-red-600"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-4 lg:top-24 p-4 sm:p-5">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Order Summary</h2>
            <div className="space-y-2 sm:space-y-4 mb-4 sm:mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-200 pt-3 sm:pt-4">
                <div className="flex justify-between">
                  <span className="text-base sm:text-lg font-semibold">Total</span>
                  <span className="text-base sm:text-lg font-bold text-primary-600">
                    ${getCartTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (hasMultipleStores) {
                  showErrorToast('Please remove items from other stores. You can only shop from one store at a time.')
                  return
                }
                navigate('/checkout')
              }}
              disabled={hasMultipleStores}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasMultipleStores ? 'Cannot Checkout - Multiple Stores' : 'Proceed to Checkout'}
            </button>
            <Link
              to="/groceries"
              className="block text-center mt-3 sm:mt-4 text-sm sm:text-base text-primary-600 hover:text-primary-700"
            >
              Continue Shopping
            </Link>
            <p className="mt-3 text-xs sm:text-sm text-gray-600 text-center">
              Secure checkout • Fast delivery
              {selectedCity && selectedCity !== 'All' && (
                <> in <span className="font-semibold text-gray-800">{selectedCity}</span></>
              )}
              .{' '}
              <Link
                to="/orders"
                className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
              >
                View your orders
              </Link>
              {' · '}
              <Link
                to="/profile"
                className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
              >
                Manage profile & addresses
              </Link>
              . You’ll confirm address and delivery on the next step.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Cart

