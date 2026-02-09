import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, X, Trash2, ShoppingBag, ArrowRight, Package } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { resolveImageUrl } from '../utils/imageUtils'

const CartPreview = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, getCartTotal, getCartItemCount } = useCart()
  const dropdownRef = useRef(null)
  const viewCartButtonRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the View Cart button
      if (viewCartButtonRef.current && viewCartButtonRef.current.contains(event.target)) {
        return
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      // Use a small delay to allow button clicks to process first
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] lg:relative lg:inset-auto lg:z-auto">
      {/* Backdrop for mobile - behind dropdown, closes on click */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200 z-[101]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dropdown - above backdrop on mobile; below button on desktop. Stops propagation so clicks work. */}
      <div
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bg-white rounded-xl shadow-xl border border-gray-100 max-h-[75vh] overflow-hidden flex flex-col z-[102] animate-in slide-in-from-top-2 fade-in duration-200
          top-4 left-4 right-4 w-auto max-w-sm mx-auto
          lg:top-full lg:left-auto lg:right-0 lg:mt-2 lg:w-72 lg:max-w-none lg:mx-0"
        style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
      >
        {/* Header - Compact */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Your Cart</h3>
              <p className="text-[10px] text-primary-100">{getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-all duration-200 hover:rotate-90"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {cart.length === 0 ? (
            <div className="p-8 text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <ShoppingCart className="h-8 w-8 text-primary-400" />
                </div>
              </div>
              <h4 className="text-base font-semibold text-gray-900 mb-1">Your cart is empty</h4>
              <p className="text-xs text-gray-500 mb-4">Start adding items to see them here!</p>
              <Link
                to="/groceries"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
              >
                Start Shopping
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Product Image - Compact */}
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow duration-200">
                    {item.image_url ? (
                      <img
                        src={resolveImageUrl(item.image_url)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Product Info - Compact */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 truncate mb-0.5 group-hover:text-primary-600 transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                        Qty: {item.quantity}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-primary-600">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Remove Button - Compact */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group/remove"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5 group-hover/remove:scale-110 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white p-3">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Subtotal</span>
              <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                ${getCartTotal().toFixed(2)}
              </span>
            </div>
            <div ref={viewCartButtonRef}>
              <Link
                to="/cart"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="group relative w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-sm overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  View Cart
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </Link>
            </div>
            <p className="text-[10px] text-center text-gray-500 mt-2">
              Shipping calculated at checkout
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartPreview

