import { useState, useEffect } from 'react'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import AnimatedButton from './AnimatedButton'

const StickyAddToCartMeal = ({ recipe, householdSize, setHouseholdSize, onAddToCart, disabled }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || window.pageYOffset
      setIsVisible(scrollPosition > 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible || !recipe) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 lg:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{recipe.name}</p>
            <p className="text-xs text-gray-500">Servings: {householdSize} person{householdSize !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
              className="p-2 hover:bg-gray-50"
              disabled={householdSize <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium min-w-[3rem] text-center">{householdSize}</span>
            <button
              onClick={() => setHouseholdSize(Math.min(10, householdSize + 1))}
              className="p-2 hover:bg-gray-50"
              disabled={householdSize >= 10}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

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

export default StickyAddToCartMeal
