import { Link } from 'react-router-dom'
import { Clock, X } from 'lucide-react'
import { useRecentlyViewed } from '../contexts/RecentlyViewedContext'
import { resolveImageUrl } from '../utils/imageUtils'

const RecentlyViewed = ({ maxItems = 5, showTitle = true, onClear }) => {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed()

  if (recentlyViewed.length === 0) return null

  const itemsToShow = recentlyViewed.slice(0, maxItems)

  const handleClear = () => {
    clearRecentlyViewed()
    if (onClear) onClear()
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Recently Viewed</h2>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            type="button"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {itemsToShow.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="group block"
          >
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
              {product.image_url ? (
                <>
                  <img
                    src={resolveImageUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const fallback = e.target.parentElement?.querySelector('.img-fallback')
                      if (fallback) fallback.classList.remove('hidden')
                    }}
                  />
                  <div className="img-fallback hidden absolute inset-0 flex items-center justify-center text-gray-400 text-xs bg-gray-100">No Image</div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {product.name}
            </h3>
            <p className="text-sm font-bold text-primary-600 mt-1">
              ${product.price?.toFixed(2) || '0.00'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default RecentlyViewed

