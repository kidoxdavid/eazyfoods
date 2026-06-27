import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Package, RotateCcw, ExternalLink, Loader2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

const IMG_BASE = 'https://eazyfoods-api.onrender.com'
const resolveImg = u => u ? (u.startsWith('http') ? u : IMG_BASE + (u.startsWith('/') ? '' : '/') + u) : null

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
const STATUS_LABELS = {
  pending: 'Order Placed', confirmed: 'Confirmed', preparing: 'Preparing',
  ready: 'Ready', out_for_delivery: 'On the Way', delivered: 'Delivered',
  picked_up: 'Picked Up', cancelled: 'Cancelled',
}

export default function OrderDetailScreen() {
  const { orderId } = useParams()
  const { token } = useAuth()
  const { addToCart } = useCart()
  const { success } = useToast()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/customer/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setOrder(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId, token])

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
    </div>
  )

  if (!order) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <Package className="h-12 w-12 text-gray-300" />
      <p className="text-gray-500">Order not found</p>
      <button onClick={() => navigate(-1)} className="text-primary-600 font-semibold">Go back</button>
    </div>
  )

  const mapsUrl = (() => {
    const dest = order.delivery_coords
      ? `${order.delivery_coords.lat},${order.delivery_coords.lng}`
      : order.delivery_address ? encodeURIComponent(order.delivery_address) : null
    const origin = order.store_coords
      ? `${order.store_coords.lat},${order.store_coords.lng}`
      : order.store_address ? encodeURIComponent(order.store_address) : null
    if (!dest) return null
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${dest}&travelmode=driving`
  })()

  const currentStep = STATUS_STEPS.indexOf(order.status)
  const subtotal = parseFloat(order.subtotal || order.total_amount || 0)
  const tax      = parseFloat(order.tax_amount || 0)
  const delivery = parseFloat(order.shipping_amount || order.delivery_fee || 0)
  const total    = parseFloat(order.total_amount || 0)

  const handleReorder = async () => {
    if (!order.items?.length) return
    for (const item of order.items) {
      await addToCart({ id: item.product_id, name: item.name, price: item.unit_price, image_url: item.image_url }, item.quantity)
    }
    success('Items added to cart!')
    navigate('/cart')
  }

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title={`Order #${String(order.id).slice(-6).toUpperCase()}`} back />

      <div className="flex-1 scroll-content mb-tab px-4 py-4 space-y-4">
        {/* Status timeline */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Status</p>
            <div className="space-y-3">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStep
                const active = i === currentStep
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      active ? 'bg-primary-600 ring-2 ring-primary-200' : done ? 'bg-primary-400' : 'bg-gray-200'
                    }`} />
                    <span className={`text-sm ${active ? 'font-bold text-primary-600' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                      {STATUS_LABELS[step]}
                    </span>
                    {active && <span className="text-xs text-primary-400 ml-auto">← Now</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Track button */}
        {order.status === 'out_for_delivery' && mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary-600 text-white font-bold rounded-2xl press-scale">
            <MapPin className="h-5 w-5" />
            Track on Google Maps
            <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</p>
          <div className="space-y-3">
            {(order.items || []).map((item, i) => {
              const img = resolveImg(item.image_url)
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {img ? <img src={img} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🛒</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">×{item.quantity} · ${parseFloat(item.unit_price || 0).toFixed(2)} each</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 flex-shrink-0">${(item.quantity * parseFloat(item.unit_price || 0)).toFixed(2)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Price Breakdown</p>
          {[
            { label: 'Subtotal', val: subtotal },
            { label: 'Delivery', val: delivery },
            { label: 'Tax', val: tax },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-900">${val.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-primary-700 text-base">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Delivery address */}
        {order.delivery_address && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Delivered To</p>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                {typeof order.delivery_address === 'string'
                  ? order.delivery_address
                  : [order.delivery_address.street_address, order.delivery_address.city, order.delivery_address.state].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Reorder */}
        {['delivered','picked_up','cancelled'].includes(order.status) && order.items?.length > 0 && (
          <button onClick={handleReorder}
            className="w-full py-3.5 border-2 border-primary-600 text-primary-600 font-bold rounded-2xl press-scale flex items-center justify-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Reorder
          </button>
        )}
      </div>
    </div>
  )
}
