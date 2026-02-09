import { useState, useEffect } from 'react'
import { Clock, Zap } from 'lucide-react'

const CountdownTimer = ({ endDate, onComplete, showIcon = true }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(endDate).getTime()
      const difference = end - now

      if (difference <= 0) {
        setExpired(true)
        if (onComplete) onComplete()
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      }
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [endDate, onComplete])

  if (expired) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200">
        <span className="text-sm font-semibold">Sale Ended</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg shadow-lg">
      {showIcon && <Zap className="h-4 w-4 animate-pulse" />}
      <span className="text-xs font-medium">Flash Sale Ends In:</span>
      <div className="flex items-center gap-1.5">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center bg-white/20 rounded px-2 py-1 min-w-[40px]">
            <span className="text-lg font-bold">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="text-[10px] uppercase">Days</span>
          </div>
        )}
        <div className="flex flex-col items-center bg-white/20 rounded px-2 py-1 min-w-[40px]">
          <span className="text-lg font-bold">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[10px] uppercase">Hrs</span>
        </div>
        <div className="flex flex-col items-center bg-white/20 rounded px-2 py-1 min-w-[40px]">
          <span className="text-lg font-bold">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[10px] uppercase">Min</span>
        </div>
        <div className="flex flex-col items-center bg-white/20 rounded px-2 py-1 min-w-[40px]">
          <span className="text-lg font-bold">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-[10px] uppercase">Sec</span>
        </div>
      </div>
    </div>
  )
}

export default CountdownTimer

