import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, ChevronLeft } from 'lucide-react'
import api from '../services/api'
import ProductCard from '../components/ProductCard'
import { ProductSkeleton } from '../components/Skeleton'

const SORT_FILTERS = [
  { label: 'All',      params: {} },
  { label: 'New',      params: { new_arrivals: true } },
  { label: 'Deals',    params: { discounted: true } },
  { label: 'Featured', params: { featured: true } },
]

export default function ShopScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const initSearch = params.get('search') || params.get('q') || ''
  const initCatId  = params.get('category_id') || ''
  const initCatName = params.get('category_name') || ''
  const initDiscounted = params.get('discounted') === 'true'
  const initNew = params.get('new_arrivals') === 'true'
  const initFeatured = params.get('featured') === 'true'

  const [q, setQ]               = useState(initSearch)
  const [activeFilter, setActiveFilter] = useState(
    initDiscounted ? 1 : initNew ? 2 : initFeatured ? 3 : 0
  )
  const [products, setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [selCatId, setSelCatId]   = useState(initCatId)
  const [selCatName, setSelCatName] = useState(initCatName)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(true)
  const LIMIT = 20
  const searchTimeout = useRef(null)
  const bottomRef = useRef(null)

  // Fetch categories once
  useEffect(() => {
    api.get('/customer/categories')
      .then(r => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  const fetchProducts = useCallback(async (query, catId, filterIdx, pageNum, reset = false) => {
    setLoading(true)
    try {
      const fp = SORT_FILTERS[filterIdx]?.params || {}
      const p = { limit: LIMIT, skip: (pageNum - 1) * LIMIT, ...fp }
      if (query.trim()) p.search = query.trim()
      if (catId)        p.category_id = catId

      const res = await api.get('/customer/products', { params: p })
      const data = Array.isArray(res.data) ? res.data : (res.data?.products || res.data?.items || [])
      setProducts(prev => reset ? data : [...prev, ...data])
      setHasMore(data.length === LIMIT)
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchProducts(q, selCatId, activeFilter, 1, true)
    }, q ? 350 : 0)
  }, [q, selCatId, activeFilter, fetchProducts])

  const loadMore = () => {
    if (!loading && hasMore) {
      const next = page + 1
      setPage(next)
      fetchProducts(q, selCatId, activeFilter, next)
    }
  }

  useEffect(() => {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    if (bottomRef.current) obs.observe(bottomRef.current)
    return () => obs.disconnect()
  })

  const clearCat = () => { setSelCatId(''); setSelCatName('') }

  return (
    <div className="h-full flex flex-col pt-safe">
      {/* Search header */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-full h-10 pl-9 pr-10 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active category chip */}
        {selCatName && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <span className="flex items-center gap-1 bg-primary-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              {selCatName}
              <button onClick={clearCat}><X className="h-3 w-3 ml-1" /></button>
            </span>
          </div>
        )}

        {/* Sort filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {SORT_FILTERS.map((f, i) => (
            <button key={i} onClick={() => setActiveFilter(i)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold press-scale transition-colors ${
                activeFilter === i ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              {f.label}
            </button>
          ))}
          {/* Category quick-filters */}
          {!selCatId && categories.slice(0, 6).map(cat => (
            <button key={cat.id}
              onClick={() => { setSelCatId(cat.id); setSelCatName(cat.name) }}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 press-scale">
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
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
            <p className="text-sm text-gray-400 mt-1">Try a different search or category</p>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}
