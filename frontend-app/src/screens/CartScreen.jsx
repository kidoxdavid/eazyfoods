import { useNavigate } from 'react-router-dom'
import { Trash2, Minus, Plus, ShoppingCart, ChevronRight } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import AppHeader from '../components/AppHeader'

const IMG_BASE = 'https://eazyfoods-api.onrender.com'
const resolveImg = u => u ? (u.startsWith('http') ? u : IMG_BASE + (u.startsWith('/') ? '' : '/') + u) : null

export default function CartScreen() {
  const { items, cartTotal, updateQty, removeFromCart, clearCart } = useCart()
  const navigate = useNavigate()

  const subtotal  = cartTotal
  const delivery  = subtotal > 0 ? 5.99 : 0
  const tax       = subtotal * 0.05
  const total     = subtotal + delivery + tax

  if (items.length === 0) return (
    <div className="h-full flex flex-col pt-safe">
      <AppHeader title="My Cart" />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
          <ShoppingCart className="h-10 w-10 text-gray-300" />
        </div>
        <div>
          <p className="font-bold text-gray-700 text-lg">Your cart is empty</p>
          <p className="text-sm text-gray-400 mt-1">Add some delicious items to get started</p>
        </div>
        <button onClick={() => navigate('/shop')} className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl press-scale">
          Browse Products
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col pt-safe">
      <AppHeader
        title={`Cart (${items.length})`}
        right={
          <button onClick={() => { if (confirm('Clear cart?')) clearCart() }} className="text-xs text-red-500 font-semibold px-2 py-1">
            Clear
          </button>
        }
      />

      <div className="flex-1 scroll-content">
        {/* Items */}
        <div className="px-4 pt-3 space-y-3">
          {items.map(item => {
            const img = resolveImg(item.image_url)
            return (
              <div key={item.id} className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {img
                    ? <img src={img} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-primary-700 font-bold text-sm mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">${item.price.toFixed(2)} each</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-400 press-scale">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center press-scale">
                      <Minus className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center press-scale">
                      <Plus className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Order Summary</h3>
          {[
            { label: 'Subtotal', value: subtotal },
            { label: 'Delivery fee', value: delivery },
            { label: 'Tax (5%)', value: tax },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-900">${value.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-primary-700 text-lg">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="h-6" />
      </div>

      {/* Checkout CTA */}
      <div className="bg-white border-t border-gray-100 px-4 pt-3 flex-shrink-0"
           style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 64px + 12px), 88px)' }}>
        <button
          onClick={() => navigate('/checkout')}
          className="w-full h-14 bg-primary-600 text-white font-bold text-base rounded-2xl press-scale flex items-center justify-between px-5 shadow-lg"
        >
          <span>Checkout</span>
          <div className="flex items-center gap-2">
            <span>${total.toFixed(2)}</span>
            <ChevronRight className="h-5 w-5" />
          </div>
        </button>
      </div>
    </div>
  )
}
