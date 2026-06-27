import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Search, Star, Tag, MapPin, ChevronDown, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation, PROVINCES, CITIES_BY_PROVINCE } from '../contexts/LocationContext'
import { useCart } from '../contexts/CartContext'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'
import ProductCard from '../components/ProductCard'
import StoreCard from '../components/StoreCard'
import { ProductSkeleton, StoreSkeleton } from '../components/Skeleton'

/* ── Occasion config ──────────────────────────────────────────────────────── */
const FALLBACK_OCCASIONS = [
  { id: 'juneteenth', month: 6,  day: 16, window: 21, emoji: '✊', title: 'Juneteenth',           sub: 'Celebrate with soul food essentials',    search: 'cornbread greens yams',      color: 'from-red-700 to-gray-900' },
  { id: 'caribana',   month: 8,  day: 1,  window: 31, emoji: '🥁', title: 'Caribana Season',       sub: 'Caribbean & African flavours all month', search: 'scotch bonnet plantain jerk', color: 'from-yellow-400 to-red-500' },
  { id: 'nigeria_ind',month: 10, day: 1,  window: 14, emoji: '🦅', title: "Nigeria's Independence", sub: 'Shop Nigerian staples',                  search: 'egusi ogbono stockfish',      color: 'from-green-600 to-green-900' },
  { id: 'kwanzaa',    month: 12, day: 26, window: 7,  emoji: '🕯️', title: 'Kwanzaa',               sub: 'Shop for the seven-day celebration',      search: 'yam cassava greens',         color: 'from-red-700 to-gray-900' },
  { id: 'ramadan',    month: 3,  day: 1,  window: 21, emoji: '🌙', title: 'Ramadan Season',        sub: 'Stock up for Iftar & Suhoor',             search: 'dates rice lamb chicken',    color: 'from-purple-600 to-indigo-800' },
  { id: 'african_heritage', month: 2, day: 1, window: 28, emoji: '✊', title: 'African Heritage Month', sub: 'Discover authentic African cuisine', search: '', color: 'from-amber-600 to-orange-700' },
]

/* ── Category emoji map ───────────────────────────────────────────────────── */
const CAT_EMOJI = {
  meat:'🥩',chicken:'🍗',fish:'🐟',seafood:'🦐',vegetable:'🥬',vegetables:'🥬',
  fruit:'🍌',fruits:'🍌',grains:'🌾',grain:'🌾',rice:'🌾',spice:'🌿',spices:'🌿',
  beverages:'🥤',drinks:'🥤',drink:'🥤',dairy:'🥛',snacks:'🍿',snack:'🍿',
  oil:'🫙',oils:'🫙',condiment:'🫙',condiments:'🫙',frozen:'🧊',bread:'🍞',
  beauty:'🧴',household:'🧹',baby:'👶',legumes:'🫘',beans:'🫘',nuts:'🥜',
  yam:'🍠',palm:'🌴',dried:'🫙',
}
const catEmoji = name => {
  if (!name) return '🛒'
  const n = name.toLowerCase()
  for (const [k, v] of Object.entries(CAT_EMOJI)) if (n.includes(k)) return v
  return '🛒'
}

/* ── Location picker bottom sheet ─────────────────────────────────────────── */
function LocationPicker({ onClose }) {
  const { selectedProvince, selectedCity, selectProvince, selectCity, clearLocation } = useLocation()
  const [step, setStep] = useState(selectedProvince ? 'city' : 'province')

  const cities = CITIES_BY_PROVINCE[selectedProvince] || []

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900">Deliver to</p>
            <p className="text-xs text-gray-400 mt-0.5">Filter content by your location</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
          <button onClick={() => { clearLocation(); onClose() }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${!selectedProvince ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}>
            🇨🇦 All Canada
          </button>
          {step === 'province' && PROVINCES.filter(p => p.value).map(p => (
            <button key={p.value} onClick={() => { selectProvince(p.value); setStep('city') }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${selectedProvince === p.value ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
              {p.label}
            </button>
          ))}
          {step === 'city' && (
            <>
              <button onClick={() => setStep('province')} className="text-xs text-primary-600 font-semibold px-4 py-1">← Back to provinces</button>
              <button onClick={() => { selectCity(''); onClose() }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold ${!selectedCity ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                All of {selectedProvince}
              </button>
              {cities.map(c => (
                <button key={c} onClick={() => { selectCity(c); onClose() }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${selectedCity === c ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {c}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Compact chef card for horizontal carousel ────────────────────────────── */
function ChefCard({ chef, onPress }) {
  const img = resolveImg(chef.profile_image || chef.image_url)
  return (
    <button onClick={onPress} className="flex-shrink-0 w-28 active:scale-95 transition-transform">
      <div className="w-28 h-28 rounded-2xl bg-gray-100 overflow-hidden mb-1.5">
        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">👨‍🍳</div>}
      </div>
      <p className="text-[11px] font-semibold text-gray-900 truncate">{chef.chef_name || chef.name || chef.business_name}</p>
      <p className="text-[10px] text-gray-400 truncate">{chef.cuisine_type || 'Chef'}</p>
      {chef.rating > 0 && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] text-gray-400">{parseFloat(chef.rating).toFixed(1)}</span>
        </div>
      )}
    </button>
  )
}

/* ── Section wrapper ──────────────────────────────────────────────────────── */
function Section({ title, onSeeAll, children }) {
  return (
    <div className="pt-4">
      <div className="flex items-center justify-between px-3 mb-2">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-[11px] text-primary-600 font-semibold flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function HomeScreen() {
  const { user } = useAuth()
  const { locationLabel, selectedCity, selectedProvince } = useLocation()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [showLocPicker, setShowLocPicker] = useState(false)

  const [data, setData] = useState({
    newProducts: [], discounted: [], lowStock: [], allProducts: [],
    categories: [], stores: [], promotions: [], chefs: [], occasions: null,
    loading: true,
  })

  const cityParam = selectedCity || (selectedProvince ? undefined : undefined)

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setData(s => ({ ...s, loading: true }))
    try {
      const cityQ = selectedCity || undefined
      const [homeRes, catsRes, storesRes, promosRes, chefsRes, occRes] = await Promise.all([
        api.get('/customer/home-products', { params: { limit: 20, ...(cityQ ? { city: cityQ } : {}) } }),
        api.get('/customer/categories'),
        api.get('/customer/stores/', { params: { limit: 10, ...(cityQ ? { city: cityQ } : {}) } }),
        api.get('/customer/promotions', { params: { limit: 8 } }).catch(() => ({ data: [] })),
        api.get('/customer/chefs', { params: { limit: 10, ...(cityQ ? { city: cityQ } : {}) } }).catch(() => ({ data: [] })),
        api.get('/customer/marketing/occasions').catch(() => ({ data: null })),
      ])
      const hp = homeRes.data || {}
      setData({
        newProducts: hp.new_arrivals?.slice(0, 10) || [],
        discounted:  hp.discounted?.slice(0, 10)  || [],
        lowStock:    hp.low_stock?.slice(0, 6)    || [],
        allProducts: hp.products?.slice(0, 10)    || [],
        categories:  Array.isArray(catsRes.data) ? catsRes.data.slice(0, 20) : [],
        stores:      (Array.isArray(storesRes.data) ? storesRes.data : storesRes.data?.stores || []).slice(0, 8),
        promotions:  Array.isArray(promosRes.data) ? promosRes.data : [],
        chefs:       (Array.isArray(chefsRes.data) ? chefsRes.data : chefsRes.data?.chefs || []).slice(0, 10),
        occasions:   occRes.data || null,
        loading:     false,
      })
    } catch {
      setData(s => ({ ...s, loading: false }))
    }
  }, [selectedCity, selectedProvince])

  useEffect(() => { fetchData() }, [fetchData])

  // Pull-to-refresh
  let startY = 0
  const onTouchStart = e => { startY = e.touches[0].clientY }
  const onTouchEnd   = e => {
    if (e.changedTouches[0].clientY - startY > 70) fetchData(true)
  }

  const activeOccasion = (() => {
    const cfg = data.occasions
    if (cfg?.enabled === false) return null
    const list = (cfg?.occasions?.length ? cfg.occasions : FALLBACK_OCCASIONS).filter(o => o.enabled !== false)
    const now = new Date()
    if (cfg?.force_occasion_id) return list.find(o => o.id === cfg.force_occasion_id) || null
    return list.find(o => {
      const d = new Date(now.getFullYear(), o.month - 1, o.day)
      const diff = (now - d) / 86400000
      return diff >= -3 && diff <= o.window
    }) || null
  })()

  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'there'
  const { loading, categories, stores, chefs, discounted, newProducts, lowStock, allProducts, promotions } = data

  return (
    <div className="h-full flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* ── Header ── */}
      <div className="bg-primary-600 pt-safe flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button onClick={() => setShowLocPicker(true)}
            className="flex items-center gap-1 min-w-0">
            <MapPin className="h-3.5 w-3.5 text-primary-200 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-primary-200 leading-none">Deliver to</p>
              <div className="flex items-center gap-0.5">
                <p className="text-white text-xs font-bold truncate max-w-[140px]">{locationLabel}</p>
                <ChevronDown className="h-3 w-3 text-primary-200 flex-shrink-0" />
              </div>
            </div>
          </button>
          <button className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <Bell className="h-4 w-4 text-white" />
          </button>
        </div>
        {/* Search */}
        <div className="px-3 pb-3">
          <button onClick={() => navigate('/shop')}
            className="w-full h-10 bg-white rounded-xl flex items-center gap-2 px-3 shadow-sm">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 text-sm">Search groceries, stores…</span>
          </button>
        </div>
      </div>

      <div className="flex-1 scroll-content mb-tab">

        {/* ── Categories ── */}
        <div className="pt-3 pb-1">
          <div className="flex gap-2 overflow-x-auto px-3" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => navigate('/shop')}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-full text-xs font-semibold">
              🛒 All
            </button>
            {loading
              ? [1,2,3,4,5,6].map(i => <div key={i} className="flex-shrink-0 h-8 w-20 bg-gray-200 rounded-full animate-pulse" />)
              : categories.map(cat => (
                  <button key={cat.id}
                    onClick={() => navigate(`/shop?category_id=${cat.id}&category_name=${encodeURIComponent(cat.name)}`)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                    <span>{cat.image_url ? '' : catEmoji(cat.name)}</span>
                    {cat.name}
                  </button>
                ))
            }
          </div>
        </div>

        {/* ── Occasion banner ── */}
        {activeOccasion && (
          <div className="px-3 pt-3">
            <button onClick={() => navigate(`/shop?search=${encodeURIComponent(activeOccasion.search || '')}`)}
              className={`w-full h-[90px] rounded-2xl bg-gradient-to-r ${activeOccasion.color} flex items-center gap-3 px-4 shadow-md active:scale-95 transition-transform overflow-hidden relative`}>
              <span className="text-4xl flex-shrink-0">{activeOccasion.emoji}</span>
              <div className="min-w-0 text-left">
                <p className="text-white font-bold text-sm leading-tight">{activeOccasion.title}</p>
                <p className="text-white/75 text-[11px] mt-0.5">{activeOccasion.sub}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/60 flex-shrink-0 ml-auto" />
            </button>
          </div>
        )}

        {/* ── Promos carousel ── */}
        {promotions.length > 0 && (
          <Section title="🎁 Promotions" onSeeAll={() => navigate('/top-deals')}>
            <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
              {promotions.map(p => {
                const img = resolveImg(p.image_url || p.banner_url)
                return (
                  <button key={p.id}
                    onClick={() => navigate(`/shop?search=${encodeURIComponent(p.title || '')}`)}
                    className="flex-shrink-0 w-52 h-[80px] rounded-xl bg-gradient-to-r from-nude-600 to-nude-700 relative overflow-hidden active:scale-95 transition-transform shadow-sm">
                    {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                    <div className="relative p-3 flex flex-col justify-end h-full">
                      <p className="text-white font-bold text-xs leading-tight line-clamp-2">{p.title}</p>
                      {p.discount_value && (
                        <p className="text-white/80 text-[10px]">
                          {p.discount_type === 'percentage' ? `${p.discount_value}% off` : `$${p.discount_value} off`}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {/* ── Today's Deals ── */}
        {(loading || discounted.length > 0) && (
          <Section title="🔥 Today's Deals" onSeeAll={() => navigate('/top-deals?mode=market')}>
            <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
              {loading
                ? [1,2,3,4].map(i => <div key={i} className="flex-shrink-0 w-32"><ProductSkeleton /></div>)
                : discounted.map(p => (
                    <div key={p.id} className="flex-shrink-0 w-32">
                      <ProductCard product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />
                    </div>
                  ))
              }
            </div>
          </Section>
        )}

        {/* ── New Arrivals ── */}
        {(loading || newProducts.length > 0) && (
          <Section title="✨ New Arrivals" onSeeAll={() => navigate('/shop?new_arrivals=true')}>
            <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
              {loading
                ? [1,2,3].map(i => <div key={i} className="flex-shrink-0 w-32"><ProductSkeleton /></div>)
                : newProducts.map(p => (
                    <div key={p.id} className="flex-shrink-0 w-32">
                      <ProductCard product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />
                    </div>
                  ))
              }
            </div>
          </Section>
        )}

        {/* ── Stores ── */}
        <Section title="🏪 Stores" onSeeAll={() => navigate('/stores')}>
          <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
            {loading
              ? [1,2,3].map(i => <div key={i} className="flex-shrink-0 w-40"><StoreSkeleton /></div>)
              : stores.length === 0
                ? <p className="px-1 text-xs text-gray-400 py-2">No stores in this area yet</p>
                : stores.map(s => <div key={s.id} className="flex-shrink-0 w-40"><StoreCard store={s} /></div>)
            }
          </div>
        </Section>

        {/* ── Chefs ── */}
        {(loading || chefs.length > 0) && (
          <Section title="👨‍🍳 Chefs" onSeeAll={() => navigate('/chefs')}>
            <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
              {loading
                ? [1,2,3,4].map(i => <div key={i} className="w-28 h-28 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0" />)
                : chefs.map(c => <ChefCard key={c.id} chef={c} onPress={() => navigate(`/chefs/${c.id}`)} />)
              }
            </div>
          </Section>
        )}

        {/* ── Low stock ── */}
        {lowStock.length > 0 && (
          <Section title="⚡ Grab Fast — Low Stock">
            <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
              {lowStock.map(p => (
                <div key={p.id} className="flex-shrink-0 w-32">
                  <ProductCard product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Browse All ── */}
        {(loading || allProducts.length > 0) && (
          <Section title="🛒 Browse All" onSeeAll={() => navigate('/shop')}>
            <div className="grid grid-cols-3 gap-2 px-3">
              {loading
                ? [1,2,3,4,5,6].map(i => <ProductSkeleton key={i} />)
                : allProducts.map(p => <ProductCard key={p.id} product={p} onPress={() => navigate(`/shop/product/${p.id}`)} />)
              }
            </div>
          </Section>
        )}

        {/* ── Quick Access tiles ── */}
        <div className="px-3 pt-4 grid grid-cols-2 gap-2">
          <button onClick={() => navigate('/meals')}
            className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-3.5 text-left active:scale-95 transition-transform shadow-sm">
            <span className="text-2xl block mb-1.5">🍽️</span>
            <p className="text-white font-bold text-xs">Recipes & Meal Plans</p>
            <p className="text-white/75 text-[10px] mt-0.5">Cook with ease</p>
          </button>
          <button onClick={() => navigate('/top-deals')}
            className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-3.5 text-left active:scale-95 transition-transform shadow-sm">
            <span className="text-2xl block mb-1.5">🏷️</span>
            <p className="text-white font-bold text-xs">Top Deals</p>
            <p className="text-white/75 text-[10px] mt-0.5">Market & Chef offers</p>
          </button>
        </div>

        <div className="h-5" />
      </div>

      {showLocPicker && <LocationPicker onClose={() => setShowLocPicker(false)} />}
    </div>
  )
}
