import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { Minus, Plus, Trash2, ShoppingCart, Sparkles, TrendingUp, Users } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { resolveImageUrl } from '../utils/imageUtils'
import EmptyState from '../components/EmptyState'

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart()
  const { success: showSuccessToast, info: showInfoToast, error: showErrorToast } = useToast()
  const navigate = useNavigate()
  
  // Check if product items are from multiple stores (chef items don't have store_id)
  const getStoreIds = () => {
    const storeIds = cart.filter(item => item.store_id).map(item => item.store_id)
    return [...new Set(storeIds)]
  }

  const storeIds = getStoreIds()
  const hasMultipleStores = storeIds.length > 1
  
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
            <Link to="/groceries" className="btn-primary inline-block">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Banner Header with Ad Support */}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {cart.map((item) => {
            const itemLink = item.chef_id ? `/chefs/${item.chef_id}` : `/products/${item.id}`
            return (
            <div key={item.id} className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to={itemLink} className="flex-shrink-0 w-full sm:w-auto">
                <div className="w-full sm:w-24 h-48 sm:h-24 bg-gray-200 rounded-lg overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={resolveImageUrl(item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-cover"
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
              <div className="flex-1 w-full sm:w-auto">
                <Link to={itemLink}>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{item.name}</h3>
                </Link>
                <p className="text-base sm:text-lg font-bold text-gray-900">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-4">
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    className="p-2 hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-3 sm:px-4 py-2 text-sm sm:text-base">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    className="p-2 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleRemoveFromCart(item.id)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <div className="text-right sm:hidden">
                  <p className="text-base font-bold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-lg font-bold text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          )})}
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-4 lg:top-24">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-bold text-primary-600">
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
              className="block text-center mt-4 text-primary-600 hover:text-primary-700"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Cart

