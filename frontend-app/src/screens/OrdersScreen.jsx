import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Clock, CheckCircle, Truck, XCircle, MapPin, RefreshCw, RotateCcw } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

const STATUS_META = {
  pending:      { icon: Clock,        color: 'text-amber-500', bg: 'bg-amber-50',   label: 'Pending' },
  confirmed:    { icon: CheckCircle,  color: 'text-blue-500',  bg: 'bg-blue-50',    label: 'Confirmed' },
  preparing:    { icon: Package,      color: 'text-purple-500',bg: 'bg-purple-50',  label: 'Preparing' },
  ready:        { icon: Package,      color: 'text-indigo-500',bg: 'bg-indigo-50',  label: 'Ready' },
  out_for_delivery: { icon: Truck,    color: 'text-primary-600',bg: 'bg-primary-50',label: 'On the way' },
  delivered:    { icon: CheckCircle,  color: 'text-green-600', bg: 'bg-green-50',   label: 'Delivered' },
  picked_up:    { icon: CheckCircle,  color: 'text-green-600', bg: 'bg-green-50',   label: 'Picked up' },
  cancelled:    { icon: XCircle,      color: 'text-red-500',   bg: 'bg-red-50',     label: 'Cancelled' },
}

const ACTIVE_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']

function ActiveOrderSteps({ status }) {
  const currentIdx = ACTIVE_STEPS.indexOf(status)
  if (currentIdx < 0 || status === 'cancelled') return null
  return (
    <div className="flex items-center gap-1 mt-3 px-1">
      {ACTIVE_STEPS.map((s, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
              active ? 'bg-primary-600 ring-2 ring-primary-200' : done ? 'bg-primary-400' : 'bg-gray-200'
            }`} />
            {i < ACTIVE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-0.5 rounded-full transition-colors ${done ? 'bg-primary-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OrdersScreen() {
  const { token } = useAuth()
  const { addToCart } = useCart()
  const { success } = useToast()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')

  const fetchOrders = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await api.get('/customer/orders', { headers: { Authorization: `Bearer ${token}` } })
      setOrders(Array.isArray(r.data) ? r.data : r.data?.orders || [])
    } catch (_) {}
    setLoading(false)
  }, [token])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const activeStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'])
  const active = orders.filter(o => activeStatuses.has(o.status))
  const past   = orders.filter(o => !activeStatuses.has(o.status))
  const shown  = tab === 'active' ? active : past

  const handleReorder = async (order) => {
    if (!order.items?.length) return
    for (const item of order.items) {
      await addToCart({ id: item.product_id, name: item.name, price: item.unit_price, image_url: item.image_url }, item.quantity)
    }
    success('Items added to cart!')
    navigate('/cart')
  }

  const buildMapsUrl = (order) => {
    const dest = order.delivery_coords
      ? `${order.delivery_coords.lat},${order.delivery_coords.lng}`
      : order.delivery_address ? encodeURIComponent(order.delivery_address) : null
    const origin = order.store_coords
      ? `${order.store_coords.lat},${order.store_coords.lng}`
      : order.store_address ? encodeURIComponent(order.store_address) : null
    if (!dest) return null
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${dest}&travelmode=driving`
  }

  return (
    <div className="h-full flex flex-col pt-safe">
      <AppHeader
        title="My Orders"
        right={
          <button onClick={fetchOrders} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center press-scale">
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
        {[
          { key: 'active', label: `Active${active.length > 0 ? ` (${active.length})` : ''}` },
          { key: 'past',   label: 'Past Orders' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t.key ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 scroll-content mb-tab">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-2 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-600">{tab === 'active' ? 'No active orders' : 'No past orders'}</p>
            <button onClick={() => navigate('/shop')} className="px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl press-scale">
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {shown.map(order => {
              const meta = STATUS_META[order.status] || STATUS_META.pending
              const Icon = meta.icon
              const isActive = activeStatuses.has(order.status)
              const mapsUrl = buildMapsUrl(order)
              const isDone = ['delivered', 'picked_up', 'cancelled'].includes(order.status)
              return (
                <div key={order.id} onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm press-scale">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {order.store_name || 'EazyFoods'} · #{String(order.id).slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()} · ${parseFloat(order.total_amount || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{order.items?.length || 0} items</p>
                    </div>
                  </div>

                  {isActive && <ActiveOrderSteps status={order.status} />}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    {order.status === 'out_for_delivery' && mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noreferrer"
                        className="flex-1 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 press-scale">
                        <MapPin className="h-3.5 w-3.5" /> Track
                      </a>
                    )}
                    {isDone && order.items?.length > 0 && (
                      <button onClick={() => handleReorder(order)}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 press-scale">
                        <RotateCcw className="h-3.5 w-3.5" /> Reorder
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
