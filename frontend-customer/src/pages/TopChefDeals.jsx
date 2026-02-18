import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Eye, Heart, Zap, Filter, ChefHat, Sparkles, TrendingUp, Users, Search, Grid3x3, List, SlidersHorizontal } from 'lucide-react'
import { useLocation } from '../contexts/LocationContext'
import StarRating from '../components/StarRating'
import PageBanner from '../components/PageBanner'
import { resolveImageUrl } from '../utils/imageUtils'
import { ProductGridSkeleton } from '../components/SkeletonLoader'

const TopChefDeals = () => {
  const [cuisines, setCuisines] = useState([])
  const [cuisineTypes, setCuisineTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState(new Set())
  const [sortBy, setSortBy] = useState('discount')
  const [searchQuery, setSearchQuery] = useState('')
  const [cuisineTypeFilter, setCuisineTypeFilter] = useState('')
  const [offerTypeFilter, setOfferTypeFilter] = useState('')
  const [allOfferTypes, setAllOfferTypes] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const { selectedCity } = useLocation()

  useEffect(() => {
    loadFavorites()
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [selectedCity, sortBy, searchQuery, cuisineTypeFilter, offerTypeFilter])

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('favorites_chef_cuisines')
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)))
      } catch (e) {
        console.error('Failed to load favorites:', e)
      }
    }
  }

  const toggleFavorite = (cuisineId) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(cuisineId)) {
      newFavorites.delete(cuisineId)
    } else {
      newFavorites.add(cuisineId)
    }
    setFavorites(newFavorites)
    localStorage.setItem('favorites_chef_cuisines', JSON.stringify(Array.from(newFavorites)))
  }

  const clearAllFilters = () => {
    setCuisineTypeFilter('')
    setSearchQuery('')
    setSortBy('discount')
    setOfferTypeFilter('')
  }

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const params = {
        limit: 100,
        ...(selectedCity && selectedCity !== 'All' ? { city: selectedCity } : {})
      }
      if (cuisineTypeFilter) params.cuisine_type = cuisineTypeFilter
      if (searchQuery) params.search = searchQuery

      const response = await api.get('/customer/chef-cuisines-deals', { params })
      let allCuisines = response.data.cuisines || []

      const typesSet = new Set()
      const offersSet = new Set()
      allCuisines.forEach((c) => {
        if (c.cuisine_type) typesSet.add(c.cuisine_type)
        if (c.promotions?.length) {
          c.promotions.forEach((p) => p.name && offersSet.add(p.name))
        }
      })
      setCuisineTypes(Array.from(typesSet).sort())
      setAllOfferTypes(Array.from(offersSet).sort())

      if (offerTypeFilter) {
        allCuisines = allCuisines.filter((c) =>
          c.promotions?.some((p) => p.name === offerTypeFilter)
        )
      }

      let sorted = [...allCuisines]
      if (sortBy === 'discount') {
        sorted.sort((a, b) => {
          const saveA = (a.price || 0) - (a.discounted_price || a.price || 0)
          const saveB = (b.price || 0) - (b.discounted_price || b.price || 0)
          return saveB - saveA
        })
      } else if (sortBy === 'price-low') {
        sorted.sort((a, b) => (a.discounted_price || a.price || 0) - (b.discounted_price || b.price || 0))
      } else if (sortBy === 'price-high') {
        sorted.sort((a, b) => (b.discounted_price || b.price || 0) - (a.discounted_price || a.price || 0))
      }

      setCuisines(sorted)
    } catch (error) {
      console.error('Failed to fetch chef deals:', error)
      setCuisines([])
    } finally {
      setLoading(false)
    }
  }

  const getDiscountBadge = (cuisine) => {
    if (cuisine.promotions?.length > 0 && cuisine.promotions[0]) {
      const promo = cuisine.promotions[0]
      if (promo.discount_type === 'percentage' && promo.discount_value) {
        return `${Math.round(Number(promo.discount_value))}% OFF`
      }
      if (promo.discount_type === 'fixed_amount' && promo.discount_value) {
        return `$${Number(promo.discount_value).toFixed(0)} OFF`
      }
    }
    return null
  }

  const getSavingsAmount = (cuisine) => {
    const price = cuisine.price || 0
    const discounted = cuisine.discounted_price ?? price
    if (price > discounted) return (price - discounted).toFixed(2)
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white relative">
        <PageBanner
          title="Top Chef Deals"
          subtitle="Discover amazing deals from talented chefs. Authentic African meals prepared just for you!"
          placement="top_chef_deals_top_banner"
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
        title="Top Chef Deals"
        subtitle="Discover amazing deals from talented chefs. Authentic African meals prepared just for you!"
        placement="top_chef_deals_top_banner"
        variant="orange"
        defaultContent={
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-4 mb-3">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Top Chef Deals</h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Discover amazing deals from talented chefs. Authentic African meals prepared just for you!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Chef Specials</span>
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
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {cuisines.length > 0 ? (
              <span>Showing <span className="font-semibold text-gray-900">{cuisines.length}</span> deals</span>
            ) : (
              <span>No deals found</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Grid View"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chef deals..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 sm:pb-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-shrink-0"
              type="button"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {cuisineTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Filter className="h-4 w-4 text-gray-600" />
                <select
                  value={cuisineTypeFilter}
                  onChange={(e) => setCuisineTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="">All Cuisine Types</option>
                  {cuisineTypes.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
            )}

            {allOfferTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-600">Offer:</span>
                <select
                  value={offerTypeFilter}
                  onChange={(e) => setOfferTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="">All Offers</option>
                  {allOfferTypes.map((ot) => (
                    <option key={ot} value={ot}>{ot}</option>
                  ))}
                </select>
              </div>
            )}

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

            {(cuisineTypeFilter || searchQuery || sortBy !== 'discount') && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                type="button"
              >
                Clear All
              </button>
            )}
          </div>

          {cuisineTypes.length > 0 && (
            <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
              <span className="text-xs text-gray-600 font-medium flex-shrink-0 hidden sm:inline">Quick filters:</span>
              {cuisineTypes.slice(0, 6).map((ct) => (
                <button
                  key={ct}
                  onClick={() => setCuisineTypeFilter(cuisineTypeFilter === ct ? '' : ct)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                    cuisineTypeFilter === ct ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  type="button"
                >
                  {ct}
                </button>
              ))}
            </div>
          )}

          {showFilters && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Advanced Filters</h3>
              <p className="text-sm text-gray-600">Additional filters coming soon...</p>
            </div>
          )}
        </div>

        {cuisines.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">No chef deals available right now</h2>
            <p className="text-sm text-gray-600 mb-4">Check back soon for amazing discounts from our talented chefs!</p>
            <Link
              to="/chefs"
              className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              Browse All Chefs
            </Link>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6' : 'space-y-4'}>
            {cuisines.map((cuisine) => {
              const badge = getDiscountBadge(cuisine)
              const savingsAmount = getSavingsAmount(cuisine)
              const isFavorite = favorites.has(cuisine.id)

              if (viewMode === 'list') {
                return (
                  <div key={cuisine.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-all overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      <Link to={`/chefs/${cuisine.chef_id}`} className="relative flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                        {cuisine.image_url ? (
                          <img
                            src={resolveImageUrl(cuisine.image_url)}
                            alt={cuisine.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ChefHat className="h-8 w-8" />
                          </div>
                        )}
                        {badge && (
                          <div className="absolute top-1.5 right-1.5 z-10">
                            <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                              <Zap className="h-2.5 w-2.5 fill-white" />
                              {badge}
                            </span>
                          </div>
                        )}
                      </Link>
                      <div className="flex-1">
                        <Link to={`/chefs/${cuisine.chef_id}`}>
                          <h3 className="text-lg font-bold text-gray-900 hover:text-orange-600 transition-colors mb-1">{cuisine.name}</h3>
                        </Link>
                        <p className="text-xs text-gray-500 mb-2">by {cuisine.chef_name}</p>
                        {cuisine.cuisine_type && (
                          <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded mb-2">{cuisine.cuisine_type}</span>
                        )}
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-bold text-green-600">${(cuisine.discounted_price ?? cuisine.price).toFixed(2)}</p>
                          {cuisine.price > (cuisine.discounted_price ?? cuisine.price) && (
                            <p className="text-sm text-gray-400 line-through">${cuisine.price.toFixed(2)}</p>
                          )}
                          {savingsAmount && <p className="text-xs font-semibold text-orange-600">Save ${savingsAmount}</p>}
                        </div>
                        <div className="mt-2">
                          <StarRating rating={cuisine.average_rating || 0} totalReviews={cuisine.total_reviews || 0} size="sm" />
                        </div>
                        <Link
                          to={`/chefs/${cuisine.chef_id}`}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                        >
                          View Chef & Order
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                      <button
                        onClick={() => toggleFavorite(cuisine.id)}
                        className="p-2 bg-white/90 rounded-full shadow hover:shadow-lg self-start"
                        type="button"
                      >
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={cuisine.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all overflow-hidden group relative">
                  <Link to={`/chefs/${cuisine.chef_id}`}>
                    <div className="relative aspect-square bg-gray-100 rounded-t-xl overflow-hidden">
                      {cuisine.image_url ? (
                        <img
                          src={resolveImageUrl(cuisine.image_url)}
                          alt={cuisine.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ChefHat className="h-12 w-12" />
                        </div>
                      )}
                      {badge && (
                        <div className="absolute top-1.5 right-1.5 z-10">
                          <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5 fill-white" />
                            {badge}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); toggleFavorite(cuisine.id) }}
                        className="absolute bottom-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg z-20"
                        type="button"
                      >
                        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      </button>
                    </div>
                    <div className="px-1.5 pb-1.5 pt-1">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 min-h-[2rem] group-hover:text-orange-600 transition-colors">{cuisine.name}</h3>
                      <p className="text-[9px] text-gray-500 mt-0.5">by {cuisine.chef_name}</p>
                      {cuisine.cuisine_type && (
                        <span className="inline-block px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded mt-1">{cuisine.cuisine_type}</span>
                      )}
                      <div className="mt-1 flex items-baseline gap-1">
                        <p className="text-base font-bold text-green-600">${(cuisine.discounted_price ?? cuisine.price).toFixed(2)}</p>
                        {cuisine.price > (cuisine.discounted_price ?? cuisine.price) && (
                          <p className="text-[10px] text-gray-400 line-through">${cuisine.price.toFixed(2)}</p>
                        )}
                      </div>
                      {savingsAmount && <p className="text-xs font-semibold text-orange-600">Save ${savingsAmount}</p>}
                      <div className="mt-1">
                        <StarRating rating={cuisine.average_rating || 0} totalReviews={cuisine.total_reviews || 0} size="sm" />
                      </div>
                    </div>
                  </Link>
                  <div className="px-1.5 pb-1.5">
                    <Link
                      to={`/chefs/${cuisine.chef_id}`}
                      className="block w-full p-1.5 text-center bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                    >
                      View Chef & Order
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default TopChefDeals
