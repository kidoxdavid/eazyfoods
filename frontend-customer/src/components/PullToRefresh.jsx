import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'

const PullToRefresh = ({ onRefresh, children, threshold = 80 }) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e) => {
      if (startY.current !== null && window.scrollY === 0) {
        const currentY = e.touches[0].clientY
        const distance = currentY - startY.current
        if (distance > 0) {
          setPullDistance(Math.min(distance, threshold * 1.5))
        }
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        setPullDistance(0)
        if (onRefresh) {
          await onRefresh()
        }
        setIsRefreshing(false)
      } else {
        setPullDistance(0)
      }
      startY.current = null
      setIsPulling(false)
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  const progress = Math.min((pullDistance / threshold) * 100, 100)

  return (
    <div ref={containerRef} className="relative">
      {isPulling && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-10">
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 flex items-center justify-center"
              style={{
                transform: `rotate(${progress * 3.6}deg)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              <RefreshCw className="h-6 w-6 text-primary-600" />
            </div>
            {pullDistance >= threshold && (
              <p className="text-sm text-primary-600 font-medium">Release to refresh</p>
            )}
          </div>
        </div>
      )}
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-10 bg-white">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary-600 animate-spin" />
            <p className="text-sm text-primary-600 font-medium">Refreshing...</p>
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${isPulling ? pullDistance : 0}px)` }}>
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh

