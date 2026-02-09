import { useState, useEffect } from 'react'
import { Eye, ShoppingBag, Users, TrendingUp } from 'lucide-react'

const SocialProof = ({ productId, product }) => {
  const [viewingCount, setViewingCount] = useState(null)
  const [soldToday, setSoldToday] = useState(null)

  useEffect(() => {
    // Simulate viewing count (in real app, this would come from backend)
    if (productId) {
      // Generate random viewing count between 5-50
      const randomViewing = Math.floor(Math.random() * 45) + 5
      setViewingCount(randomViewing)

      // Calculate sold today from product data or API
      if (product?.total_sales) {
        // Estimate sold today as 10-30% of total sales
        const estimatedToday = Math.floor(product.total_sales * (0.1 + Math.random() * 0.2))
        setSoldToday(estimatedToday)
      }
    }
  }, [productId, product])

  if (!viewingCount && !soldToday) return null

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {viewingCount && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
          <Eye className="h-4 w-4 animate-pulse" />
          <span className="font-medium">{viewingCount} people viewing</span>
        </div>
      )}
      {soldToday && soldToday > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
          <ShoppingBag className="h-4 w-4" />
          <span className="font-medium">{soldToday} sold today</span>
        </div>
      )}
      {product?.total_sales > 100 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
          <TrendingUp className="h-4 w-4" />
          <span className="font-medium">Popular item</span>
        </div>
      )}
    </div>
  )
}

export default SocialProof

