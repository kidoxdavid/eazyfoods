import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import StarRating from '../components/StarRating'
import { ChefHat, MapPin, Clock, DollarSign, Sparkles, TrendingUp, Users } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { ChefCardSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'

const Chefs = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [chefs, setChefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    cuisine: searchParams.get('cuisine') || '',
    search: searchParams.get('search') || '',
    min_rating: searchParams.get('min_rating') || ''
  })
  const { selectedCity } = useLocation()
  const [cuisines, setCuisines] = useState([])

  useEffect(() => {
    fetchChefs()
  }, [filters, selectedCity])

  useEffect(() => {
    extractCuisines()
  }, [chefs])

  const extractCuisines = () => {
    // Extract unique cuisines from chefs
    const uniqueCuisines = new Set()
    chefs.forEach(chef => {
      chef.cuisines?.forEach(cuisine => uniqueCuisines.add(cuisine))
    })
    setCuisines(Array.from(uniqueCuisines).sort())
  }

  const fetchChefs = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.cuisine) params.cuisine = filters.cuisine
      if (filters.search) params.search = filters.search
      if (filters.min_rating) params.min_rating = parseFloat(filters.min_rating)
      if (selectedCity && selectedCity !== 'All') {
        params.city = selectedCity
      }

      const response = await api.get('/customer/chefs', { params })
      const chefsData = response.data.chefs || response.data || []
      setChefs(chefsData)
    } catch (error) {
      console.error('Failed to fetch chefs:', error)
      setChefs([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    const updatedFilters = { ...filters, [key]: value }
    setFilters(updatedFilters)
    const newParams = new URLSearchParams(searchParams)
    if (value && value !== '') {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  return (
    <div className="w-full relative">
      {/* Banner Header with Ad Support */}
      <PageBanner
        title="Verified Chefs"
        subtitle="Discover talented chefs specializing in authentic African cuisines"
        placement="chefs_top_banner"
        defaultContent={
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Discover Amazing Chefs
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Explore talented chefs specializing in authentic African cuisines. Order custom meals and experience authentic flavors!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Featured Chefs</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Top Rated</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Popular Now</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        {/* Filters - Compact */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search chefs..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuisine</label>
              <select
                value={filters.cuisine}
                onChange={(e) => handleFilterChange('cuisine', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Cuisines</option>
                {cuisines.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Rating</label>
              <select
                value={filters.min_rating}
                onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chefs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ChefCardSkeleton key={i} />
            ))}
          </div>
        ) : chefs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-1 text-base">No verified chefs available yet — but we're cooking up something great! 👨‍🍳</p>
            <p className="text-xs text-gray-500 mb-4">Talented African chefs are joining our platform. Check back soon for authentic culinary experiences!</p>
            <button
              onClick={fetchChefs}
              className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              type="button"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
            {chefs.map((chef) => (
              <Link
                key={chef.id}
                to={`/chefs/${chef.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Chef Image */}
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
                </div>
                
                <div className="p-4">
                  {/* Chef Name */}
                  <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                    {chef.chef_name}
                  </h3>
                  
                  {/* Rating */}
                  {chef.average_rating > 0 && (
                    <div className="flex items-center space-x-1 mb-3">
                      <StarRating
                        rating={chef.average_rating}
                        totalReviews={chef.total_reviews}
                        size="sm"
                      />
                    </div>
                  )}
                  
                  {/* Featured Cuisine Name */}
                  {chef.featured_cuisine_name && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Featured Dish:</p>
                      <p className="text-sm font-bold text-primary-600 line-clamp-1">
                        {chef.featured_cuisine_name}
                      </p>
                    </div>
                  )}
                  
                  {/* Cuisine Types - More Prominent */}
                  {chef.cuisines && chef.cuisines.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Specializes in:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {chef.cuisines.slice(0, 3).map((cuisine, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full"
                          >
                            {cuisine}
                          </span>
                        ))}
                        {chef.cuisines.length > 3 && (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                            +{chef.cuisines.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Location */}
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary-600" />
                    <span className="text-sm font-medium">{chef.city}</span>
                  </div>
                  
                  {/* Service Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                    {chef.service_radius_km && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{chef.service_radius_km}km radius</span>
                      </div>
                    )}
                    {chef.minimum_order_amount && chef.minimum_order_amount > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary-600" />
                        <span className="font-semibold">${chef.minimum_order_amount.toFixed(0)} min</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Chefs

