import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

const SuccessCheckmark = ({ show = false, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setTimeout(() => setIsAnimating(true), 50)
      
      // Auto-hide after animation
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
        if (onComplete) {
          onComplete()
        }
      }, 2000)
      
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
      setIsAnimating(false)
    }
  }, [show, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-full p-6 shadow-2xl transform transition-all duration-300">
        <div className={`relative ${isAnimating ? 'scale-100' : 'scale-0'} transition-transform duration-300`}>
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
          <div className="relative bg-green-500 rounded-full p-4">
            <Check 
              className="text-white" 
              size={32}
              strokeWidth={4}
              style={{
                strokeDasharray: isAnimating ? '100' : '0',
                strokeDashoffset: isAnimating ? '0' : '100',
                transition: 'stroke-dashoffset 0.5s ease-out'
              }}
            />
          </div>
        </div>
        <p className="text-center mt-4 text-gray-700 font-semibold animate-fadeIn">
          Added to Cart!
        </p>
      </div>
    </div>
  )
}

export default SuccessCheckmark

