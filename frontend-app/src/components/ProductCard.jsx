import { useState } from 'react'
import { Plus, Check, Star } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { resolveImg } from '../services/imageUtils'


export default function ProductCard({ product, onPress }) {
  const { addToCart, items } = useCart()
  const { success } = useToast()
  const [adding, setAdding] = useState(false)

  const inCart = items.some(i => i.id === String(product.id))
  const img = resolveImg(product.image_url)
  const price = parseFloat(product.price || product.unit_price || 0)
  const original = product.original_price ? parseFloat(product.original_price) : null
  const discount = original && original > price ? Math.round((1 - price / original) * 100) : 0

  const handleAdd = async (e) => {
    e.stopPropagation()
    if (adding) return
    setAdding(true)
    await addToCart(product)
    success(`${product.name} added!`)
    setTimeout(() => setAdding(false), 1200)
  }

  return (
    <div onClick={onPress} className="bg-white rounded-2xl overflow-hidden shadow-sm active:shadow-md press-scale">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {img ? (
          <img src={img} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-nude-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        <button
          onClick={handleAdd}
          className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors press-scale ${
            inCart ? 'bg-primary-600' : 'bg-white'
          }`}
        >
          {inCart ? (
            <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
          ) : (
            <Plus className="h-4 w-4 text-primary-600" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{product.name}</p>
        {product.rating > 0 && (
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-gray-500">{parseFloat(product.rating).toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-primary-700">${price.toFixed(2)}</span>
          {original && original > price && (
            <span className="text-[10px] text-gray-400 line-through">${original.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
