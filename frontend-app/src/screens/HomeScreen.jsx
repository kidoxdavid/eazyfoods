import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Search, Star, Tag, ChefHat, Store, Percent } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'
import ProductCard from '../components/ProductCard'
import StoreCard from '../components/StoreCard'
import { StoreSkeleton, ProductSkeleton } from '../components/Skeleton'

const FALLBACK_OCCASIONS = [
  { id: 'ramadan',    month: 3,  day: 1,  window: 21, emoji: '🌙', title: 'Ramadan Season',          sub: 'Stock up for Iftar & Suhoor',                 search: 'dates rice lamb chicken',    color: 'from-purple-600 to-indigo-700' },
  { id: 'eid',        month: 4,  day: 10, window: 14, emoji: '🎊', title: 'Eid al-Fitr',              sub: 'Celebrate with family favourites',             search: 'lamb biryani sweets dates',  color: 'from-amber-500 to-orange-600' },
  { id: 'juneteenth', month: 6,  day: 16, window: 21, emoji: '✊', title: 'Juneteenth',               sub: 'Celebrate with soul food essentials',          search: 'cornbread greens yams',      color: 'from-red-600 to-black' },
  { id: 'caribana',   month: 8,  day: 1,  window: 31, emoji: '🥁', title: 'Caribana Season',          sub: 'Caribbean & African flavours all month',       search: 'scotch bonnet plantain jerk', color: 'from-yellow-400 to-red-500' },
  { id: 'nigeria_ind',month: 10, day: 1,  window: 14, emoji: '🦅', title: "Nigeria's Independence",   sub: 'Taste of home — shop Nigerian staples',        search: 'egusi ogbono stockfish',     color: 'from-green-600 to-green-800' },
  { id: 'kwanzaa',    month: 12, day: 26, window: 7,  emoji: '🕯️', title: 'Kwanzaa',                  sub: 'Shop for the seven-day celebration',           search: 'yam cassava greens',         color: 'from-red-700 to-black' },
  { id: 'african_heritage', month: 2, day: 1, window: 28, emoji: '✊', title: 'African Heritage Month', sub: 'Discover authentic African cuisine', search: '', color: 'from-amber-600 to-orange-700' },
]

const CAT_EMOJI = {
  meat: '🥩', chicken: '🍗', fish: '🐟', seafood: '🦐', vegetable: '🥬', vegetables: '🥬',
  fruit: '🍌', fruits: '🍌', grains: '🌾', grain: '🌾', rice: '🌾', spice: '🌿', spices: '🌿',
  beverages: '🥤', drinks: '🥤', drink: '🥤', dairy: '🥛', snacks: '🍿', snack: '🍿',
  oil: '🫙', oils: '🫙', condiment: '🫙', condiments: '🫙', frozen: '🧊', bread: '🍞',
  beauty: '🧴', cosmetics: '🧴', household: '🧹', cleaning: '🧹', baby: '👶',
  legumes: '🫘', beans: '🫘', nuts: '🥜', dried: '🫙', palm: '🌴', yam: '🫚',
}
const catEmoji = (name) => {
  if (!name) return '🛒'
  const n = name.toLowerCase()
  for (const [k, v] of Object.entries(CAT_EMOJI)) if (n.includes(k)) return v
  return '🛒'
}

function Section({ title, onSeeAll, children }) {
  return (
    <div className="pt-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-xs text-primary-600 font-semibold flex items-center gap-0.5">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function ChefCard({ chef, onPress }) {
  const img = resolveImg(chef.profile_image || chef.image_url)
  return (
    <button onClick={onPress} className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm press-scale">
      <div className="h-24 bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
        {img
          ? <img src={img} alt={chef.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">👨‍🍳</div>
        }
      </div>
      <div className="p-2">
        <p className="text-xs font-bold text-gray-900 leading-tight truncate">{chef.name || chef.business_name}</p>
        <p className="text-[10px] text-gray-500 truncate">{chef.cuisine_type || 'Chef'}</p>
        {chef.rating > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-gray-500">{parseFloat(chef.rating).toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  )
}

function PromoCard({ promo, onPress }) {
  const img = resolveImg(promo.image_url || promo.banner_url)
  return (
    <button onClick={onPress}
      className="flex-shrink-0 w-64 h-32 bg-gradient-to-br from-nude-600 to-nude-700 rounded-2xl overflow-hidden shadow-sm press-scale relative">
      {img && <img src={img} alt={promo.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
      <div className="relative p-3 flex flex-col justify-end h-full">
        <div className="flex items-center gap-1 mb-1">
          <Tag className="h-3 w-3 text-white" />
          <span className="text-white text-[10px] font-bold uppercase tracking-wide">Promotion</span>
        </div>
        <p className="text-white font-bold text-sm leading-tight">{promo.title}</p>
        {promo.discount_value && (
          <p className="text-white/80 text-xs mt-0.5">
            {promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `$${promo.discount_value} off`}
          </p>
        )}
      </div>
    </button>
  )
}

export default function HomeScreen() {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const { success } = useToast()
  const navigate = useNavigate()

  const [state, setState] = useState({
    newProducts: [], discounted: [], lowStock: [], allProducts: [],
    categories: [], stores: [], promotions: [], chefs: [], occasions: null,
    loading: true, refreshing: false,
  })

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setState(s => ({ ...s, loading: true }))
    try {
      const [homeRes, catsRes, storesRes, promosRes, chefsRes, occasionsRes] = await Promise.all([
        api.get('/customer/home-products', { params: { limit: 100 } }),
        api.get('/customer/categories'),
        api.get('/customer/stores/'),
        api.get('/customer/promotions', { params: { limit: 10 } }).catch(() => ({ data: [] })),
        api.get('/customer/chefs', { params: { limit: 10 } }).catch(() => ({ data: [] })),
        api.get('/customer/marketing/occasions').catch(() => ({ data: null })),
      ])

      const hp = homeRes.data || {}
      const storesArr = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || [])
      const chefsArr = Array.isArray(chefsRes.data) ? chefsRes.data : (chefsRes.data?.chefs || [])
      const promosArr = Array.isArray(promosRes.data) ? promosRes.data : []
      const catsArr = Array.isArray(catsRes.data) ? catsRes.data : []

      setState(s => ({
        ...s,
        newProducts: (hp.new_arrivals || []).slice(0, 8),
        discounted: (hp.discounted || []).slice(0, 8),
        lowStock: (hp.low_stock || []).slice(0, 4),
        allProducts: (hp.products || []).slice(0, 8),
        categories: catsArr.slice(0, 16),
        stores: storesArr.slice(0, 8),
        promotions: promosArr,
        chefs: chefsArr,
        occasions: occasionsRes.data || null,
        loading: false,
        refreshing: false,
      }))
    } catch (_) {
      setState(s => ({ ...s, loading: false, refreshing: false }))
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Pull-to-refresh
  let startY = 0
  const onTouchStart = e => { startY = e.touches[0].clientY }
  const onTouchEnd = e => {
    if (e.changedTouches[0].clientY - startY > 80 && !state.refreshing) {
      setState(s => ({ ...s, refreshing: true }))
      fetchData(true)
    }
  }

  const activeOccasion = (() => {
    const cfg = state.occasions
    if (cfg && cfg.enabled === false) return null
    const all = (cfg?.occasions?.length ? cfg.occasions : FALLBACK_OCCASIONS).filter(o => o.enabled !== false)
    const now = new Date()
    if (cfg?.force_occasion_id) return all.find(o => o.id === cfg.force_occasion_id)
    return all.find(o => {
      const d = new Date(now.getFullYear(), o.month - 1, o.day)
      const diff = (now - d) / 86400000
      return diff >= -3 && diff <= o.window
    })
  })()

  const firstName = user?.full_name?.split(' ')[0] || user?.first_name || 'there'
  const { loading, refreshing, categories, stores, promotions, chefs, discounted, newProducts, lowStock, allProducts } = state

  return (
    <div className="h-full flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Header */}
      <div className="bg-primary-600 pt-safe flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-primary-200 text-xs">Hello, {firstName} 👋</p>
            <p className="text-white text-sm font-bold">EazyFoods</p>
          </div>
          <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="px-4 pb-4">
          <button onClick={() => navigate('/shop')}
            className="w-full h-11 bg-white rounded-2xl flex items-center gap-2 px-4 shadow-sm press-scale">
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Search products, stores…</span>
          </button>
        </div>
      </div>

      {refreshing && (
        <div className="flex-shrink-0 flex justify-center bg-primary-50 py-2">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex-1 scroll-content mb-tab">

        {/* Categories from API */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Categories</h2>
            <button onClick={() => navigate('/shop')} className="text-xs text-primary-600 font-semibold flex items-center gap-0.5">
              All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {[1,2,3,4,5,6].map(i => <div key={i} className="flex-shrink-0 w-14 h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => navigate(`/shop?category_id=${cat.id}&category_name=${encodeURIComponent(cat.name)}`)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 press-scale">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center overflow-hidden">
                    {cat.image_url
                      ? <img src={resolveImg(cat.image_url)} alt={cat.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">{catEmoji(cat.name)}</span>
                    }
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 text-center leading-tight w-14 truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cultural occasion banner */}
        {activeOccasion && (
          <div className="px-4 pt-5">
            <button
              onClick={() => navigate(`/shop?search=${encodeURIComponent(activeOccasion.search || '')}`)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${activeOccasion.color} text-white shadow-md press-scale`}>
              <span className="text-3xl flex-shrink-0">{activeOccasion.emoji}</span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-sm leading-tight">{activeOccasion.title}</p>
                <p className="text-white/80 text-xs mt-0.5">{activeOccasion.sub}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Promotions */}
        {(loading || promotions.length > 0) && (
          <Section title="🎁 Promotions & Deals" onSeeAll={() => navigate('/shop?discounted=true')}>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {loading
                ? [1,2].map(i => <div key={i} className="flex-shrink-0 w-64 h-32 bg-gray-200 rounded-2xl animate-pulse" />)
                : promotions.map(p => (
                    <PromoCard key={p.id} promo={p} onPress={() => navigate(`/shop?search=${encodeURIComponent(p.title || '')}`)} />
                  ))
              }
            </div>
          </Section>
        )}

        {/* Nearby Stores */}
        <Section title="🏪 Stores Near You" onSeeAll={() => navigate('/stores')}>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {[1,2,3].map(i => <div key={i} className="flex-shrink-0 w-44"><StoreSkeleton /></div>)}
            </div>
          ) : stores.length === 0 ? (
            <p className="px-4 text-sm text-gray-400 text-center py-4">No stores found</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {stores.map(s => <div key={s.id} className="flex-shrink-0 w-44"><StoreCard store={s} /></div>)}
            </div>
          )}
        </Section>

        {/* Chefs */}
        {(loading || chefs.length > 0) && (
          <Section title="👨‍🍳 Featured Chefs" onSeeAll={() => navigate('/chefs')}>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {loading
                ? [1,2,3].map(i => <div key={i} className="flex-shrink-0 w-36 h-36 bg-gray-200 rounded-2xl animate-pulse" />)
                : chefs.map(c => (
                    <ChefCard key={c.id} chef={c} onPress={() => navigate(`/chefs/${c.id}`)} />
                  ))
              }
            </div>
          </Section>
        )}

        {/* Discounted products */}
        {(loading || discounted.length > 0) && (
          <Section title="🔥 Today's Deals" onSeeAll={() => navigate('/shop?discounted=true')}>
            <div className="grid grid-cols-2 gap-3 px-4">
              {loading
                ? [1,2,3,4].map(i => <ProductSkeleton key={i} />)
                : discounted.map(p => <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />)
              }
            </div>
          </Section>
        )}

        {/* New Arrivals */}
        {(loading || newProducts.length > 0) && (
          <Section title="✨ New Arrivals" onSeeAll={() => navigate('/shop?new_arrivals=true')}>
            <div className="grid grid-cols-2 gap-3 px-4">
              {loading
                ? [1,2].map(i => <ProductSkeleton key={i} />)
                : newProducts.map(p => <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />)
              }
            </div>
          </Section>
        )}

        {/* Low Stock */}
        {lowStock.length > 0 && (
          <Section title="⚡ Low Stock — Grab Fast">
            <div className="grid grid-cols-2 gap-3 px-4">
              {lowStock.map(p => <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />)}
            </div>
          </Section>
        )}

        {/* All Products */}
        {(loading || allProducts.length > 0) && (
          <Section title="🛒 Browse All" onSeeAll={() => navigate('/shop')}>
            <div className="grid grid-cols-2 gap-3 px-4">
              {loading
                ? [1,2,3,4].map(i => <ProductSkeleton key={i} />)
                : allProducts.map(p => <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />)
              }
            </div>
          </Section>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}
