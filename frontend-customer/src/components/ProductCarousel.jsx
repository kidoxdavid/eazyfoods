import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShoppingCart, Eye } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import QuickViewModal from './QuickViewModal'
import { resolveImageUrl } from '../utils/imageUtils'

const ProductCarousel = ({ title, products, showBadge = null }) => {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const scrollRef = useRef(null)
  const { addToCart } = useCart()

  const scroll = (direction) => {
    const container = scrollRef.current
    const scrollAmount = 300
    const newPosition = direction === 'left' 
      ? scrollPosition - scrollAmount 
      : scrollPosition + scrollAmount
    
    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    })
    setScrollPosition(newPosition)
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      setScrollPosition(scrollRef.current.scrollLeft)
    }
  }

  if (!products || products.length === 0) return null

  const canScrollLeft = scrollPosition > 0
  const canScrollRight = scrollRef.current && 
    scrollPosition < (scrollRef.current.scrollWidth - scrollRef.current.clientWidth)

  return (
    <section className="py-8 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full transition-colors ${
                canScrollLeft 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-full transition-colors ${
                canScrollRight 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-40 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-2"
            >
              <Link to={`/products/${product.id}`}>
                {product.image_url && (
                  <div className="relative mb-2">
                <img
                  src={resolveImageUrl(product.image_url)}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-lg"
                  loading="lazy"
                  onError={(e) => {
                    console.error('[ProductCarousel] Image failed to load:', {
                      originalUrl: product.image_url,
                      resolvedUrl: resolveImageUrl(product.image_url)
                    })
                  }}
                />
                    {showBadge && showBadge(product) && (
                      <span className="absolute top-2 right-2 bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded">
                        {showBadge(product)}
                      </span>
                    )}
                    {/* Promotion Badge - Only show if promotion exists */}
                    {product.promotions && product.promotions.length > 0 && (
                      <span className="absolute top-1 left-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded z-10">
                        {product.promotions[0].discount_type === 'percentage' 
                          ? `${Math.round(product.promotions[0].discount_value)}% off`
                          : `$${product.promotions[0].discount_value} OFF`}
                      </span>
                    )}
                    {/* No discount badge if no active promotion */}
                  </div>
                )}
                <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[2rem]">
                  {product.name}
                </h3>
                {product.vendor?.business_name && (
                  <p className="text-xs text-gray-500 mb-1 truncate">{product.vendor.business_name}</p>
                )}
                <div className="mb-1">
                  <p className="text-sm font-bold text-primary-600">
                    ${product.price.toFixed(2)}
                  </p>
                  {/* Only show compare_at_price if there's an active promotion */}
                  {product.promotions && product.promotions.length > 0 && product.compare_at_price && (
                    <p className="text-xs text-gray-500 line-through">
                      ${product.compare_at_price.toFixed(2)}
                    </p>
                  )}
                </div>
                {/* Promotion Type Label - Only show if promotion exists */}
                {product.promotions && product.promotions.length > 0 && (
                  <p className="text-xs text-primary-600 font-medium mb-1">
                    {product.promotions[0].name}
                  </p>
                )}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setQuickViewProduct(product)
                    }}
                    className="flex-1 p-1.5 border border-gray-300 rounded hover:bg-nude-100 transition-colors"
                    type="button"
                    title="Quick View"
                  >
                    <Eye className="h-4 w-4 text-gray-600 mx-auto" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      addToCart(product, 1)
                    }}
                    disabled={product.stock_quantity === 0}
                    className="flex-1 p-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="button"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="h-4 w-4 mx-auto" />
                  </button>
                </div>
                {product.stock_quantity === 0 && (
                  <p className="text-xs text-red-600 mt-1 text-center">Out of Stock</p>
                )}
                {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                  <p className="text-xs text-orange-600 mt-1 text-center">Only {product.stock_quantity} left!</p>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </section>
  )
}

export default ProductCarousel

