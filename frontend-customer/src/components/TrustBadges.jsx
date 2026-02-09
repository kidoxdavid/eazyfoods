import { Shield, Lock, Truck, RotateCcw, CheckCircle, Award } from 'lucide-react'

const TrustBadges = ({ showSecurePayment = true, showFreeReturns = true, showVerified = false, vendor = null, chef = null }) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {showSecurePayment && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-medium">Secure Payment</span>
        </div>
      )}
      {showFreeReturns && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
          <RotateCcw className="h-4 w-4" />
          <span className="text-xs font-medium">Free Returns</span>
        </div>
      )}
      {showVerified && (vendor || chef) && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Verified {vendor ? 'Vendor' : 'Chef'}</span>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg border border-gray-200">
        <Shield className="h-4 w-4" />
        <span className="text-xs font-medium">SSL Secured</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg border border-gray-200">
        <Truck className="h-4 w-4" />
        <span className="text-xs font-medium">Fast Delivery</span>
      </div>
    </div>
  )
}

export default TrustBadges

