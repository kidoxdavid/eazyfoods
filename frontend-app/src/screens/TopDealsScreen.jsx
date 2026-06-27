import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Filter, Loader2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import ProductCard from '../components/ProductCard'
import { ProductSkeleton } from '../components/Skeleton'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'

const SORT_OPTS = [
  { label: 'Best Discount', value: 'discount' },
  { label: 'Price ↑',       value: 'price_asc' },
  { label: 'Price ↓',       value: 'price_desc' },
  { label: 'Top Rated',     value: 'rating' },
]

function ChefDealCard({ deal, onAdd }) {
  const img = resolveImg(deal.image_url || deal.chef?.profile_image)
  const price = parseFloat(deal.price || 0)
  const orig  = parseFloat(deal.original_price || deal.regular_price || 0)
  const disc  = orig > price ? Math.round((1 - price / orig) * 100) : 0
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="relative h-32 bg-gray-100">
        {img ? <img src={img} alt={deal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
        {disc > 0 && <span className="absolute top-2 left-2 bg-nude-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{disc}%</span>}
      </div>
      <div className="p-3">
        <p className="text-sm font-bold text-gray-900 line-clamp-1">{deal.name}</p>
        {deal.chef?.chef_name && <p className="text-[11px] text-gray-400 mt-0.5">by {deal.chef.chef_name}</p>}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-sm font-bold text-primary-700">${price.toFixed(2)}</span>
            {orig > price && <span className="text-[10px] text-gray-400 line-through ml-1">${orig.toFixed(2)}</span>}
          </div>
          <button onClick={() => onAdd(deal)} className="bg-primary-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full press-scale">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TopDealsScreen() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { success } = useToast()
  const mode = sp.get('mode') || 'market' // 'market' | 'chef'

  const [q, setQ]           = useState('')
  const [sort, setSort]     = useState('discount')
  const [catId, setCatId]   = useState('')
  const [categories, setCats] = useState([])
  const [products, setProducts] = useState([])
  const [chefDeals, setChefDeals] = useState([])
  const [loading, setLoading]   = useState(true)
  const [hasMore, setHasMore]   = useState(true)
  const [page, setPage]         = useState(1)
  const LIMIT = 20
  const bottomRef = useRef(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    api.get('/customer/categories').then(r => setCats(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  const fetchMarket = useCallback(async (query, cat, sortBy, pageNum, reset) => {
    setLoading(true)
    try {
      const p = { discounted: true, limit: LIMIT, skip: (pageNum - 1) * LIMIT }
      if (query.trim()) p.search = query.trim()
      if (cat)          p.category_id = cat
      if (sortBy === 'price_asc')  p.sort = 'price_asc'
      if (sortBy === 'price_desc') p.sort = 'price_desc'
      if (sortBy === 'rating')     p.sort = 'rating'
      const res = await api.get('/customer/products', { params: p })
      const data = Array.isArray(res.data) ? res.data : (res.data?.products || [])
      setProducts(prev => reset ? data : [...prev, ...data])
      setHasMore(data.length === LIMIT)
    } catch (_) {}
    setLoading(false)
  }, [])

  const fetchChef = useCallback(async (query, sortBy, reset) => {
    setLoading(true)
    try {
      const p = {}
      if (query.trim()) p.search = query.trim()
      if (sortBy === 'price_asc')  p.sort = 'price_asc'
      if (sortBy === 'price_desc') p.sort = 'price_desc'
      const res = await api.get('/customer/chef-cuisines-deals', { params: p })
      const data = Array.isArray(res.data) ? res.data : (res.data?.deals || [])
      setChefDeals(reset ? data : [...data])
    } catch (_) { setChefDeals([]) }
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      if (mode === 'market') fetchMarket(q, catId, sort, 1, true)
      else fetchChef(q, sort, true)
    }, q ? 350 : 0)
  }, [q, catId, sort, mode, fetchMarket, fetchChef])

  const loadMore = () => {
    if (!loading && hasMore && mode === 'market') {
      const next = page + 1; setPage(next)
      fetchMarket(q, catId, sort, next, false)
    }
  }
  useEffect(() => {
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    if (bottomRef.current) obs.observe(bottomRef.current)
    return () => obs.disconnect()
  })

  const handleAddChef = async (deal) => {
    const p = { id: deal.id, name: deal.name, price: parseFloat(deal.price || 0), image_url: deal.image_url }
    await addToCart(p)
    success(`${deal.name} added!`)
  }

  const title = mode === 'chef' ? 'Top Chef Deals' : 'Top Market Deals'

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title={title} back />

      {/* Mode toggle */}
      <div className="flex bg-white border-b border-gray-100">
        {[{ k: 'market', l: '🛒 Market Deals' }, { k: 'chef', l: '👨‍🍳 Chef Deals' }].map(({ k, l }) => (
          <button key={k} onClick={() => navigate(`/top-deals?mode=${k}`, { replace: true })}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === k ? 'text-primary-700 border-b-2 border-primary-700' : 'text-gray-400'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 scroll-content mb-tab">
        {/* Filters */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search deals…"
              className="w-full h-10 pl-9 pr-10 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {SORT_OPTS.map(o => (
              <button key={o.value} onClick={() => setSort(o.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press-scale ${sort === o.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {o.label}
              </button>
            ))}
          </div>
          {mode === 'market' && categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setCatId('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press-scale ${!catId ? 'bg-nude-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                All
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setCatId(catId === c.id ? '' : c.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press-scale ${catId === c.id ? 'bg-nude-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market deals — 2-col grid */}
        {mode === 'market' && (
          <div className="grid grid-cols-2 gap-3 p-4">
            {products.map(p => <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />)}
            {loading && [1,2,3,4].map(i => <ProductSkeleton key={i} />)}
          </div>
        )}

        {/* Chef deals — full-width cards */}
        {mode === 'chef' && !loading && (
          <div className="grid grid-cols-2 gap-3 p-4">
            {chefDeals.map(d => <ChefDealCard key={d.id} deal={d} onAdd={handleAddChef} />)}
          </div>
        )}
        {mode === 'chef' && loading && (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 text-primary-600 animate-spin" /></div>
        )}

        {!loading && ((mode === 'market' && products.length === 0) || (mode === 'chef' && chefDeals.length === 0)) && (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🏷️</p><p>No deals right now</p></div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}
