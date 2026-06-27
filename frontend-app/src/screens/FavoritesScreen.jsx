import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { useFavorites } from '../contexts/FavoritesContext'
import { useEffect, useState } from 'react'
import api from '../services/api'
import ProductCard from '../components/ProductCard'
import { resolveImg } from '../services/imageUtils'
import { ProductSkeleton } from '../components/Skeleton'

function ChefFavCard({ chefId, onPress }) {
  const [chef, setChef] = useState(null)
  useEffect(() => {
    api.get(`/customer/chefs/${chefId}`).then(r => setChef(r.data)).catch(() => {})
  }, [chefId])
  if (!chef) return <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
  const img = resolveImg(chef.profile_image || chef.image_url)
  return (
    <button onClick={onPress} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm active:scale-95 transition-transform">
      <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👨‍🍳</div>}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{chef.chef_name || chef.name || chef.business_name}</p>
        <p className="text-xs text-gray-400 truncate">{chef.cuisine_type || 'Chef'}</p>
        {chef.rating > 0 && <p className="text-xs text-amber-500">★ {parseFloat(chef.rating).toFixed(1)}</p>}
      </div>
    </button>
  )
}

function ProductFavCard({ productId, onPress }) {
  const [product, setProduct] = useState(null)
  useEffect(() => {
    api.get(`/customer/products/${productId}`).then(r => setProduct(r.data)).catch(() => {})
  }, [productId])
  if (!product) return <ProductSkeleton />
  return <ProductCard product={product} onPress={onPress} />
}

export default function FavoritesScreen() {
  const navigate = useNavigate()
  const { productIds, chefIds } = useFavorites()
  const [tab, setTab] = useState('products')

  const hasAny = productIds.length > 0 || chefIds.length > 0

  return (
    <div className="h-full flex flex-col pt-safe">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900">Saved Items</h1>
        <div className="ml-auto flex items-center gap-1">
          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
          <span className="text-sm font-bold text-gray-700">{productIds.length + chefIds.length}</span>
        </div>
      </div>

      {!hasAny ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Heart className="h-16 w-16 text-gray-200 mb-4" />
          <p className="font-bold text-gray-800 text-lg">No saved items yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">Tap the heart icon on any product or chef to save them here</p>
          <button onClick={() => navigate('/shop')} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm">
            Browse Products
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
            <button onClick={() => setTab('products')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'products' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>
              Products ({productIds.length})
            </button>
            <button onClick={() => setTab('chefs')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'chefs' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>
              Chefs ({chefIds.length})
            </button>
          </div>

          <div className="flex-1 scroll-content mb-tab">
            {tab === 'products' && (
              productIds.length === 0
                ? <div className="flex flex-col items-center py-16 text-center px-4"><span className="text-4xl mb-3">🛒</span><p className="text-gray-400 text-sm">No saved products</p></div>
                : <div className="grid grid-cols-3 gap-2 p-3">
                    {productIds.map(id => <ProductFavCard key={id} productId={id} onPress={() => navigate(`/shop/product/${id}`)} />)}
                  </div>
            )}
            {tab === 'chefs' && (
              chefIds.length === 0
                ? <div className="flex flex-col items-center py-16 text-center px-4"><span className="text-4xl mb-3">👨‍🍳</span><p className="text-gray-400 text-sm">No saved chefs</p></div>
                : <div className="flex flex-col gap-2 p-3">
                    {chefIds.map(id => <ChefFavCard key={id} chefId={id} onPress={() => navigate(`/chefs/${id}`)} />)}
                  </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
