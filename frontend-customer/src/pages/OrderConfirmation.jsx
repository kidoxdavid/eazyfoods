import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

const OrderConfirmation = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const orderNumber = state?.orderNumber || 'your order'
  const orderId = state?.orderId

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Order placed successfully</h1>
      <p className="text-gray-600 mb-6">
        Your order <strong>#{orderNumber}</strong> has been received.
      </p>
      <p className="text-sm text-gray-500 mb-8">
        Create an account or log in to track your order and manage future orders.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          Continue shopping
        </button>
        {orderId && (
          <button
            type="button"
            onClick={() => navigate('/signup', { state: { afterOrder: true } })}
            className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50"
          >
            Create account
          </button>
        )}
      </div>
    </div>
  )
}

export default OrderConfirmation
