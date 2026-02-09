import { useState, useEffect } from 'react'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import AnimatedButton from './AnimatedButton'

const StickyAddToCart = ({ product, quantity, setQuantity, onAddToCart, disabled }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky button when user scrolls past the original button
      const scrollPosition = window.scrollY || window.pageYOffset
      setIsVisible(scrollPosition > 300) // Adjust threshold as needed
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible || !product) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 lg:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
            <p className="text-lg font-bold text-primary-600">${(product.price != null ? Number(product.price) : 0).toFixed(2)}</p>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2 hover:bg-gray-50"
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(product.stock_quantity ?? 0, quantity + 1))}
              className="p-2 hover:bg-gray-50"
              disabled={quantity >= (product.stock_quantity ?? 0)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <AnimatedButton
            onClick={onAddToCart}
            disabled={disabled}
            variant="primary"
            className="flex-shrink-0"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline">Add to Cart</span>
          </AnimatedButton>
        </div>
      </div>
    </div>
  )
}

export default StickyAddToCart

