import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, TrendingUp } from 'lucide-react'
import api from '../services/api'
import { resolveImageUrl } from '../utils/imageUtils'

const SearchAutocomplete = ({ 
  query, 
  onQueryChange, 
  onSelect, 
  isOpen, 
  onClose,
  showTrending = true 
}) => {
  const [suggestions, setSuggestions] = useState([])
  const [trendingSearches, setTrendingSearches] = useState([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Load trending searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('trendingSearches')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Sort by count and get top 5
        const sorted = parsed.sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 5)
        setTrendingSearches(sorted)
      } catch (e) {
        console.error('Failed to load trending searches:', e)
      }
    }
  }, [])

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const response = await api.get('/customer/products', {
          params: {
            search: query,
            limit: 5,
            skip: 0
          }
        })
        
        const products = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.products || [])
        
        setSuggestions(products)
      } catch (error) {
        console.error('Failed to fetch search suggestions:', error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  // Track search when user selects a suggestion
  const trackSearch = (searchTerm) => {
    const saved = localStorage.getItem('trendingSearches') || '[]'
    try {
      const searches = JSON.parse(saved)
      const existing = searches.find(s => s.term.toLowerCase() === searchTerm.toLowerCase())
      
      if (existing) {
        existing.count = (existing.count || 0) + 1
        existing.lastSearched = new Date().toISOString()
      } else {
        searches.push({
          term: searchTerm,
          count: 1,
          lastSearched: new Date().toISOString()
        })
      }
      
      localStorage.setItem('trendingSearches', JSON.stringify(searches))
      
      // Update trending searches state
      const sorted = searches.sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 5)
      setTrendingSearches(sorted)
    } catch (e) {
      console.error('Failed to track search:', e)
    }
  }

  const handleSelect = (product) => {
    trackSearch(query)
    if (onSelect) {
      onSelect(product)
    }
  }

  const handleTrendingClick = (term) => {
    onQueryChange(term)
    trackSearch(term)
    if (onSelect) {
      onSelect(null) // Trigger search
    }
  }

  if (!isOpen) return null

  const hasSuggestions = suggestions.length > 0
  const hasTrending = showTrending && trendingSearches.length > 0
  const showContent = hasSuggestions || hasTrending || loading

  if (!showContent) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
    >
      {/* Search Suggestions */}
      {query && query.trim().length >= 2 && (
        <div className="p-2">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : hasSuggestions ? (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Suggestions
              </div>
              {suggestions.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  onClick={() => handleSelect(product)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={resolveImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      ${product.price?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <Search className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No groceries found</p>
            </div>
          )}
        </div>
      )}

      {/* Trending Searches - Enhanced */}
      {hasTrending && (!query || query.trim().length < 2) && (
        <div className="p-2 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 rounded-lg mb-2">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            <span>Trending Searches</span>
          </div>
          <div className="space-y-1">
            {trendingSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleTrendingClick(search.term)}
                className="w-full flex items-center gap-3 p-3 hover:bg-primary-50 rounded-lg transition-all text-left group border border-transparent hover:border-primary-200 hover:shadow-sm"
                type="button"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <span className="text-xs font-bold text-primary-600">{index + 1}</span>
                </div>
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-primary-600 transition-colors" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors flex-1">
                  {search.term}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                  {search.count} {search.count === 1 ? 'time' : 'times'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchAutocomplete

