import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import StarRating from '../components/StarRating'
import { ChefHat, MapPin, DollarSign, Sparkles, TrendingUp, Users, CheckCircle, Heart, Tag, Truck } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { ChefCardSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'

const LIMIT = 12

const Chefs = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [chefs, setChefs] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filters, setFilters] = useState({
    cuisine: searchParams.get('cuisine') || '',
    search: searchParams.get('search') || '',
    min_rating: searchParams.get('min_rating') || '',
    sort: searchParams.get('sort') || 'rating',
    saved_only: searchParams.get('saved_only') === '1'
  })
  const { selectedCity, coordinates } = useLocation()
  const [cuisines, setCuisines] = useState([])
  const [savingId, setSavingId] = useState(null)

  const hasActiveFilters = filters.cuisine || filters.search || filters.min_rating || filters.saved_only

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      cuisine: searchParams.get('cuisine') || '',
      search: searchParams.get('search') || '',
      min_rating: searchParams.get('min_rating') || '',
      sort: searchParams.get('sort') || 'rating',
      saved_only: searchParams.get('saved_only') === '1'
    }))
  }, [searchParams])

  useEffect(() => {
    api.get('/customer/chefs/cuisines', { params: selectedCity && selectedCity !== 'All' ? { city: selectedCity } : {} })
      .then(res => setCuisines(res.data.cuisines || []))
      .catch(() => setCuisines([]))
  }, [selectedCity])

  const fetchChefs = useCallback(async (append = false) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)
    const currentSkip = append ? skip : 0
    try {
      const params = {
        skip: currentSkip,
        limit: LIMIT,
        sort: filters.sort
      }
      if (filters.cuisine) params.cuisine = filters.cuisine
      if (filters.search) params.search = filters.search
      if (filters.min_rating) params.min_rating = parseFloat(filters.min_rating)
      if (selectedCity && selectedCity !== 'All') params.city = selectedCity
      if (filters.saved_only) params.saved_only = true
      if (coordinates?.latitude != null && coordinates?.longitude != null) {
        params.lat = coordinates.latitude
        params.lng = coordinates.longitude
      }
      const response = await api.get('/customer/chefs', { params })
      const chefsData = response.data.chefs || response.data || []
      const newTotal = response.data.total ?? chefsData.length
      setTotal(newTotal)
      if (append) {
        setChefs(prev => {
          const ids = new Set(prev.map(c => c.id))
          const added = chefsData.filter(c => !ids.has(c.id))
          return [...prev, ...added]
        })
        setSkip(currentSkip + chefsData.length)
      } else {
        setChefs(chefsData)
        setSkip(chefsData.length)
      }
    } catch (error) {
      console.error('Failed to fetch chefs:', error)
      if (!append) setChefs([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters, selectedCity, coordinates, skip])

  useEffect(() => {
    fetchChefs(false)
  }, [filters.cuisine, filters.search, filters.min_rating, filters.sort, filters.saved_only, selectedCity, coordinates?.latitude, coordinates?.longitude])

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    const newParams = new URLSearchParams(searchParams)
    if (value !== '' && value !== false) {
      if (key === 'saved_only') newParams.set('saved_only', '1')
      else newParams.set(key, value)
    } else {
      newParams.delete(key)
      if (key === 'saved_only') newParams.delete('saved_only')
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setFilters({ cuisine: '', search: '', min_rating: '', sort: 'rating', saved_only: false })
    setSearchParams({})
  }

  const handleSaveChef = async (e, chefId, isSaved) => {
    e.preventDefault()
    e.stopPropagation()
    setSavingId(chefId)
    try {
      if (isSaved) {
        await api.delete(`/customer/saved-chefs/${chefId}`)
        setChefs(prev => prev.map(c => c.id === chefId ? { ...c, is_saved: false } : c))
      } else {
        await api.post(`/customer/saved-chefs/${chefId}`)
        setChefs(prev => prev.map(c => c.id === chefId ? { ...c, is_saved: true } : c))
      }
    } catch (err) {
      if (err.response?.status === 401) {
        window.location.href = '/login?redirect=' + encodeURIComponent('/chefs')
      }
    } finally {
      setSavingId(null)
    }
  }

  const canLoadMore = !loading && !loadingMore && chefs.length < total

  return (
    <div className="w-full relative">
      <PageBanner
        title="Verified Chefs"
        subtitle="Discover talented chefs specializing in authentic African cuisines"
        placement="chefs_top_banner"
        defaultContent={
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Discover Amazing Chefs</h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Explore talented chefs specializing in authentic African cuisines. Order custom meals and experience authentic flavors!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Featured Chefs</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Top Rated</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Popular Now</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-2">
            <div className="flex-1 min-w-0 w-full sm:min-w-[120px] sm:w-auto">
              <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search chefs..."
                className="w-full px-3 py-2.5 sm:py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 touch-manipulation"
              />
            </div>
            <div className="w-full xs:w-36 sm:w-40">
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuisine</label>
              <select
                value={filters.cuisine}
                onChange={(e) => handleFilterChange('cuisine', e.target.value)}
                className="w-full px-3 py-2.5 sm:py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 touch-manipulation"
              >
                <option value="">All Cuisines</option>
                {cuisines.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Rating</label>
              <select
                value={filters.min_rating}
                onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any</option>
                <option value="4">4+</option>
                <option value="4.5">4.5+</option>
                <option value="5">5</option>
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="rating">Top Rated</option>
                <option value="reviews">Most Reviews</option>
                <option value="min_order">Min Order $</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.saved_only}
                onChange={(e) => handleFilterChange('saved_only', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Saved only</span>
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          {!loading && (
            <p className="text-xs text-gray-500">
              {total} {total === 1 ? 'chef' : 'chefs'}
              {coordinates?.latitude != null && ' · Distance shown when set'}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ChefCardSkeleton key={i} />
            ))}
          </div>
        ) : chefs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-1 text-base">
              {hasActiveFilters ? 'No chefs match your filters.' : "No verified chefs available yet — but we're cooking up something great! 👨‍🍳"}
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 mt-2">
                Clear filters
              </button>
            ) : (
              <button onClick={() => fetchChefs(false)} className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 mt-2">
                Refresh
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {chefs.map((chef) => (
                <Link
                  key={chef.id}
                  to={`/chefs/${chef.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg active:scale-[0.99] transition-all duration-300 overflow-hidden group relative block min-h-[280px] sm:min-h-0"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                    {chef.profile_image_url ? (
                      <img
                        src={resolveImageUrl(chef.profile_image_url)}
                        alt={chef.chef_name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="h-12 w-12 text-primary-600" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </span>
                      {chef.is_available !== false && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                          Accepting orders
                        </span>
                      )}
                      {chef.has_promotion && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
                          <Tag className="h-3 w-3" /> Deal
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleSaveChef(e, chef.id, chef.is_saved)}
                      disabled={savingId === chef.id}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow hover:bg-white"
                      aria-label={chef.is_saved ? 'Unsave' : 'Save chef'}
                    >
                      <Heart className={`h-5 w-5 ${chef.is_saved ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                    </button>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1.5 line-clamp-2">{chef.chef_name}</h3>
                    {chef.average_rating > 0 && (
                      <div className="flex items-center space-x-1 mb-2">
                        <StarRating rating={chef.average_rating} totalReviews={chef.total_reviews} size="sm" />
                      </div>
                    )}
                    {chef.featured_cuisine_name && (
                      <p className="text-xs text-primary-600 font-medium line-clamp-1 mb-2">{chef.featured_cuisine_name}</p>
                    )}
                    {chef.cuisines?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {chef.cuisines.slice(0, 3).map((c, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">{c}</span>
                        ))}
                        {chef.cuisines.length > 3 && <span className="text-xs text-gray-500">+{chef.cuisines.length - 3}</span>}
                      </div>
                    )}
                    <div className="flex items-center text-gray-600 text-sm mb-1">
                      <MapPin className="h-4 w-4 mr-1 text-primary-600 flex-shrink-0" />
                      <span>{[chef.city, chef.state].filter(Boolean).join(', ') || '—'}</span>
                    </div>
                    {chef.distance_km != null && (
                      <div className="flex items-center text-xs text-gray-500 mb-1">
                        <Truck className="h-3.5 w-3 mr-1" />
                        {chef.distance_km} km away · Delivers to you
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                      {chef.service_radius_km && <span>{chef.service_radius_km}km radius</span>}
                      {chef.minimum_order_amount > 0 && (
                        <span className="font-semibold flex items-center gap-0.5">
                          <DollarSign className="h-4 w-4 text-primary-600" />${Number(chef.minimum_order_amount).toFixed(0)} min
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {canLoadMore && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => fetchChefs(true)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                >
                  {loadingMore ? 'Loading...' : `Load more (${chefs.length} of ${total})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Chefs
