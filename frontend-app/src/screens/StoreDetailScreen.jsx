import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Clock, Star, Search, X, Phone, Loader2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import ProductCard from '../components/ProductCard'
import { ProductSkeleton } from '../components/Skeleton'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

function isOpen(hours) {
  if (!hours || typeof hours !== 'object') return false
  const h = hours[DAYS[new Date().getDay()]]
  if (!h || h.closed === true || h.closed === 'true' || !h.open || !h.close) return false
  const cur = new Date().getHours() * 60 + new Date().getMinutes()
  const [oh, om] = h.open.split(':').map(Number)
  const [ch, cm] = h.close.split(':').map(Number)
  return cur >= oh * 60 + om && cur <= ch * 60 + cm
}

function todayHours(hours) {
  if (!hours) return null
  const h = hours[DAYS[new Date().getDay()]]
  if (!h || h.closed === true || h.closed === 'true') return 'Closed today'
  if (h.open && h.close) return `${h.open} – ${h.close}`
  return null
}

const SORT_OPTIONS = [
  { label: 'Newest',      value: 'newest' },
  { label: 'Price ↑',    value: 'price_asc' },
  { label: 'Price ↓',    value: 'price_desc' },
  { label: 'Top Rated',  value: 'rating' },
]

export default function StoreDetailScreen() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [store, setStore]           = useState(null)
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [selCat, setSelCat]         = useState('')
  const [q, setQ]                   = useState('')
  const [sort, setSort]             = useState('newest')
  const [loading, setLoading]       = useState(true)
  const [prodLoading, setProdLoading] = useState(true)
  const [page, setPage]             = useState(1)
  const [hasMore, setHasMore]       = useState(true)
  const LIMIT = 20
  const bottomRef = useRef(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    api.get(`/customer/stores/${storeId}`)
      .then(r => setStore(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/customer/categories')
      .then(r => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [storeId])

  const fetchProducts = useCallback(async (query, catId, sortBy, pageNum, reset = false) => {
    setProdLoading(true)
    try {
      const p = { vendor_id: storeId, limit: LIMIT, skip: (pageNum - 1) * LIMIT }
      if (query.trim()) p.search = query.trim()
      if (catId)        p.category_id = catId
      if (sortBy === 'price_asc')  p.sort = 'price_asc'
      if (sortBy === 'price_desc') p.sort = 'price_desc'
      if (sortBy === 'rating')     p.sort = 'rating'
      const res = await api.get('/customer/products', { params: p })
      const data = Array.isArray(res.data) ? res.data : (res.data?.products || [])
      setProducts(prev => reset ? data : [...prev, ...data])
      setHasMore(data.length === LIMIT)
    } catch (_) {}
    setProdLoading(false)
  }, [storeId])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchProducts(q, selCat, sort, 1, true)
    }, q ? 350 : 0)
  }, [q, selCat, sort, fetchProducts])

  const loadMore = () => {
    if (!prodLoading && hasMore) {
      const next = page + 1; setPage(next)
      fetchProducts(q, selCat, sort, next)
    }
  }
  useEffect(() => {
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    if (bottomRef.current) obs.observe(bottomRef.current)
    return () => obs.disconnect()
  })

  const img = resolveImg(store?.logo_url || store?.image_url)
  const open = isOpen(store?.operating_hours)
  const hours = todayHours(store?.operating_hours)

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title={loading ? 'Store' : (store?.name || 'Store')} back />

      <div className="flex-1 scroll-content mb-tab">
        {/* Store header */}
        {loading ? (
          <div className="h-40 bg-gray-200 animate-pulse" />
        ) : store && (
          <div className="bg-white shadow-sm">
            <div className="h-40 bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
              {img && <img src={img} alt={store.name} className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${open ? 'bg-primary-600 text-white' : 'bg-gray-800/80 text-white'}`}>
                {open ? 'Open Now' : 'Closed'}
              </span>
            </div>
            <div className="px-4 py-3">
              <h1 className="font-bold text-gray-900 text-lg">{store.name}</h1>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                {store.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{store.city}</span>}
                {hours && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{hours}</span>}
                {store.rating > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{parseFloat(store.rating).toFixed(1)}</span>}
                {store.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{store.phone}</span>}
              </div>
              {store.description && <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{store.description}</p>}
            </div>
          </div>
        )}

        {/* Search + filters */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search this store…"
              className="w-full h-10 pl-9 pr-10 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setSort(o.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press-scale ${sort === o.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {o.label}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setSelCat('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press-scale ${!selCat ? 'bg-nude-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                All
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setSelCat(selCat === c.id ? '' : c.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press-scale ${selCat === c.id ? 'bg-nude-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {products.map(p => <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />)}
          {prodLoading && [1,2,3,4].map(i => <ProductSkeleton key={i} />)}
        </div>
        {!prodLoading && products.length === 0 && (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📦</p><p>No products found</p></div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}
