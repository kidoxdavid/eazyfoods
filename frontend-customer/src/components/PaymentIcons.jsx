import { CreditCard, Smartphone } from 'lucide-react'

const PaymentIcons = () => {
  const paymentMethods = [
    { name: 'Visa', icon: '💳' },
    { name: 'Mastercard', icon: '💳' },
    { name: 'Amex', icon: '💳' },
    { name: 'PayPal', icon: '💳' },
    { name: 'Apple Pay', icon: '📱' },
    { name: 'Google Pay', icon: '📱' }
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-600 font-medium">We accept:</span>
      <div className="flex items-center gap-1.5">
        {paymentMethods.map((method, index) => (
          <div
            key={index}
            className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded text-xs"
            title={method.name}
          >
            {method.icon}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PaymentIcons

