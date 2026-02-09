import { Sparkles, TrendingUp, Award } from 'lucide-react'

const ProductBadges = ({ 
  product, 
  showNewArrival = true,
  showBestSeller = true,
  showTrending = true,
  showStockLevel = true,
  stockLevelPosition = 'bottom' // 'bottom' (in stack) or 'inline' (separate, aligned with discount)
}) => {
  if (!product) return null

  // Determine if product is new (created within last 30 days)
  const isNewArrival = product.created_at && (() => {
    try {
      const createdDate = new Date(product.created_at)
      const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceCreation <= 30
    } catch (e) {
      return false
    }
  })()

  // Determine if product is best seller (high sales or rating)
  const isBestSeller = (product.total_sales && product.total_sales > 50) || (product.average_rating && product.average_rating >= 4.5 && product.total_reviews && product.total_reviews >= 10)

  // Determine if product is trending (recent sales spike or high views)
  const isTrending = (product.total_sales && product.total_sales > 20) || (product.views_count && product.views_count > 100)

  // Stock level indicator
  const getStockLevel = () => {
    if (!product.stock_quantity) return null
    if (product.stock_quantity === 0) return { text: 'Out of Stock', color: 'red' }
    if (product.stock_quantity <= 5) return { text: `Only ${product.stock_quantity} left!`, color: 'orange' }
    if (product.stock_quantity <= 15) return { text: `Only ${product.stock_quantity} left!`, color: 'yellow' }
    return null
  }

  const stockLevel = getStockLevel()
  const hasOtherBadges = (showNewArrival && isNewArrival) || (showBestSeller && isBestSeller && !isNewArrival) || (showTrending && isTrending && !isNewArrival && !isBestSeller)

  // If stockLevelPosition is 'inline', we need to separate the stock level badge
  if (stockLevelPosition === 'inline' && stockLevel) {
    return (
      <>
        {/* Other badges in vertical stack */}
        {hasOtherBadges && (
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
            {showNewArrival && isNewArrival && (
              <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                <Sparkles className="h-2.5 w-2.5" />
                NEW
              </span>
            )}
            {showBestSeller && isBestSeller && !isNewArrival && (
              <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                <Award className="h-2.5 w-2.5" />
                BEST SELLER
              </span>
            )}
            {showTrending && isTrending && !isNewArrival && !isBestSeller && (
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" />
                TRENDING
              </span>
            )}
          </div>
        )}
        {/* Stock level badge positioned inline (same line as discount badge) */}
        <div className="absolute top-1.5 left-1.5 z-10">
          <span className={`bg-gradient-to-r ${
            stockLevel.color === 'red' ? 'from-red-500 to-red-600' :
            stockLevel.color === 'orange' ? 'from-orange-500 to-orange-600' :
            'from-yellow-500 to-yellow-600'
          } text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg`}>
            {stockLevel.text}
          </span>
        </div>
      </>
    )
  }

  // Default: all badges in vertical stack
  return (
    <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
      {/* New Arrival Badge */}
      {showNewArrival && isNewArrival && (
        <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
          <Sparkles className="h-2.5 w-2.5" />
          NEW
        </span>
      )}

      {/* Best Seller Badge */}
      {showBestSeller && isBestSeller && !isNewArrival && (
        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
          <Award className="h-2.5 w-2.5" />
          BEST SELLER
        </span>
      )}

      {/* Trending Badge */}
      {showTrending && isTrending && !isNewArrival && !isBestSeller && (
        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
          <TrendingUp className="h-2.5 w-2.5" />
          TRENDING
        </span>
      )}

      {/* Stock Level Indicator */}
      {showStockLevel && stockLevel && (
        <span className={`bg-gradient-to-r ${
          stockLevel.color === 'red' ? 'from-red-500 to-red-600' :
          stockLevel.color === 'orange' ? 'from-orange-500 to-orange-600' :
          'from-yellow-500 to-yellow-600'
        } text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg`}>
          {stockLevel.text}
        </span>
      )}
    </div>
  )
}

export default ProductBadges

