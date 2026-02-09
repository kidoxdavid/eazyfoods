import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'

const AnimatedCartIcon = ({ className = '' }) => {
  const { getCartItemCount } = useCart()
  const [isBouncing, setIsBouncing] = useState(false)
  const [prevCount, setPrevCount] = useState(getCartItemCount())

  useEffect(() => {
    const currentCount = getCartItemCount()
    
    // Trigger bounce animation when count increases
    if (currentCount > prevCount) {
      setIsBouncing(true)
      setTimeout(() => setIsBouncing(false), 600)
    }
    
    setPrevCount(currentCount)
  }, [getCartItemCount(), prevCount])

  return (
    <div className={`relative ${className}`}>
      <ShoppingCart 
        className={`h-6 w-6 transition-transform duration-300 ${
          isBouncing ? 'animate-bounce' : ''
        }`}
      />
      {getCartItemCount() > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-white text-primary-600 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
          {getCartItemCount() > 99 ? '99+' : getCartItemCount()}
        </span>
      )}
    </div>
  )
}

export default AnimatedCartIcon

