import { Truck, Gift, Package, Sparkles } from 'lucide-react'

const PromotionalBadges = ({ 
  freeShipping = false, 
  buy2Get1 = false, 
  bundleDeal = false,
  bundleDetails = null 
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {freeShipping && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full border border-green-300 shadow-sm">
          <Truck className="h-4 w-4" />
          <span className="text-xs font-bold">FREE SHIPPING</span>
        </div>
      )}
      {buy2Get1 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full border border-purple-300 shadow-sm">
          <Gift className="h-4 w-4" />
          <span className="text-xs font-bold">BUY 2 GET 1 FREE</span>
        </div>
      )}
      {bundleDeal && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full border border-orange-300 shadow-sm">
          <Package className="h-4 w-4" />
          <span className="text-xs font-bold">
            {bundleDetails || 'BUNDLE DEAL'}
          </span>
        </div>
      )}
    </div>
  )
}

export default PromotionalBadges

