import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import AnimatedButton from './AnimatedButton'

const StickyAddToCartMealPlan = ({ mealPlan, householdSize, setHouseholdSize, onAddToCart, disabled }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || window.pageYOffset
      setIsVisible(scrollPosition > 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible || !mealPlan) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 lg:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{mealPlan.name}</p>
            <p className="text-xs text-gray-500">Household: {householdSize} person{householdSize !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-shrink-0">
            <label className="sr-only">Household size</label>
            <select
              value={householdSize}
              onChange={(e) => setHouseholdSize(parseInt(e.target.value, 10))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6+</option>
            </select>
          </div>

          <AnimatedButton
            onClick={onAddToCart}
            disabled={disabled}
            variant="primary"
            className="flex-shrink-0"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline">Add Plan to Cart</span>
          </AnimatedButton>
        </div>
      </div>
    </div>
  )
}

export default StickyAddToCartMealPlan
