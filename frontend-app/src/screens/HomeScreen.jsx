import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MapPin, ChevronRight, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import ProductCard from '../components/ProductCard'
import StoreCard from '../components/StoreCard'
import { StoreSkeleton, ProductSkeleton } from '../components/Skeleton'

const FALLBACK_OCCASIONS = [
  { id: 'caribana', month: 8, day: 1, window: 31, emoji: '🥁', title: 'Caribana Season', sub: 'Caribbean & African flavours all month', search: 'scotch bonnet plantain jerk', color: 'from-yellow-400 to-red-500' },
  { id: 'nigeria_ind', month: 10, day: 1, window: 14, emoji: '🦅', title: "Nigeria's Independence", sub: 'Taste of home — shop Nigerian staples', search: 'egusi ogbono stockfish', color: 'from-green-600 to-green-800' },
  { id: 'african_heritage', month: 2, day: 1, window: 28, emoji: '✊', title: 'African Heritage Month', sub: 'Discover authentic African cuisine all month', search: '', color: 'from-amber-600 to-orange-700' },
]

const CATS = [
  { emoji: '🥩', label: 'Meat', q: 'beef chicken lamb' },
  { emoji: '🐟', label: 'Fish', q: 'fish stockfish catfish' },
  { emoji: '🌿', label: 'Spices', q: 'pepper spice seasoning' },
  { emoji: '🌾', label: 'Grains', q: 'rice garri yam fufu' },
  { emoji: '🥬', label: 'Veggies', q: 'vegetable egusi spinach' },
  { emoji: '🍌', label: 'Fruits', q: 'plantain banana mango' },
  { emoji: '🥤', label: 'Drinks', q: 'malt juice bissap' },
  { emoji: '🧴', label: 'Beauty', q: 'shea butter coconut' },
]

export default function HomeScreen() {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const { success } = useToast()
  const navigate = useNavigate()

  const [stores, setStores]       = useState([])
  const [featured, setFeatured]   = useState([])
  const [newArrivals, setNew]     = useState([])
  const [occasions, setOccasions] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const [storesRes, productsRes, occasionsRes] = await Promise.all([
        api.get('/customer/stores/', { params: { limit: 8 } }),
        api.get('/customer/home-products', { params: { limit: 40 } }),
        api.get('/customer/marketing/occasions').catch(() => ({ data: null })),
      ])
      const storesArr = Array.isArray(storesRes.data) ? storesRes.data : storesRes.data?.stores || []
      setStores(storesArr.slice(0, 6))
      const hp = productsRes.data || {}
      setFeatured((hp.discounted || hp.products || []).slice(0, 6))
      setNew((hp.new_arrivals || []).slice(0, 6))
      if (occasionsRes.data) setOccasions(occasionsRes.data)
    } catch (_) {}
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Pull-to-refresh
  let startY = 0
  const onTouchStart = e => { startY = e.touches[0].clientY }
  const onTouchEnd = e => {
    if (e.changedTouches[0].clientY - startY > 80 && !refreshing) {
      setRefreshing(true)
      fetchData(true)
    }
  }

  // Cultural occasion
  const activeOccasion = (() => {
    const cfg = occasions
    if (cfg && cfg.enabled === false) return null
    const all = (cfg?.occasions?.length ? cfg.occasions : FALLBACK_OCCASIONS).filter(o => o.enabled !== false)
    const now = new Date()
    if (cfg?.force_occasion_id) return all.find(o => o.id === cfg.force_occasion_id)
    return all.find(o => {
      const d = new Date(now.getFullYear(), o.month - 1, o.day)
      const diff = (d - now) / 86400000
      return diff >= -3 && diff <= o.window
    })
  })()

  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'

  return (
    <div className="h-full flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Status-bar-aware top area */}
      <div className="bg-primary-600 pt-safe flex-shrink-0">
        {/* Greeting row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-primary-200 text-xs">Hello, {firstName} 👋</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-white" />
              <span className="text-white text-sm font-semibold">Nearby stores</span>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-4">
          <button
            onClick={() => navigate('/shop')}
            className="w-full h-11 bg-white rounded-2xl flex items-center gap-2 px-4 shadow-sm press-scale"
          >
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Search products, stores…</span>
          </button>
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="flex-shrink-0 flex justify-center bg-primary-50 py-2">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 scroll-content mb-tab">
        {/* Categories */}
        <div className="px-4 pt-5">
          <h2 className="text-base font-bold text-gray-900 mb-3">Browse Categories</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {CATS.map(c => (
              <button
                key={c.label}
                onClick={() => navigate(`/shop?q=${encodeURIComponent(c.q)}`)}
                className="flex-shrink-0 flex flex-col items-center gap-1 press-scale"
              >
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">
                  {c.emoji}
                </div>
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight w-14">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cultural occasion banner */}
        {activeOccasion && (
          <div className="px-4 pt-5">
            <button
              onClick={() => navigate(`/shop?q=${encodeURIComponent(activeOccasion.search || '')}`)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${activeOccasion.color} text-white shadow-md press-scale`}
            >
              <span className="text-3xl flex-shrink-0">{activeOccasion.emoji}</span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-sm leading-tight">{activeOccasion.title}</p>
                <p className="text-white/80 text-xs mt-0.5">{activeOccasion.sub}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Nearby Stores */}
        <div className="pt-6 pb-1">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-gray-900">Stores Near You</h2>
            <button onClick={() => navigate('/shop')} className="text-xs text-primary-600 font-semibold flex items-center gap-0.5">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {[1,2,3].map(i => <div key={i} className="flex-shrink-0 w-44"><StoreSkeleton /></div>)}
            </div>
          ) : stores.length === 0 ? (
            <p className="px-4 text-sm text-gray-400 text-center py-4">No stores found near you yet</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {stores.map(s => (
                <div key={s.id} className="flex-shrink-0 w-44"><StoreCard store={s} /></div>
              ))}
            </div>
          )}
        </div>

        {/* Featured / Deals */}
        {(loading || featured.length > 0) && (
          <div className="pt-5">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-base font-bold text-gray-900">🔥 Today&apos;s Deals</h2>
              <button onClick={() => navigate('/shop?filter=discounted')} className="text-xs text-primary-600 font-semibold flex items-center gap-0.5">
                See all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4">
              {loading
                ? [1,2,3,4].map(i => <ProductSkeleton key={i} />)
                : featured.map(p => (
                    <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />
                  ))
              }
            </div>
          </div>
        )}

        {/* New Arrivals */}
        {(loading || newArrivals.length > 0) && (
          <div className="pt-5 pb-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-base font-bold text-gray-900">✨ New Arrivals</h2>
              <button onClick={() => navigate('/shop?filter=new')} className="text-xs text-primary-600 font-semibold flex items-center gap-0.5">
                See all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4">
              {loading
                ? [1,2].map(i => <ProductSkeleton key={i} />)
                : newArrivals.map(p => (
                    <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />
                  ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
