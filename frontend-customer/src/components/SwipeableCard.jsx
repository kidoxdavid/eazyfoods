import { useState, useRef, useEffect } from 'react'

const SwipeableCard = ({ children, onSwipeLeft, onSwipeRight, threshold = 100 }) => {
  const [startX, setStartX] = useState(null)
  const [currentX, setCurrentX] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const cardRef = useRef(null)

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (startX !== null) {
      setCurrentX(e.touches[0].clientX)
    }
  }

  const handleTouchEnd = () => {
    if (startX !== null && currentX !== null) {
      const diff = currentX - startX
      if (Math.abs(diff) > threshold) {
        if (diff > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (diff < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    }
    setStartX(null)
    setCurrentX(null)
    setIsDragging(false)
  }

  const offset = startX !== null && currentX !== null ? currentX - startX : 0

  return (
    <div
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="transition-transform duration-200"
      style={{
        transform: isDragging ? `translateX(${offset}px)` : 'translateX(0)',
        opacity: isDragging ? 0.8 : 1
      }}
    >
      {children}
    </div>
  )
}

export default SwipeableCard

