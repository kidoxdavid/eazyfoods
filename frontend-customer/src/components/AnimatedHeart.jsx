import { useState } from 'react'
import { Heart } from 'lucide-react'

const AnimatedHeart = ({ 
  isFavorited = false, 
  onClick, 
  className = '',
  size = 20
}) => {
  const [isAnimating, setIsAnimating] = useState(false)

  // With its own onClick it acts as a button. Without one it is purely visual, and the click
  // bubbles to the wrapping button/link (which owns the toggle); nesting <button> in <button> is invalid HTML.
  const handleClick = (e) => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 600)
    if (onClick) {
      e.preventDefault()
      e.stopPropagation()
      onClick(e)
    }
  }

  return (
    <span
      onClick={handleClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleClick(e) } }}
      className={`relative inline-flex ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`transition-all duration-300 ${
          isFavorited 
            ? 'fill-red-500 text-red-500' 
            : 'fill-none text-gray-400 hover:text-red-400'
        } ${
          isAnimating ? 'scale-125 animate-pulse' : 'scale-100'
        }`}
        size={size}
        style={{
          filter: isAnimating ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' : 'none'
        }}
      />
      
      {/* Particle effect on favorite */}
      {isAnimating && isFavorited && (
        <>
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="absolute inset-0 pointer-events-none"
              style={{
                animation: `heartParticle 0.6s ease-out forwards`,
                animationDelay: `${i * 0.1}s`,
                transform: `rotate(${i * 60}deg)`,
                transformOrigin: 'center'
              }}
            >
              <span className="absolute top-0 left-1/2 w-1 h-1 bg-red-500 rounded-full" />
            </span>
          ))}
        </>
      )}
    </span>
  )
}

export default AnimatedHeart

