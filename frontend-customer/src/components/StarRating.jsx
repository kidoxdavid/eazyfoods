import { Star } from 'lucide-react'

const StarRating = ({ rating = 0, totalReviews = 0, size = 'sm' }) => {
  // Ensure rating is between 0 and 5, round to 1 decimal place
  const normalizedRating = Math.min(Math.max(parseFloat(rating) || 0, 0), 5)
  
  // Size classes - small but readable for product cards
  const sizePixels = {
    sm: 12,   // 12px - for product cards and carousels
    md: 12,   // 12px
    lg: 14    // 14px
  }
  
  const starSizePx = sizePixels[size] || sizePixels.sm
  const starSize = `${starSizePx}px`
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((starNumber) => {
        // Calculate how much of this star should be filled
        // Example: rating = 3.5
        // Star 1: 3.5 - 0 = 3.5, fillAmount = 1 (fully filled)
        // Star 2: 3.5 - 1 = 2.5, fillAmount = 1 (fully filled)
        // Star 3: 3.5 - 2 = 1.5, fillAmount = 1 (fully filled)
        // Star 4: 3.5 - 3 = 0.5, fillAmount = 0.5 (half filled)
        // Star 5: 3.5 - 4 = -0.5, fillAmount = 0 (not filled)
        
        const starThreshold = starNumber - 1
        const fillAmount = Math.max(0, Math.min(1, normalizedRating - starThreshold))
        const isFilled = fillAmount >= 1
        const isPartiallyFilled = fillAmount > 0 && fillAmount < 1
        
        return (
          <div 
            key={starNumber} 
            className="relative flex-shrink-0" 
            style={{ 
              width: starSize, 
              height: starSize,
              minWidth: starSize,
              minHeight: starSize
            }}
          >
            {/* Empty star (background) - ALWAYS visible */}
            <Star
              fill="currentColor"
              style={{ 
                color: '#d1d5db', // Light gray for empty stars
                width: starSize,
                height: starSize,
                display: 'block'
              }}
            />
            {/* Filled portion of star - overlay on top */}
            {(isFilled || isPartiallyFilled) && (
              <div
                className="overflow-hidden absolute top-0 left-0"
                style={{
                  width: isFilled ? '100%' : `${(fillAmount * 100).toFixed(0)}%`,
                  height: '100%',
                  zIndex: 1
                }}
              >
                <Star
                  fill="currentColor"
                  style={{ 
                    color: '#fbbf24', // Yellow/amber for filled stars
                    width: starSize,
                    height: starSize,
                    display: 'block'
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
      {totalReviews > 0 && (
        <span className="text-[10px] text-gray-600 ml-0.5 whitespace-nowrap">
          ({totalReviews})
        </span>
      )}
    </div>
  )
}

export default StarRating

