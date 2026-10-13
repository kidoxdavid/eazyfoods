import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

const OrderConfirmation = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const orderNumber = state?.orderNumber || 'your order'
  const orderId = state?.orderId

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
        <CheckCircle className="h-10 w-10 text-primary-600" />
      </div>
      <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">Order placed</h1>
      <p className="text-ink-600 mb-8">
        Your order <strong>#{orderNumber}</strong> is in. We&apos;ll keep you posted as it&apos;s prepared and delivered.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderId && (
          <button type="button" onClick={() => navigate(`/orders/${orderId}`)} className="btn-primary">
            Track order
          </button>
        )}
        <button type="button" onClick={() => navigate('/')} className="btn-secondary">
          Keep shopping
        </button>
      </div>
    </div>
  )
}

export default OrderConfirmation
