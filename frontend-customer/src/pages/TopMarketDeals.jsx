import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { ShoppingCart, Eye, Heart, Zap, Filter, Package, Sparkles, TrendingUp, Users, Search, Grid3x3, List, SlidersHorizontal, MapPin, Clock, Wand2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useLocation } from '../contexts/LocationContext'
import { getCitiesForProvince } from '../constants/canadaLocations'
import QuickViewModal from '../components/QuickViewModal'
import StarRating from '../components/StarRating'
import PageBanner from '../components/PageBanner'
import ProductBadges from '../components/ProductBadges'
import CategoryBadge from '../components/CategoryBadge'
import { resolveImageUrl } from '../utils/imageUtils'
import { ProductGridSkeleton } from '../components/SkeletonLoader'

const TopMarketDeals = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const { productFavorites: favorites, toggleProductFavorite: toggleFavorite } = useFavorites()
  const [sortBy, setSortBy] = useState('discount') // discount, price-low, price-high
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [offerTypeFilter, setOfferTypeFilter] = useState('') // Filter by special offer type
  const [allOfferTypes, setAllOfferTypes] = useState([]) // All available offer types
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [minRating, setMinRating] = useState('')
  const { addToCart } = useCart()

  // AI meal ideas from deals
  const [aiIdea, setAiIdea] = useState(null)
  const [aiIdeaLoading, setAiIdeaLoading] = useState(false)
  const [aiIdeaOpen, setAiIdeaOpen] = useState(true)
  const [aiIdeaDealIds, setAiIdeaDealIds] = useState([])
  const [aiIdeaAdded, setAiIdeaAdded] = useState(false)
  const { selectedCity, selectedProvince } = useLocation()
  const provinceCities = selectedProvince && selectedCity === 'All' ? getCitiesForProvince(selectedProvince) : null
  const effectiveCity = selectedProvince && selectedCity === 'All' ? null : selectedCity

  useEffect(() => {
    fetchCategories()
  }, [selectedCity])

  useEffect(() => {
    fetchDeals()
  }, [selectedCity, selectedProvince, sortBy, searchQuery, categoryFilter, offerTypeFilter, priceMin, priceMax, minRating])

  const fetchCategories = async () => {
    try {
      const params = effectiveCity && effectiveCity !== 'All' ? { city: effectiveCity } : {}
      const response = await api.get('/customer/categories', { params })
      const categoriesData = Array.isArray(response.data) ? response.data : (response.data?.categories || [])
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      setCategories([])
    }
  }

  const clearAllFilters = () => {
    setCategoryFilter('')
    setSearchQuery('')
    setSortBy('discount')
    setOfferTypeFilter('')
    setPriceMin('')
    setPriceMax('')
    setMinRating('')
  }

  const fetchDeals = async () => {
    setLoading(true)
    try {
      if (effectiveCity && effectiveCity !== 'All') {
        const storesRes = await api.get('/customer/stores/', { params: { city: effectiveCity } })
        const storesList = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || storesRes.data || [])
        if (storesList.length === 0) {
          setProducts([])
          setLoading(false)
          return
        }
      }
      if (provinceCities && provinceCities.length > 0) {
        const storesRes = await api.get('/customer/stores/')
        const allStores = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || storesRes.data || [])
        const provinceCitySet = new Set(provinceCities.map(c => c.trim().toLowerCase()))
        const inProvince = allStores.filter(s => s && s.city && provinceCitySet.has(String(s.city).trim().toLowerCase()))
        if (inProvince.length === 0) {
          setProducts([])
          setLoading(false)
          return
        }
      }
      const params = { 
        discounted: true,
        limit: 100,
        ...(effectiveCity && effectiveCity !== 'All' ? { city: effectiveCity } : {})
      }
      if (categoryFilter) {
        params.category_id = categoryFilter
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      
      const response = await api.get('/customer/products', { params })
      const allProducts = response.data.products || []
      
      // Extract unique offer types from products
      const offerTypesSet = new Set()
      allProducts.forEach(p => {
        if (p.promotions && p.promotions.length > 0) {
          p.promotions.forEach(promo => {
            if (promo.name) {
              offerTypesSet.add(promo.name)
            }
          })
        }
      })
      setAllOfferTypes(Array.from(offerTypesSet).sort())

      // Filter to only products with active promotions or discounts
      let deals = allProducts.filter(p => {
        if (p.promotions && p.promotions.length > 0) return true
        if (p.compare_at_price && p.compare_at_price > p.price) return true
        return false
      })

      // Filter by offer type if selected
      if (offerTypeFilter) {
        deals = deals.filter(p => {
          if (p.promotions && p.promotions.length > 0) {
            return p.promotions.some(promo => promo.name === offerTypeFilter)
          }
          return false
        })
      }

      // Price and rating filters (client-side)
      if (priceMin !== '') {
        const min = parseFloat(priceMin)
        if (!isNaN(min)) deals = deals.filter(p => Number(p.price) >= min)
      }
      if (priceMax !== '') {
        const max = parseFloat(priceMax)
        if (!isNaN(max)) deals = deals.filter(p => Number(p.price) <= max)
      }
      if (minRating !== '') {
        const rating = parseFloat(minRating)
        if (!isNaN(rating)) deals = deals.filter(p => (p.average_rating ?? 0) >= rating)
      }

      // Sort products
      let sorted = [...deals]
      if (sortBy === 'discount') {
        sorted.sort((a, b) => {
          const discountA = getDiscountPercentage(a)
          const discountB = getDiscountPercentage(b)
          return discountB - discountA
        })
      } else if (sortBy === 'price-low') {
        sorted.sort((a, b) => a.price - b.price)
      } else if (sortBy === 'price-high') {
        sorted.sort((a, b) => b.price - a.price)
      }

      setProducts(sorted)
      // Generate AI meal idea from the top deals (non-blocking)
      if (sorted.length > 0 && !aiIdea) {
        generateDealMealIdea(sorted)
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const generateDealMealIdea = async (deals) => {
    if (!deals?.length || aiIdeaLoading) return
    setAiIdeaLoading(true)
    try {
      const top = deals.slice(0, 8)
      const names = top.map(p => p.name).join(', ')
      const res = await api.post('/ai/chat', {
        message: `Today's grocery deals include: ${names}. Suggest one simple, delicious meal I can make using some of these — keep it to 2-3 sentences and name which deal products to use.`,
        conversation_history: [],
      })
      setAiIdea(res.data.response || '')
      // Highlight deal products the AI mentioned by name
      const mentioned = top.filter(p =>
        res.data.response?.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())
      )
      setAiIdeaDealIds(mentioned.map(p => p.id))
    } catch {}
    setAiIdeaLoading(false)
  }

  const getDiscountPercentage = (product) => {
    if (product.promotions && product.promotions.length > 0 && product.promotions[0]) {
      const promo = product.promotions[0]
      if (promo.discount_type === 'percentage' && promo.discount_value) {
        return Number(promo.discount_value)
      }
    }
    if (product.compare_at_price && product.compare_at_price > product.price) {
      return Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    }
    return 0
  }

  const getDiscountBadge = (product) => {
    if (product.promotions && product.promotions.length > 0 && product.promotions[0]) {
      const promo = product.promotions[0]
      if (promo.discount_type === 'percentage' && promo.discount_value) {
        return `${Math.round(Number(promo.discount_value))}% OFF`
      } else if (promo.discount_type === 'fixed_amount' && promo.discount_value) {
        return `$${Number(promo.discount_value).toFixed(0)} OFF`
      }
    }
    if (product.compare_at_price && product.compare_at_price > product.price) {
      const discount = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      return `${discount}% OFF`
    }
    return null
  }

  const getSavingsAmount = (product) => {
    if (product.compare_at_price && product.compare_at_price > product.price) {
      return (Number(product.compare_at_price) - Number(product.price)).toFixed(2)
    }
    if (product.promotions && product.promotions.length > 0 && product.promotions[0]) {
      const promo = product.promotions[0]
      if (promo.discount_type === 'fixed_amount' && promo.discount_value) {
        return Number(promo.discount_value).toFixed(2)
      } else if (promo.discount_type === 'percentage' && promo.discount_value && product.compare_at_price) {
        return ((Number(product.compare_at_price) * Number(promo.discount_value)) / 100).toFixed(2)
      } else if (promo.discount_type === 'percentage' && promo.discount_value) {
        // Calculate from current price if compare_at_price not available
        const originalPrice = Number(product.price) / (1 - Number(promo.discount_value) / 100)
        return (originalPrice - Number(product.price)).toFixed(2)
      }
    }
    return null
  }

  const getEndingSoon = (product) => {
    const endDate = product.promotions?.[0]?.end_date
    if (!endDate) return null
    const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Ends today'
    if (days === 1) return 'Ends tomorrow'
    if (days <= 7) return `Ends in ${days} days`
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white relative">
        <PageBanner
          title="Top Market Deals"
          subtitle="Explore amazing deals on authentic African groceries and ingredients. Fresh, quality products delivered to your door!"
          placement="top_market_deals_top_banner"
          variant="orange"
        />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
          <ProductGridSkeleton count={10} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative">
      <PageBanner
        title="Top Market Deals"
        subtitle="Explore amazing deals on authentic African groceries and ingredients. Fresh, quality products delivered to your door!"
        placement="top_market_deals_top_banner"
        variant="orange"
        defaultContent={
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-4 mb-3">
              <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Top Market Deals</h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Explore amazing deals on authentic African groceries and ingredients. Fresh, quality products delivered to your door!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Featured Items</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Top Deals</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Popular Now</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">

        {/* AI Meal Idea from Deals */}
        {(aiIdea || aiIdeaLoading) && (
          <div className="mb-5 bg-gradient-to-br from-orange-50 via-white to-amber-50 border border-orange-100 rounded-2xl shadow-sm overflow-hidden">
            <button onClick={() => setAiIdeaOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wand2 className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">AI Meal Idea</p>
                  <p className="text-xs text-gray-500">What you can cook with today's deals</p>
                </div>
              </div>
              {aiIdeaOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {aiIdeaOpen && (
              <div className="px-4 pb-4">
                {aiIdeaLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                    Analysing today's deals for meal ideas…
                  </div>
                ) : aiIdea ? (
                  <>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">{aiIdea}</p>
                    {aiIdeaDealIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {products.filter(p => aiIdeaDealIds.includes(p.id)).map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 bg-white border border-orange-100 rounded-full px-2.5 py-1 shadow-sm">
                            {p.image_url && <img src={resolveImageUrl(p.image_url)} alt="" className="w-5 h-5 rounded-full object-cover" />}
                            <span className="text-xs font-semibold text-gray-700 max-w-[120px] truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {aiIdeaDealIds.length > 0 && (
                        <button
                          onClick={async () => {
                            for (const p of products.filter(p => aiIdeaDealIds.includes(p.id))) {
                              try { await addToCart({ ...p, quantity: 1 }) } catch {}
                            }
                            setAiIdeaAdded(true)
                            setTimeout(() => setAiIdeaAdded(false), 2000)
                          }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                            aiIdeaAdded ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}>
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {aiIdeaAdded ? 'Added!' : 'Add these deals to cart'}
                        </button>
                      )}
                      <button onClick={() => { setAiIdea(null); setAiIdeaDealIds([]); generateDealMealIdea(products) }}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:border-orange-300 hover:text-orange-600 transition-colors">
                        <RefreshCw className="h-3 w-3" /> New idea
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Back to Groceries + Location */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Link to="/groceries" className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1">
            <Package className="h-4 w-4" />
            See all groceries
          </Link>
          {effectiveCity && effectiveCity !== 'All' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-orange-500" />
              <span>Deals in <span className="font-semibold text-gray-900">{effectiveCity}</span></span>
            </div>
          )}
        </div>

        {/* Deal count + Save up to */}
        {products.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
            <span><span className="font-bold text-gray-900">{products.length}</span> deals this week</span>
            {(() => {
              const maxSave = Math.max(...products.map((p) => parseFloat(getSavingsAmount(p) || '0')))
              return maxSave > 0 ? <span>Save up to <span className="font-bold text-orange-600">${maxSave.toFixed(2)}</span></span> : null
            })()}
          </div>
        )}

        {/* Biggest savings strip */}
        {products.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Biggest savings
            </h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {products.slice(0, 6).map((p) => {
                const badge = getDiscountBadge(p)
                const endingSoon = getEndingSoon(p)
                return (
                  <Link key={p.id} to={`/products/${p.id}`} className="flex-shrink-0 w-36 sm:w-40 group">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {p.image_url && (
                        <img src={resolveImageUrl(p.image_url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                      <div className="absolute top-1.5 right-1.5 z-10 flex flex-col gap-1 items-end">
                        {endingSoon && (
                          <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{endingSoon}</span>
                        )}
                        {badge && (
                          <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1 line-clamp-2">{p.name}</p>
                    <p className="text-sm font-bold text-primary-600">${Number(p.price).toFixed(2)}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Results Count and View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {products.length > 0 ? (
              <span>
                Showing <span className="font-semibold text-gray-900">{products.length}</span> deals
              </span>
            ) : (
              <span>No deals found</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

      {/* Search and Filter Bar */}
      <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
        {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

        {/* Filters Row - single row on mobile, wraps on larger screens */}
        <div className="flex items-center gap-3 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 sm:pb-0">
            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-shrink-0"
              type="button"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Category Filter */}
            {categories.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
                <Filter className="h-4 w-4 text-gray-600" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>
                      {cat.name || cat.category_name || 'Unnamed Category'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Special Offer Type Filter */}
            {allOfferTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-600">Offer:</span>
                <select
                  value={offerTypeFilter}
                  onChange={(e) => setOfferTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="">All Offers</option>
                  {allOfferTypes.map((offerType) => (
                    <option key={offerType} value={offerType}>
                      {offerType}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="discount">Biggest Discount</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            {/* Clear Filters */}
          {(categoryFilter || searchQuery || sortBy !== 'discount' || offerTypeFilter || priceMin || priceMax || minRating) && (
              <button
                onClick={clearAllFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                type="button"
              >
                Clear All
              </button>
            )}
          </div>

        {/* Quick Category Filters - horizontal scroll on mobile */}
          {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-2 sm:mb-3 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
            <span className="text-xs text-gray-600 font-medium flex-shrink-0 hidden sm:inline">Quick filters:</span>
            <span className="text-xs text-gray-600 font-medium flex-shrink-0 sm:hidden">Quick:</span>
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat.id || cat.category_id}
                  onClick={() => setCategoryFilter(categoryFilter === (cat.id || cat.category_id) ? '' : (cat.id || cat.category_id))}
                className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                    categoryFilter === (cat.id || cat.category_id)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  type="button"
                >
                  {cat.name || cat.category_name}
                </button>
              ))}
            </div>
          )}

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Any"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Any</option>
                    <option value="4">4+ stars</option>
                    <option value="3">3+ stars</option>
                    <option value="2">2+ stars</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">No deals available right now</h2>
            <p className="text-sm text-gray-600 mb-4">Check back soon for amazing discounts on authentic African products!</p>
            <Link
              to="/groceries"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              Browse All Groceries
            </Link>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6"
            : "space-y-4"
          }>
            {products.map((product) => {
              const badge = getDiscountBadge(product)
              const savingsAmount = getSavingsAmount(product)
              const endingSoon = getEndingSoon(product)
              const isFavorite = favorites.has(product.id)

              // List View
              if (viewMode === 'list') {
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden group relative w-full">
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      <Link to={`/products/${product.id}`} className="flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={resolveImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                        <ProductBadges product={product} />
                        <div className="absolute top-1.5 right-1.5 z-10 flex flex-col gap-1 items-end">
                          {endingSoon && (
                            <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {endingSoon}
                            </span>
                          )}
                          {badge && (
                            <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                              <Zap className="h-2.5 w-2.5 fill-white" />
                              {badge}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <Link to={`/products/${product.id}`}>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-1">
                                  {product.name}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 mb-2">
                                {product.category && (
                                  <CategoryBadge category={product.category} size="sm" />
                                )}
                                {product.vendor?.business_name && (
                                  <p className="text-xs text-gray-500">
                                    {product.vendor.business_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFavorite(product.id)
                              }}
                              className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all"
                              type="button"
                              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Heart 
                                className={`h-5 w-5 transition-all ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'}`} 
                              />
                            </button>
                          </div>
                          <div className="mb-2">
                            <StarRating 
                              rating={product.average_rating || 0} 
                              totalReviews={product.total_reviews || 0}
                              size="sm"
                            />
                          </div>
                          <div className="mb-3">
                            {(product.promotions && product.promotions.length > 0) || (product.compare_at_price && product.compare_at_price > product.price) ? (
                              <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-green-600">
                                  ${product.price.toFixed(2)}
                                </p>
                                {product.compare_at_price && product.compare_at_price > product.price && (
                                  <p className="text-sm text-gray-400 line-through">
                                    ${product.compare_at_price.toFixed(2)}
                                  </p>
                                )}
                                {savingsAmount && (
                                  <p className="text-xs font-semibold text-orange-600">
                                    Save ${savingsAmount}
                                  </p>
                                )}
                                {product.promotions && product.promotions.length > 0 && product.promotions[0]?.name && (
                                  <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded">
                                    {String(product.promotions[0].name).trim()}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-xl font-bold text-gray-900">
                                ${product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setQuickViewProduct(product)
                            }}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all flex items-center gap-2"
                            type="button"
                            title="Quick View"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">Quick View</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              addToCart(product, 1)
                            }}
                            disabled={product.stock_quantity === 0}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            type="button"
                            title="Add to Cart"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="text-sm">Add to Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {product.stock_quantity === 0 && (
                      <div className="px-4 pb-2">
                        <p className="text-xs text-red-600 text-center">Out of Stock</p>
                      </div>
                    )}
                  </div>
                )
              }

              // Grid View
              return (
                <div key={product.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group relative w-full">
                  <Link to={`/products/${product.id}`}>
                    <div className="relative aspect-square bg-gray-100 rounded-t-xl overflow-hidden">
                      {product.image_url ? (
                        <>
                          <img
                            src={resolveImageUrl(product.image_url)}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              console.error('[TopMarketDeals] Image failed to load:', product.image_url)
                              e.target.style.display = 'none'
                              const fallback = e.target.parentElement.querySelector('.image-fallback')
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                          <div className="image-fallback absolute inset-0 w-full h-full flex items-center justify-center text-gray-400 text-[10px] hidden">
                            No Image
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                          No Image
                        </div>
                      )}
                      <ProductBadges product={product} />
                      <div className="absolute top-1.5 right-1.5 z-10 flex flex-col gap-1 items-end">
                        {endingSoon && (
                          <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {endingSoon}
                          </span>
                        )}
                        {badge && (
                          <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5 fill-white" />
                            {badge}
                          </span>
                        )}
                      </div>
                      {/* Favorite Heart - Bottom Right */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(product.id)
                        }}
                        className="absolute bottom-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all z-20"
                        type="button"
                        title={favorites.has(product.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart 
                          className={`h-4 w-4 transition-all ${favorites.has(product.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'}`} 
                        />
                      </button>
                    </div>
                    <div className="px-1.5 pb-1.5 pt-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 min-h-[2rem] group-hover:text-orange-600 transition-colors leading-tight">
                            {product.name}
                          </h3>
                          {product.category && (
                            <div className="mt-1">
                              <CategoryBadge category={product.category} size="sm" />
                            </div>
                          )}
                        </div>
                        {product.vendor?.business_name && (
                          <p className="text-[9px] text-gray-500 font-medium whitespace-nowrap flex-shrink-0 mt-0.5">
                            {product.vendor.business_name}
                          </p>
                        )}
                      </div>
                      <div className="mb-1">
                      {/* Show discounted price in green if there's a discount, otherwise black */}
                      {(product.promotions && product.promotions.length > 0) || (product.compare_at_price && product.compare_at_price > product.price) ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-baseline gap-1">
                            <p className="text-base font-bold text-green-600">
                              ${product.price.toFixed(2)}
                            </p>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <p className="text-[10px] text-gray-400 line-through">
                                ${product.compare_at_price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            {savingsAmount && (
                              <p className="text-xs font-semibold text-orange-600">
                                Save ${savingsAmount}
                              </p>
                            )}
                            {product.promotions && product.promotions.length > 0 && product.promotions[0] && product.promotions[0].name && (
                              <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded">
                                {String(product.promotions[0].name).trim()}
                              </span>
                            )}
                          </div>
                        </div>
                          ) : (
                            <p className="text-base font-bold text-gray-900">
                              ${product.price.toFixed(2)}
                            </p>
                          )}
                      </div>
                      {/* Star Rating */}
                      <div className="px-1.5 mb-1">
                        <StarRating 
                          rating={product.average_rating} 
                          totalReviews={product.total_reviews || 0}
                          size="sm"
                        />
                      </div>
                    </div>
                  </Link>
                  <div className="px-1.5 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setQuickViewProduct(product)
                        }}
                        className="flex-1 p-1.5 border-2 border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all"
                        type="button"
                        title="Quick View"
                      >
                        <Eye className="h-4 w-4 text-gray-600 mx-auto" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          addToCart(product, 1)
                        }}
                        disabled={product.stock_quantity === 0}
                        className="flex-1 p-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        type="button"
                        title="Add to Cart"
                      >
                        <ShoppingCart className="h-4 w-4 mx-auto" />
                      </button>
                    </div>
                    {product.stock_quantity === 0 && (
                      <p className="text-[10px] text-red-600 mt-0.5 text-center">Out of Stock</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  )
}

export default TopMarketDeals

