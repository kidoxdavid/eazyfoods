import { TrendingUp } from 'lucide-react'

const ProgressBar = ({ current, total, label, showPercentage = true, color = 'primary' }) => {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0

  const colorClasses = {
    primary: 'bg-primary-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    blue: 'bg-blue-600'
  }

  const bgColorClasses = {
    primary: 'bg-primary-100',
    green: 'bg-green-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
    blue: 'bg-blue-100'
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm font-semibold text-gray-900">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={`w-full h-3 rounded-full overflow-hidden ${bgColorClasses[color] || bgColorClasses.primary}`}>
        <div
          className={`h-full ${colorClasses[color] || colorClasses.primary} transition-all duration-500 ease-out rounded-full relative`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      </div>
      {current && total && (
        <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
          <span>{current} of {total} sold</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {total - current} left
          </span>
        </div>
      )}
    </div>
  )
}

export default ProgressBar

