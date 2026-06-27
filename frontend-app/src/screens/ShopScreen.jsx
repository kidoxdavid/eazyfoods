import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import api from '../services/api'
import ProductCard from '../components/ProductCard'
import AppHeader from '../components/AppHeader'
import { ProductSkeleton } from '../components/Skeleton'
import { useCart } from '../contexts/CartContext'

const FILTERS = [
  { label: 'All',       value: '' },
  { label: 'Deals',     value: 'discounted' },
  { label: 'New',       value: 'new' },
  { label: 'In Stock',  value: 'in_stock' },
]

export default function ShopScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initQ = params.get('q') || ''
  const initFilter = params.get('filter') || ''
  const initStore = params.get('store') || ''

  const [q, setQ]             = useState(initQ)
  const [filter, setFilter]   = useState(initFilter)
  const [products, setProducts] = useState([])
  const [loading, setLoading]  = useState(true)
  const [page, setPage]        = useState(1)
  const [hasMore, setHasMore]  = useState(true)
  const searchTimeout = useRef(null)
  const LIMIT = 20

  const fetch = useCallback(async (query, filterVal, pageNum, reset = false) => {
    setLoading(true)
    try {
      const p = { limit: LIMIT, skip: (pageNum - 1) * LIMIT }
      if (query)     p.q = query
      if (initStore) p.store_id = initStore
      if (filterVal === 'discounted') p.discounted = true
      if (filterVal === 'new')        p.new_arrivals = true
      if (filterVal === 'in_stock')   p.in_stock = true

      const res = await api.get('/customer/products', { params: p })
      const data = Array.isArray(res.data) ? res.data : res.data?.products || []
      setProducts(prev => reset ? data : [...prev, ...data])
      setHasMore(data.length === LIMIT)
    } catch (_) {}
    setLoading(false)
  }, [initStore])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetch(q, filter, 1, true)
    }, q ? 350 : 0)
  }, [q, filter, fetch])

  const loadMore = () => {
    if (!loading && hasMore) {
      const next = page + 1
      setPage(next)
      fetch(q, filter, next)
    }
  }

  // Infinite scroll
  const bottomRef = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    if (bottomRef.current) obs.observe(bottomRef.current)
    return () => obs.disconnect()
  })

  const storeTitle = initStore ? 'Store Products' : 'Browse'

  return (
    <div className="h-full flex flex-col pt-safe">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-full h-10 pl-9 pr-10 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              autoFocus={!initQ}
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold press-scale transition-colors ${
                filter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 scroll-content mb-tab">
        <div className="grid grid-cols-2 gap-3 p-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />
          ))}
          {loading && [1,2,3,4].map(i => <ProductSkeleton key={i} />)}
        </div>

        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <span className="text-5xl mb-4">🔍</span>
            <p className="font-semibold text-gray-700">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search or filter</p>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}
