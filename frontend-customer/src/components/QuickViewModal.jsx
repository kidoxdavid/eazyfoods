import { useState, useEffect } from 'react'
import { X, ShoppingCart, Plus, Minus, ExternalLink } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Desktop: bold split layout — image panel left, content right; Mobile: smaller modal, image ~50% of space */}
      <div
        className="relative w-full max-h-[80vh] md:max-h-[85vh] overflow-hidden flex flex-col md:flex-row rounded-2xl md:rounded-3xl shadow-2xl max-w-[min(90vw,18rem)] sm:max-w-[20rem] md:max-w-4xl lg:max-w-5xl bg-white border-0 md:border-4 md:border-primary-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent strip — top on mobile, left on desktop */}
        <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 bg-primary-500 z-10 rounded-l-3xl" />

        {/* Left: full-height image panel (desktop only) */}
        <div className="hidden md:flex md:w-2/5 flex-shrink-0 relative min-h-[220px] md:min-h-0">
          <div className="absolute inset-0">
            {product.image_url ? (
              <img
                src={resolveImageUrl(product.image_url)}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                  const fallback = e.target.parentElement?.querySelector('.qv-fallback')
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">No Image</div>
            )}
            <div className="qv-fallback absolute inset-0 hidden bg-gray-300 items-center justify-center text-gray-500">No Image</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2 className="text-xl font-bold text-white drop-shadow-lg line-clamp-2">{product.name}</h2>
            {product.vendor && (
              <p className="text-white/80 text-sm mt-1">Sold by {product.vendor.business_name}</p>
            )}
          </div>
          {compareAt && (
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary-500 text-white text-sm font-bold shadow-lg">
              −{discountPct}%
            </span>
          )}
        </div>

        {/* Mobile: image takes ~50% of modal, rest is content */}
        <div className="md:hidden flex flex-col flex-1 min-h-0 max-h-[80vh]">
          <div className="flex-[1] min-h-0 flex-shrink-0 bg-gray-100 px-3 pt-3 pb-2 flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-[12rem] rounded-2xl overflow-hidden bg-white shadow-inner">
              {product.image_url ? (
                <img
                  src={resolveImageUrl(product.image_url)}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    const fallback = e.target.parentElement?.querySelector('.qv-fallback')
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
              )}
              <div className="qv-fallback absolute inset-0 hidden bg-gray-200 items-center justify-center text-gray-500 text-xs">No Image</div>
              {compareAt && (
                <span className="absolute top-1 left-1 px-2 py-0.5 rounded-lg bg-red-500 text-white text-xs font-bold">−{discountPct}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex items-start justify-between px-3 pt-2 pb-0 md:p-6 md:pt-6 md:pb-0">
            <div className="md:hidden flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 line-clamp-2 pr-10">{product.name}</h2>
              {product.vendor && <p className="text-xs text-gray-500 mt-0.5">Sold by {product.vendor.business_name}</p>}
            </div>
            <button
              onClick={onClose}
              className="absolute top-2 right-2 md:top-4 md:right-4 p-1.5 md:p-2 rounded-full bg-black/10 hover:bg-black/20 text-gray-700 transition-colors z-10"
              type="button"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-3 pb-3 md:px-6 md:pb-6 flex-1 flex flex-col">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-primary-600 mb-2">Quick look</p>
            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <span className="text-2xl md:text-3xl font-extrabold text-gray-900">${price.toFixed(2)}</span>
              {compareAt && (
                <>
                  <span className="text-sm text-gray-500 line-through">${product.compare_at_price.toFixed(2)}</span>
                  <span className="text-xs font-bold text-white bg-primary-500 px-2 py-0.5 rounded">Save {discountPct}%</span>
                </>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{product.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
              <span>Unit: <strong className="text-gray-700">{product.unit || 'piece'}</strong></span>
              <span className={product.stock_quantity > 10 ? 'text-green-600 font-medium' : product.stock_quantity > 0 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
                {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
              </span>
            </div>

            {product.stock_quantity > 0 && (
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm font-semibold text-gray-700">Qty</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="p-2.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="button"
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-5 py-2.5 min-w-[3rem] text-center font-bold text-gray-900">{quantity}</span>
                  <button
                    onClick={increaseQuantity}
                    disabled={quantity >= product.stock_quantity}
                    className="p-2.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="button"
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-2">
              <button
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary-500 text-white font-bold text-base hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-500/25"
                type="button"
              >
                <ShoppingCart className="h-5 w-5" />
                {product.stock_quantity > 0 ? 'Add to cart' : 'Out of stock'}
              </button>
              <Link
                to={`/products/${product.id}`}
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-gray-300 text-gray-800 font-bold hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                View full details
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
