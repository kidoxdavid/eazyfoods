import { useState, useEffect } from 'react'
import { Percent, Sparkles } from 'lucide-react'

const AnimatedDiscount = ({ discount, size = 'md', showIcon = true }) => {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 1000)
    return () => clearTimeout(timer)
  }, [discount])

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  return (
    <div className={`flex items-center gap-2 ${isAnimating ? 'animate-bounce' : ''}`}>
      {showIcon && <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />}
      <div className="relative">
        <span className={`${sizeClasses[size]} font-black text-red-600 drop-shadow-lg`}>
          {discount}% OFF
        </span>
        <div className="absolute inset-0 animate-ping opacity-20">
          <span className={`${sizeClasses[size]} font-black text-red-600`}>
            {discount}% OFF
          </span>
        </div>
      </div>
      <Percent className="h-6 w-6 text-red-600" />
    </div>
  )
}

export default AnimatedDiscount

