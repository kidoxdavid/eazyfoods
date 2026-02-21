import { useState, useEffect } from 'react'
import { X, ShoppingCart, Plus, Minus, Star, ExternalLink } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { Link } from 'react-router-dom'
import { resolveImageUrl } from '../utils/imageUtils'

const QuickViewModal = ({ product, isOpen, onClose }) => {
  const [quantity, setQuantity] = useState(1)
  const cartContext = useCart()
  const toastContext = useToast()
  const addToCart = (cartContext && cartContext.addToCart) ? cartContext.addToCart : (() => {})
  const showSuccessToast = (toastContext && toastContext.success) ? toastContext.success : (() => {})

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open')
      setQuantity(1)
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [isOpen])

  if (!isOpen || !product) return null

  const handleAddToCart = () => {
    addToCart(product, quantity)
    onClose()
  }

  const increaseQuantity = () => {
    if (quantity < product.stock_quantity) setQuantity(quantity + 1)
  }
  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1)
  }

  const price = Number(product.price) ?? 0
  const compareAt = product.compare_at_price != null && product.compare_at_price > price
  const discountPct = compareAt ? Math.round(((product.compare_at_price - price) / product.compare_at_price) * 100) : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[80vh] md:max-h-[85vh] max-w-[95vw] sm:max-w-[90vw] md:max-w-2xl lg:max-w-3xl border-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop: elegant bar with close */}
        <div className="flex items-center justify-between flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Quick view</span>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            type="button"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Image - compact on mobile, prominent on desktop */}
          <div className="relative w-full md:w-2/5 flex-shrink-0 bg-gray-50 flex items-center justify-center p-4 md:p-6">
            <div className="relative aspect-square w-full max-w-[200px] sm:max-w-[240px] md:max-w-none rounded-xl overflow-hidden bg-white shadow-inner">
              {product.image_url ? (
                <img
                  src={resolveImageUrl(product.image_url)}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    const fallback = e.target.parentElement?.querySelector('.image-fallback')
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
              )}
              <div className="image-fallback absolute inset-0 hidden items-center justify-center bg-gray-100 text-gray-400 text-sm">No Image</div>
              {compareAt && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-500 text-white text-xs font-bold shadow">
                  -{discountPct}%
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0 p-4 md:p-6 overflow-y-auto">
            {product.vendor && (
              <p className="text-xs text-gray-500 mb-1">Sold by {product.vendor.business_name}</p>
            )}
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2 line-clamp-2 pr-8">{product.name}</h2>

            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <span className="text-xl md:text-2xl font-bold text-primary-600">${price.toFixed(2)}</span>
              {compareAt && (
                <>
                  <span className="text-sm text-gray-500 line-through">${product.compare_at_price.toFixed(2)}</span>
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Save {discountPct}%</span>
                </>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{product.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-4">
              <span>Unit: <strong>{product.unit || 'piece'}</strong></span>
              <span className={product.stock_quantity > 10 ? 'text-green-600' : product.stock_quantity > 0 ? 'text-amber-600' : 'text-red-600'}>
                {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
              </span>
            </div>

            {product.stock_quantity > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-medium text-gray-700">Qty</span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 min-w-[2.5rem] text-center font-medium">{quantity}</span>
                  <button
                    onClick={increaseQuantity}
                    disabled={quantity >= product.stock_quantity}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-2">
              <button
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                <ShoppingCart className="h-5 w-5" />
                {product.stock_quantity > 0 ? 'Add to cart' : 'Out of stock'}
              </button>
              <Link
                to={`/products/${product.id}`}
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/50 transition-colors"
              >
                View details
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickViewModal
