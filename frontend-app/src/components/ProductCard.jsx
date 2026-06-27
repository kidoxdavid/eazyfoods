import { useState } from 'react'
import { Plus, Check, Star, Heart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { resolveImg } from '../services/imageUtils'

export default function ProductCard({ product, onPress }) {
  const { addToCart, items } = useCart()
  const { success } = useToast()
  const { isProductFav, toggleProduct } = useFavorites()
  const [adding, setAdding] = useState(false)

  const inCart = items.some(i => i.id === String(product.id))
  const fav    = isProductFav(product.id)
  const img    = resolveImg(product.image_url)
  const price  = parseFloat(product.price || product.unit_price || 0)
  const orig   = product.original_price ? parseFloat(product.original_price) : null
  const disc   = orig && orig > price ? Math.round((1 - price / orig) * 100) : 0

  const handleAdd = async (e) => {
    e.stopPropagation()
    if (adding) return
    setAdding(true)
    await addToCart(product)
    success(`${product.name} added!`)
    setTimeout(() => setAdding(false), 1000)
  }

  const handleFav = (e) => {
    e.stopPropagation()
    toggleProduct(product.id)
  }

  return (
    <div onClick={onPress} className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform">
      {/* Image — fixed 110px height */}
      <div className="relative h-[110px] bg-gray-100 overflow-hidden">
        {img
          ? <img src={img} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
        }
        {disc > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            -{disc}%
          </span>
        )}
        {product.is_new && (
          <span className="absolute top-1.5 left-1.5 bg-primary-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
        )}
        {/* Heart */}
        <button onClick={handleFav}
          className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
          <Heart className={`h-3.5 w-3.5 ${fav ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
        </button>
        {/* Add button */}
        <button onClick={handleAdd}
          className={`absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-colors ${inCart ? 'bg-primary-600' : 'bg-white'}`}>
          {inCart
            ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            : <Plus className="h-3.5 w-3.5 text-primary-600" strokeWidth={2.5} />
          }
        </button>
      </div>
      {/* Info */}
      <div className="p-2">
        <p className="text-[11px] font-semibold text-gray-900 leading-tight line-clamp-2 mb-0.5">{product.name}</p>
        {product.rating > 0 && (
          <div className="flex items-center gap-0.5 mb-0.5">
            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[9px] text-gray-400">{parseFloat(product.rating).toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-primary-700">${price.toFixed(2)}</span>
          {orig && orig > price && <span className="text-[9px] text-gray-400 line-through">${orig.toFixed(2)}</span>}
        </div>
      </div>
    </div>
  )
}
