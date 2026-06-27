import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react'
import { useLocation } from '../contexts/LocationContext'
import api from '../services/api'
import ProductCard from '../components/ProductCard'
import { ProductSkeleton } from '../components/Skeleton'

const SORT_OPTIONS = [
  { label: 'Newest',       value: 'newest' },
  { label: 'Lowest Price', value: 'price_asc' },
  { label: 'Highest Price',value: 'price_desc' },
  { label: 'Top Rated',    value: 'rating' },
  { label: 'A – Z',        value: 'name' },
]

const QUICK_FILTERS = [
  { label: 'All',      key: null },
  { label: 'Deals',    key: 'discounted' },
  { label: 'New',      key: 'new_arrivals' },
  { label: 'Featured', key: 'featured' },
  { label: 'In Stock', key: 'in_stock' },
]

function FilterSheet({ visible, onClose, filters, onChange }) {
  const [local, setLocal] = useState(filters)
  const set = (k, v) => setLocal(p => ({ ...p, [k]: v }))

  useEffect(() => { if (visible) setLocal(filters) }, [visible])

  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-base">Filter & Sort</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Sort */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => set('sort', o.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${local.sort === o.value ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-700'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Price Range</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min="0" placeholder="Min"
                  value={local.minPrice || ''}
                  onChange={e => set('minPrice', e.target.value)}
                  className="w-full h-10 pl-7 pr-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <span className="text-gray-400 text-sm">–</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min="0" placeholder="Max"
                  value={local.maxPrice || ''}
                  onChange={e => set('maxPrice', e.target.value)}
                  className="w-full h-10 pl-7 pr-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
            </div>
          </div>

          {/* Min rating */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Minimum Rating</p>
            <div className="flex gap-2">
              {[0, 3, 3.5, 4, 4.5].map(r => (
                <button key={r} onClick={() => set('minRating', r)}
                  className={`flex-1 h-9 rounded-xl text-xs font-semibold border transition-colors ${local.minRating === r ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-700'}`}>
                  {r === 0 ? 'Any' : `${r}★`}
                </button>
              ))}
            </div>
          </div>

          {/* Stock */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Availability</p>
            <div className="flex gap-2">
              {[{label:'All', v:null},{label:'In Stock', v:'in_stock'},{label:'Out of Stock', v:'out_of_stock'}].map(o => (
                <button key={String(o.v)} onClick={() => set('stock', o.v)}
                  className={`flex-1 h-9 rounded-xl text-xs font-semibold border transition-colors ${local.stock === o.v ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-700'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 pt-3 border-t border-gray-100 flex gap-3">
          <button onClick={() => { const cleared = { sort: 'newest', minPrice: '', maxPrice: '', minRating: 0, stock: null }; setLocal(cleared); onChange(cleared); onClose() }}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">
            Clear all
          </button>
          <button onClick={() => { onChange(local); onClose() }}
            className="flex-1 h-11 rounded-xl bg-primary-600 text-white text-sm font-semibold">
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

const LIMIT = 20

export default function ShopScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { selectedCity } = useLocation()

  const initSearch  = params.get('search') || params.get('q') || ''
  const initCatId   = params.get('category_id') || ''
  const initCatName = params.get('category_name') || ''
  const initQF = params.get('discounted') === 'true' ? 'discounted'
               : params.get('new_arrivals') === 'true' ? 'new_arrivals'
               : params.get('featured') === 'true' ? 'featured'
               : params.get('in_stock') === 'true' ? 'in_stock'
               : null

  const [q, setQ]               = useState(initSearch)
  const [quickFilter, setQuickFilter] = useState(initQF)
  const [selCatId, setSelCatId] = useState(initCatId)
  const [selCatName, setSelCatName] = useState(initCatName)
  const [categories, setCategories] = useState([])
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState({ sort: 'newest', minPrice: '', maxPrice: '', minRating: 0, stock: null })
  const searchTimeout = useRef(null)
  const bottomRef = useRef(null)
  const activeFiltersCount = [
    filters.sort !== 'newest',
    !!filters.minPrice,
    !!filters.maxPrice,
    filters.minRating > 0,
    !!filters.stock,
  ].filter(Boolean).length

  useEffect(() => {
    api.get('/customer/categories').then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  const fetchProducts = useCallback(async (query, catId, qf, flt, pg, reset = false) => {
    setLoading(true)
    try {
      const p = { limit: LIMIT, skip: (pg - 1) * LIMIT }
      if (query.trim())    p.search      = query.trim()
      if (catId)           p.category_id = catId
      if (qf)              p[qf]         = true
      if (flt.sort)        p.sort_by     = flt.sort
      if (flt.minPrice)    p.min_price   = flt.minPrice
      if (flt.maxPrice)    p.max_price   = flt.maxPrice
      if (flt.minRating > 0) p.min_rating = flt.minRating
      if (flt.stock === 'in_stock')      p.in_stock  = true
      if (flt.stock === 'out_of_stock')  p.out_of_stock = true
      if (selectedCity)    p.city        = selectedCity

      const res = await api.get('/customer/products', { params: p })
      const data = Array.isArray(res.data) ? res.data : (res.data?.products || res.data?.items || [])
      setProducts(prev => reset ? data : [...prev, ...data])
      setHasMore(data.length === LIMIT)
    } catch {}
    setLoading(false)
  }, [selectedCity])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchProducts(q, selCatId, quickFilter, filters, 1, true)
    }, q ? 350 : 0)
  }, [q, selCatId, quickFilter, filters, fetchProducts])

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading && hasMore) {
        const next = page + 1; setPage(next); fetchProducts(q, selCatId, quickFilter, filters, next)
      }
    }, { threshold: 0.1 })
    if (bottomRef.current) obs.observe(bottomRef.current)
    return () => obs.disconnect()
  }, [loading, hasMore, page, q, selCatId, quickFilter, filters, fetchProducts])

  return (
    <div className="h-full flex flex-col pt-safe">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search products…"
              autoComplete="off"
              className="w-full h-10 pl-9 pr-9 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}
          </div>
          <button onClick={() => setShowFilter(true)}
            className={`relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${activeFiltersCount > 0 ? 'bg-primary-600' : 'bg-gray-100'}`}>
            <SlidersHorizontal className={`h-4 w-4 ${activeFiltersCount > 0 ? 'text-white' : 'text-gray-600'}`} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {/* Quick filter pills */}
        <div className="flex gap-2 px-3 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {QUICK_FILTERS.map(f => (
            <button key={String(f.key)} onClick={() => setQuickFilter(quickFilter === f.key ? null : f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${quickFilter === f.key || (f.key === null && !quickFilter) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Category chip if active */}
        {selCatName && (
          <div className="flex items-center gap-2 px-3 pb-2">
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
              {selCatName}
              <button onClick={() => { setSelCatId(''); setSelCatName('') }}><X className="h-3 w-3 ml-1" /></button>
            </span>
          </div>
        )}

        {/* Category horizontal scroll */}
        <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { setSelCatId(cat.id === selCatId ? '' : cat.id); setSelCatName(cat.id === selCatId ? '' : cat.name) }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selCatId === String(cat.id) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Products grid ── */}
      <div className="flex-1 scroll-content mb-tab">
        {!loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <span className="text-5xl mb-4">🔍</span>
            <p className="font-bold text-gray-800">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search or remove filters</p>
            <button onClick={() => { setQ(''); setQuickFilter(null); setSelCatId(''); setSelCatName(''); setFilters({ sort: 'newest', minPrice: '', maxPrice: '', minRating: 0, stock: null }) }}
              className="mt-4 px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 p-3">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />
            ))}
            {loading && [1,2,3,4,5,6].map(i => <ProductSkeleton key={i} />)}
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      <FilterSheet visible={showFilter} onClose={() => setShowFilter(false)} filters={filters} onChange={f => { setFilters(f); setPage(1) }} />
    </div>
  )
}
