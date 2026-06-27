import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Star, Minus, Plus, Package } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'

const IMG_BASE = 'https://eazyfoods-api.onrender.com'
const resolveImg = u => u ? (u.startsWith('http') ? u : IMG_BASE + (u.startsWith('/') ? '' : '/') + u) : null

export default function ProductDetailScreen() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { addToCart, items } = useCart()
  const { success } = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    api.get(`/customer/products/${productId}`)
      .then(r => setProduct(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!product) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
      <Package className="h-16 w-16 text-gray-300" />
      <p className="text-gray-500">Product not found</p>
      <button onClick={() => navigate(-1)} className="text-primary-600 font-semibold">Go back</button>
    </div>
  )

  const img = resolveImg(product.image_url)
  const price = parseFloat(product.price || 0)
  const original = product.original_price ? parseFloat(product.original_price) : null
  const discount = original && original > price ? Math.round((1 - price / original) * 100) : 0
  const inCart = items.some(i => i.id === String(product.id))

  const handleAdd = async () => {
    await addToCart(product, qty)
    success(`${qty}x ${product.name} added to cart!`)
  }

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      {/* Image with back button overlay */}
      <div className="relative flex-shrink-0 bg-gray-100 overflow-hidden" style={{ height: '45%', maxHeight: 320 }}>
        {img
          ? <img src={img} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-6xl">🛒</div>
        }
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm press-scale"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>
        {discount > 0 && (
          <span className="absolute top-4 right-4 bg-nude-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{discount}%
          </span>
        )}
      </div>

      {/* Info card — slides up over image */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-5 flex flex-col overflow-hidden">
        <div className="flex-1 scroll-content px-5 pt-5 pb-4">
          <p className="text-lg font-bold text-gray-900 leading-snug">{product.name}</p>

          {product.category_name && (
            <span className="inline-block mt-1 text-xs px-2.5 py-0.5 bg-primary-50 text-primary-700 rounded-full font-medium">
              {product.category_name}
            </span>
          )}

          {product.rating > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-xs text-gray-500 ml-1">{parseFloat(product.rating).toFixed(1)} ({product.review_count || 0} reviews)</span>
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-bold text-primary-700">${price.toFixed(2)}</span>
            {original && original > price && (
              <span className="text-sm text-gray-400 line-through">${original.toFixed(2)}</span>
            )}
          </div>

          {product.description && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">About this product</p>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.weight && (
            <p className="text-xs text-gray-400 mt-3">Weight: {product.weight}</p>
          )}
        </div>

        {/* Qty + Add to Cart */}
        <div className="px-5 pb-safe pt-3 border-t border-gray-100 flex items-center gap-3 bg-white flex-shrink-0"
             style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center press-scale">
              <Minus className="h-4 w-4 text-gray-600" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-gray-900">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-11 h-11 flex items-center justify-center press-scale">
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex-1 h-11 bg-primary-600 text-white font-bold text-sm rounded-xl press-scale flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            {inCart ? 'Add More' : 'Add to Cart'} · ${(price * qty).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
