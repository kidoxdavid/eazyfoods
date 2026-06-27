import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Star, Minus, Plus, Package, MessageSquare, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { resolveImg } from '../services/imageUtils'

function Stars({ rating, size = 4, interactive = false, onRate }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onClick={() => interactive && onRate?.(s)}
          className={interactive ? 'press-scale' : 'pointer-events-none'}>
          <Star className={`h-${size} w-${size} ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
  )
}

export default function ProductDetailScreen() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { addToCart, items } = useCart()
  const { token } = useAuth()
  const { success, error: showError } = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [reviews, setReviews] = useState([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/customer/products/${productId}`),
      api.get(`/customer/reviews/products/${productId}`).catch(() => ({ data: [] })),
    ]).then(([prodRes, revRes]) => {
      const p = prodRes.data
      setProduct(p)
      setReviews(Array.isArray(revRes.data) ? revRes.data : (revRes.data?.reviews || []))
      // Fetch related products via category
      if (p?.category_id) {
        api.get('/customer/products', { params: { category_id: p.category_id, limit: 6 } })
          .then(r => {
            const all = Array.isArray(r.data) ? r.data : (r.data?.products || [])
            setRelatedProducts(all.filter(x => String(x.id) !== String(productId)).slice(0, 4))
          }).catch(() => {})
      }
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [productId])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!token) { navigate('/login'); return }
    if (!reviewForm.comment.trim()) { showError('Please write a comment'); return }
    setSubmitting(true)
    try {
      await api.post(`/customer/reviews/products/${productId}`, reviewForm)
      success('Review submitted!')
      setShowReviewForm(false)
      setReviewForm({ rating: 5, title: '', comment: '' })
      // Refresh reviews
      const res = await api.get(`/customer/reviews/products/${productId}`)
      setReviews(Array.isArray(res.data) ? res.data : (res.data?.reviews || []))
    } catch (e) {
      showError(e?.response?.data?.detail || 'Could not submit review')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
    </div>
  )

  if (!product) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6 bg-white">
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
  const avgRating = reviews.length ? reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length : (product.rating || 0)

  const handleAdd = async () => {
    await addToCart(product, qty)
    success(`${qty}× ${product.name} added!`)
  }

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      {/* Image */}
      <div className="relative flex-shrink-0 bg-gray-100 overflow-hidden" style={{ height: '42%', maxHeight: 300 }}>
        {img
          ? <img src={img} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-7xl">🛒</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm press-scale">
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>
        {discount > 0 && (
          <span className="absolute top-4 right-4 bg-nude-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{discount}%
          </span>
        )}
      </div>

      {/* Info card */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-5 flex flex-col overflow-hidden">
        <div className="flex-1 scroll-content px-5 pt-5 pb-4 space-y-4">

          <div>
            <p className="text-lg font-bold text-gray-900 leading-snug">{product.name}</p>
            {product.category_name && (
              <span className="inline-block mt-1 text-xs px-2.5 py-0.5 bg-primary-50 text-primary-700 rounded-full font-medium">
                {product.category_name}
              </span>
            )}
          </div>

          {/* Rating summary */}
          {(avgRating > 0 || reviews.length > 0) && (
            <div className="flex items-center gap-2">
              <Stars rating={avgRating} />
              <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-700">${price.toFixed(2)}</span>
            {original && original > price && (
              <span className="text-sm text-gray-400 line-through">${original.toFixed(2)}</span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">About</p>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.weight && <p className="text-xs text-gray-400">Weight: {product.weight}</p>}

          {/* Reviews section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Reviews ({reviews.length})</p>
              {token && (
                <button onClick={() => setShowReviewForm(v => !v)}
                  className="text-xs text-primary-600 font-semibold flex items-center gap-1 press-scale">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {showReviewForm ? 'Cancel' : 'Write Review'}
                </button>
              )}
            </div>

            {/* Review form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Your Rating</p>
                  <Stars rating={reviewForm.rating} size={6} interactive onRate={r => setReviewForm(f => ({ ...f, rating: r }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title (optional)</label>
                  <input value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Summary of your review"
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Comment</label>
                  <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    rows={3} placeholder="Tell others about your experience…"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-primary-400" />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl press-scale disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Review'}
                </button>
              </form>
            )}

            {/* Review list */}
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No reviews yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <Stars rating={r.rating} size={3} />
                      <span className="text-[10px] text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    {r.title && <p className="text-xs font-semibold text-gray-800 mt-1.5">{r.title}</p>}
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.comment}</p>
                    {r.customer_name && <p className="text-[10px] text-gray-400 mt-1">— {r.customer_name}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-900 mb-3">You May Also Like</p>
              <div className="flex gap-3 overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {relatedProducts.map(p => {
                  const rImg = resolveImg(p.image_url)
                  const rPrice = parseFloat(p.price || 0)
                  return (
                    <button key={p.id} onClick={() => navigate(`/shop/product/${p.id}`)}
                      className="flex-shrink-0 w-32 bg-gray-50 rounded-2xl overflow-hidden press-scale">
                      <div className="h-24 bg-gray-100">
                        {rImg ? <img src={rImg} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>}
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                        <p className="text-xs font-bold text-primary-700 mt-1">${rPrice.toFixed(2)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* Add to cart */}
        <div className="px-5 pt-3 border-t border-gray-100 flex items-center gap-3 bg-white flex-shrink-0 pb-safe"
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
          <button onClick={handleAdd}
            className="flex-1 h-11 bg-primary-600 text-white font-bold text-sm rounded-xl press-scale flex items-center justify-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {inCart ? 'Add More' : 'Add to Cart'} · ${(price * qty).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
