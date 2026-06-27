import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, MapPin, Search, X } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'

function ChefCard({ chef, onPress }) {
  const img = resolveImg(chef.profile_image || chef.image_url)
  return (
    <button onClick={onPress}
      className="bg-white rounded-2xl overflow-hidden shadow-sm press-scale flex gap-3 p-3">
      <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
        {img
          ? <img src={img} alt={chef.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">👨‍🍳</div>
        }
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-bold text-gray-900 text-sm leading-tight">{chef.name || chef.business_name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{chef.cuisine_type || 'Chef'}</p>
        {chef.city && (
          <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
            <MapPin className="h-3 w-3" />{chef.city}
          </p>
        )}
        {chef.rating > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-xs text-gray-500">{parseFloat(chef.rating).toFixed(1)}</span>
            {chef.review_count > 0 && <span className="text-xs text-gray-400">({chef.review_count})</span>}
          </div>
        )}
      </div>
      {chef.min_order_amount && (
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-400">Min order</p>
          <p className="text-sm font-bold text-primary-700">${parseFloat(chef.min_order_amount).toFixed(0)}</p>
        </div>
      )}
    </button>
  )
}

export default function ChefsScreen() {
  const navigate = useNavigate()
  const [chefs, setChefs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')

  useEffect(() => {
    api.get('/customer/chefs', { params: { limit: 50 } })
      .then(r => setChefs(Array.isArray(r.data) ? r.data : (r.data?.chefs || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = q
    ? chefs.filter(c => (c.name || c.business_name || '').toLowerCase().includes(q.toLowerCase()) || (c.cuisine_type || '').toLowerCase().includes(q.toLowerCase()))
    : chefs

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title="Chefs" back />
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chefs, cuisine…"
            className="w-full h-10 pl-9 pr-10 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}
        </div>
      </div>
      <div className="flex-1 scroll-content mb-tab">
        <div className="p-4 space-y-3">
          {loading
            ? [1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
                </div>
              ))
            : filtered.map(c => <ChefCard key={c.id} chef={c} onPress={() => navigate(`/chefs/${c.id}`)} />)
          }
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">👨‍🍳</p>
              <p>No chefs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
