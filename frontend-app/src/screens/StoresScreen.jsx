import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import StoreCard from '../components/StoreCard'
import { StoreSkeleton } from '../components/Skeleton'
import { useLocation } from '../contexts/LocationContext'
import api from '../services/api'
import { Search, X } from 'lucide-react'

export default function StoresScreen() {
  const navigate = useNavigate()
  const { selectedCity, locationLabel } = useLocation()
  const [stores, setStores]   = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (selectedCity) params.city = selectedCity
    api.get('/customer/stores/', { params })
      .then(r => setStores(Array.isArray(r.data) ? r.data : (r.data?.stores || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedCity])

  const filtered = q
    ? stores.filter(s => (s.name || '').toLowerCase().includes(q.toLowerCase()) || (s.city || '').toLowerCase().includes(q.toLowerCase()))
    : stores

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title="All Stores" back />
      {selectedCity && (
        <div className="px-4 py-1.5 bg-primary-50 border-b border-primary-100 flex-shrink-0">
          <p className="text-xs text-primary-700 font-medium">Showing stores in <span className="font-bold">{locationLabel}</span></p>
        </div>
      )}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search stores…"
            className="w-full h-10 pl-9 pr-10 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}
        </div>
      </div>
      <div className="flex-1 scroll-content mb-tab">
        <div className="grid grid-cols-1 gap-3 p-4">
          {loading
            ? [1,2,3,4].map(i => <StoreSkeleton key={i} />)
            : filtered.map(s => <StoreCard key={s.id} store={s} />)
          }
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">🏪</p>
              <p>No stores found{selectedCity ? ` in ${selectedCity}` : ''}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
