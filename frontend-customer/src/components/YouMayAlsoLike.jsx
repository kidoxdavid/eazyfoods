import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { resolveImageUrl } from '../utils/imageUtils'
import ProductBadges from './ProductBadges'
import CategoryBadge from './CategoryBadge'
import { ShoppingCart, Heart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'

const YouMayAlsoLike = ({ productId, categoryId, maxItems = 4 }) => {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToCart } = useCart()
  const { success: showSuccessToast } = useToast()
  const [favorites, setFavorites] = useState(new Set())

  useEffect(() => {
    loadFavorites()
  }, [])

  useEffect(() => {
    fetchRecommendations()
  }, [productId, categoryId])

  const loadFavorites = () => {
    const saved = localStorage.getItem('favorites')
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)))
      } catch (e) {
        console.error('Failed to load favorites:', e)
      }
    }
  }

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      const params = {
        limit: maxItems + 2, // Fetch extra to filter out current product
        skip: 0
      }

      // Prioritize same category
      if (categoryId) {
        params.category_id = categoryId
      }

      const response = await api.get('/customer/products', { params })
      let products = Array.isArray(response.data) ? response.data : (response.data?.products || [])

      // Filter out current product
      products = products.filter(p => p.id !== productId)

      // Limit to maxItems
      products = products.slice(0, maxItems)

      setRecommendations(products)
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (productId) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)
    localStorage.setItem('favorites', JSON.stringify(Array.from(newFavorites)))
  }

  const handleAddToCart = (e, product) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product, 1)
    showSuccessToast(`${product.name} added to cart!`)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">You May Also Like</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(maxItems)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">You May Also Like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {recommendations.map((product) => (
          <div key={product.id} className="group relative bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden">
            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleFavorite(product.id)
              }}
              className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all z-20"
              type="button"
            >
              <Heart
                className={`h-4 w-4 transition-all ${
                  favorites.has(product.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'
                }`}
              />
            </button>

            <Link to={`/products/${product.id}`} className="block">
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100 rounded-t-xl overflow-hidden">
                {product.image_url ? (
                  <>
                    <img
                      src={resolveImageUrl(product.image_url)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        const fallback = e.target.parentElement?.querySelector('.img-fallback')
                        if (fallback) fallback.classList.remove('hidden')
                      }}
                    />
                    <div className="img-fallback hidden absolute inset-0 flex items-center justify-center text-gray-400 text-xs bg-gray-100">No Image</div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No Image
                  </div>
                )}
                <ProductBadges product={product} />
              </div>

              {/* Product Info */}
              <div className="p-3">
                <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
                  {product.name}
                </h3>
                {product.category && (
                  <div className="mb-1">
                    <CategoryBadge category={product.category} size="sm" />
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-base font-bold text-primary-600">
                    ${product.price?.toFixed(2) || '0.00'}
                  </p>
                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors opacity-0 group-hover:opacity-100"
                    type="button"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default YouMayAlsoLike

