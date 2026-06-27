import { Star, Clock, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { resolveImg } from '../services/imageUtils'

function isOpen(hours) {
  if (!hours || typeof hours !== 'object') return false
  const now = new Date()
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()]
  const h = hours[day]
  if (!h || h.closed === true || h.closed === 'true' || !h.open || !h.close) return false
  try {
    const cur = now.getHours() * 60 + now.getMinutes()
    const [oh, om] = h.open.split(':').map(Number)
    const [ch, cm] = h.close.split(':').map(Number)
    return cur >= oh * 60 + om && cur <= ch * 60 + cm
  } catch { return false }
}

export default function StoreCard({ store }) {
  const navigate = useNavigate()
  const img = resolveImg(store.logo_url || store.image_url)
  const open = isOpen(store.operating_hours)

  return (
    <div
      onClick={() => navigate(`/shop?store=${store.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm press-scale active:shadow-md"
    >
      {/* Banner */}
      <div className="relative h-28 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
        {img ? (
          <img src={img} alt={store.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
        )}
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          open ? 'bg-primary-600 text-white' : 'bg-gray-800/70 text-white'
        }`}>
          {open ? 'Open' : 'Closed'}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-tight mb-1">{store.name}</p>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          {store.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              {parseFloat(store.rating).toFixed(1)}
            </span>
          )}
          {store.city && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {store.city}
            </span>
          )}
          {store.delivery_time_min && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {store.delivery_time_min}–{store.delivery_time_max || store.delivery_time_min + 15} min
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
