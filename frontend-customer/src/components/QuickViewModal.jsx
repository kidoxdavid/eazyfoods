import { useState, useEffect } from 'react'
import { X, ShoppingCart, Plus, Minus, Star } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { Link } from 'react-router-dom'
import { resolveImageUrl } from '../utils/imageUtils'

const QuickViewModal = ({ product, isOpen, onClose }) => {
  const [quantity, setQuantity] = useState(1)
  // Access contexts without destructuring to prevent errors
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
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [isOpen])

  if (!isOpen || !product) return null

  const handleAddToCart = () => {
    addToCart(product, quantity)
    onClose()
  }

  const increaseQuantity = () => {
    if (quantity < product.stock_quantity) {
      setQuantity(quantity + 1)
    }
  }

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-2 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - Mobile optimized */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 z-20 bg-white rounded-full p-2 shadow-lg sm:shadow-sm"
          type="button"
          aria-label="Close"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Product Image */}
          <div className="w-full md:w-1/2 p-3 sm:p-4 md:p-6">
            <div className="relative">
              {product.image_url ? (
                <img
                  src={resolveImageUrl(product.image_url)}
                  alt={product.name}
                  className="w-full h-56 sm:h-64 md:h-96 object-cover rounded-lg"
                  onError={(e) => {
                    console.error('[QuickViewModal] Image failed to load:', product.image_url)
                    e.target.style.display = 'none'
                    const fallback = e.target.parentElement.querySelector('.image-fallback')
                    if (fallback) {
                      fallback.style.display = 'flex'
                    }
                  }}
                />
              ) : (
                <div className="w-full h-56 sm:h-64 md:h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-xs sm:text-sm md:text-base">No Image</span>
                </div>
              )}
              <div className="image-fallback absolute inset-0 w-full h-full bg-gray-200 rounded-lg flex items-center justify-center hidden">
                <span className="text-gray-400 text-xs sm:text-sm md:text-base">No Image</span>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="w-full md:w-1/2 p-3 sm:p-4 md:p-6 relative">
            <div className="pr-8 sm:pr-12">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 pr-6">{product.name}</h2>
              
              {product.vendor && (
                <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4">Sold by {product.vendor.business_name}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-600">
                  ${product.price.toFixed(2)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <>
                    <span className="text-base sm:text-lg md:text-xl text-gray-500 line-through">
                      ${product.compare_at_price.toFixed(2)}
                    </span>
                    <span className="bg-red-100 text-red-800 text-[10px] sm:text-xs md:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                      {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {product.description && (
                <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-3 sm:mb-4 md:mb-6 line-clamp-3 sm:line-clamp-4 md:line-clamp-none">{product.description}</p>
              )}

              <div className="space-y-1.5 sm:space-y-2 md:space-y-4 mb-3 sm:mb-4 md:mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700">Unit:</span>
                  <span className="text-[10px] sm:text-xs md:text-sm text-gray-600">{product.unit || 'piece'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700">Stock:</span>
                  <span className={`text-[10px] sm:text-xs md:text-sm font-semibold ${
                    product.stock_quantity > 10 ? 'text-green-600' : 
                    product.stock_quantity > 0 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {product.stock_quantity > 0 ? `${product.stock_quantity} available` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Quantity Selector */}
              {product.stock_quantity > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
                  <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700">Quantity:</span>
                  <div className="flex items-center space-x-2 border border-gray-300 rounded-lg w-fit">
                    <button
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                      type="button"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <span className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 font-medium text-xs sm:text-sm md:text-base min-w-[2.5rem] sm:min-w-[3rem] text-center">{quantity}</span>
                    <button
                      onClick={increaseQuantity}
                      disabled={quantity >= product.stock_quantity}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                      type="button"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 pb-2 sm:pb-0">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                  className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 sm:py-3 text-sm sm:text-base touch-manipulation"
                  type="button"
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                </button>
                <Link
                  to={`/products/${product.id}`}
                  className="w-full btn-secondary flex items-center justify-center space-x-2 py-2.5 sm:py-3 text-sm sm:text-base touch-manipulation"
                  onClick={onClose}
                >
                  <span>View Details</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickViewModal

