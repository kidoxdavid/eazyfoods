import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, Minus, Plus, Heart, Truck, Store as StoreIcon, Check } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useToast } from '../contexts/ToastContext'
import { useRecentlyViewed } from '../contexts/RecentlyViewedContext'
import { formatDateTime } from '../utils/format'
import ProductGallery from '../components/ProductGallery'
import YouMayAlsoLike from '../components/YouMayAlsoLike'
import RecentlyViewed from '../components/RecentlyViewed'

const ProductDetail = () => {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  })
  const [submittingReview, setSubmittingReview] = useState(false)
  const { addToCart } = useCart()
  const { productFavorites, toggleProductFavorite } = useFavorites()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const { addToRecentlyViewed } = useRecentlyViewed()

  useEffect(() => {
    fetchProduct()
    fetchReviews()
    
    // Check if we should show review form (from order page)
    const params = new URLSearchParams(window.location.search)
    if (params.get('review') === 'true') {
      setShowReviewForm(true)
    }
  }, [id])

  // Add to recently viewed when product loads (only once per product)
  useEffect(() => {
    if (product && product.id) {
      // Use a ref to track if we've already added this product
      const productId = product.id
      const lastAdded = sessionStorage.getItem(`recentlyViewed_${productId}`)
      const now = Date.now()
      
      // Only add if we haven't added this product in the last 5 seconds (prevents rapid re-renders)
      if (!lastAdded || (now - parseInt(lastAdded)) > 5000) {
        addToRecentlyViewed(product)
        sessionStorage.setItem(`recentlyViewed_${productId}`, now.toString())
      }
    }
  }, [product?.id, addToRecentlyViewed])

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/customer/products/${id}`)
      setProduct(response.data)
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/customer/reviews/products/${id}`)
      setReviews(response.data)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setSubmittingReview(true)
    try {
      await api.post(`/customer/reviews/products/${id}`, {
        product_id: id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment
      })
      setShowReviewForm(false)
      setReviewForm({ rating: 5, title: '', comment: '' })
      fetchReviews() // Refresh reviews
      showSuccessToast('Thanks, your review has been submitted.')
    } catch (error) {
      console.error('Failed to submit review:', error)
      showErrorToast(error.response?.data?.detail || 'Could not submit your review')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const handleAddToCart = () => {
    addToCart(product, quantity)
    showSuccessToast(`${quantity} x ${product.name} added to cart!`)
    // navigate('/cart') // Removed direct navigation to cart
  }

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8"><div className="skeleton aspect-square lg:col-span-7" /><div className="space-y-4 lg:col-span-5"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-10 w-3/4" /><div className="skeleton h-8 w-1/4" /><div className="skeleton h-14 w-full" /></div></div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-900">We couldn&apos;t find that product</h1>
        <p className="mt-3 text-ink-600">It may have been removed or is no longer available.</p>
        <Link to="/groceries" className="btn-primary mt-8">Browse groceries</Link>
      </div>
    )
  }

  // Server data is authoritative; guard against null/undefined fields
  const stockQuantity = product.stock_quantity != null ? Number(product.stock_quantity) : 0
  const onSale = product.discounted_price != null && Number(product.discounted_price) < Number(product.price)
  const now = Number(onSale ? product.discounted_price : product.price) || 0
  const was = onSale ? Number(product.price) : Number(product.compare_at_price) > Number(product.price) ? Number(product.compare_at_price) : null
  const off = was ? Math.round(((was - now) / was) * 100) : 0
  const soldOut = stockQuantity <= 0
  const lowStock = !soldOut && stockQuantity <= (product.low_stock_threshold || 5)
  const store = product.vendor?.business_name
  const fav = productFavorites?.has?.(product.id)
  const promo = product.promotions?.[0]
  const unitLine = [product.unit && product.unit !== 'piece' ? product.unit : null, product.weight_kg ? `${product.weight_kg} kg` : null].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7"><ProductGallery mainImage={product.image_url} images={product.images} name={product.name} /></div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            {store && <p className="eyebrow mb-3">{product.store_id ? <Link to={`/stores/${product.store_id}`} className="hover:underline">{store}</Link> : store}</p>}
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink-900 sm:text-4xl">{product.name}</h1>

            {reviews.length > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-900">
                <span className="flex" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(averageRating) ? 'fill-ochre-400 text-ochre-400' : 'text-ink-200'}`} />)}</span>
                <span>{averageRating.toFixed(1)} &middot; {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
              </a>
            )}

            <div className="mt-6 flex items-baseline gap-3">
              <span className="price text-3xl">${now.toFixed(2)}</span>
              {was && <span className="text-lg text-ink-500 line-through">${was.toFixed(2)}</span>}
              {off > 0 && <span className="rounded-sm bg-nude-600 px-2 py-0.5 text-xs font-semibold text-white">{off}% off</span>}
            </div>
            {unitLine && <p className="mt-1 text-sm text-ink-600">{unitLine}</p>}
            {promo?.discount_display && <p className="mt-2 text-sm font-medium text-nude-700">{promo.discount_display}</p>}

            <p className={`mt-5 flex items-center gap-2 text-sm font-medium ${soldOut ? 'text-nude-700' : 'text-primary-600'}`}>
              {soldOut ? 'Sold out' : <><Check className="h-4 w-4" /> {lowStock ? `Only ${stockQuantity} left` : 'In stock'}</>}
            </p>

            <div className="mt-6 flex items-stretch gap-3">
              <div className="flex items-center rounded-md border border-ink-900">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-12 w-11 items-center justify-center text-ink-900 hover:bg-ink-100 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <input type="number" aria-label="Quantity" min={1} max={Math.max(1, stockQuantity)} value={quantity} disabled={soldOut} onChange={(e) => setQuantity(Math.max(1, Math.min(Math.max(1, stockQuantity), parseInt(e.target.value) || 1)))} className="h-12 w-12 border-0 bg-transparent p-0 text-center text-base font-semibold tabular-nums focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                <button type="button" aria-label="Increase quantity" disabled={quantity >= stockQuantity} onClick={() => setQuantity((q) => Math.min(stockQuantity, q + 1))} className="flex h-12 w-11 items-center justify-center text-ink-900 hover:bg-ink-100 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={handleAddToCart} disabled={soldOut} className="btn-primary h-12 flex-1 !text-base">{soldOut ? 'Unavailable' : `Add to cart · $${(now * quantity).toFixed(2)}`}</button>
              <button type="button" onClick={() => toggleProductFavorite?.(product.id)} aria-pressed={!!fav} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} className="flex h-12 w-12 items-center justify-center rounded-md border border-ink-200 text-ink-700 hover:border-ink-900"><Heart className={`h-5 w-5 ${fav ? 'fill-nude-600 text-nude-600' : ''}`} /></button>
            </div>

            <ul className="mt-8 space-y-3 border-t border-paper-300 pt-6 text-sm text-ink-700">
              <li className="flex gap-3"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" /><span>Delivery from {store || 'the store'}. Fees and timing are confirmed at checkout.</span></li>
              <li className="flex gap-3"><StoreIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" /><span>Pickup is available where the store offers it.</span></li>
            </ul>
          </div>
        </div>
      </div>

      {product.description && (
        <section className="mt-16 grid gap-6 border-t border-paper-300 pt-10 lg:grid-cols-12" aria-labelledby="about-product">
          <h2 id="about-product" className="section-title lg:col-span-4">About this product</h2>
          <p className="max-w-2xl whitespace-pre-line leading-relaxed text-ink-700 lg:col-span-8">{product.description}</p>
        </section>
      )}

      <section id="reviews" className="mt-16 grid gap-8 border-t border-paper-300 pt-10 lg:grid-cols-12" aria-labelledby="reviews-title">
        <div className="lg:col-span-4">
          <h2 id="reviews-title" className="section-title">Reviews</h2>
          {reviews.length > 0 && <p className="mt-2 text-ink-600">{averageRating.toFixed(1)} out of 5 from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>}
          <button type="button" onClick={() => setShowReviewForm((v) => !v)} className="btn-secondary mt-5">{showReviewForm ? 'Cancel' : 'Write a review'}</button>
        </div>

        <div className="lg:col-span-8">
          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="mb-8 space-y-4 rounded-lg border border-paper-300 bg-white p-5">
              <fieldset>
                <legend className="label">Your rating</legend>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={reviewForm.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setReviewForm({ ...reviewForm, rating: n })} className="p-0.5"><Star className={`h-6 w-6 ${n <= reviewForm.rating ? 'fill-ochre-400 text-ochre-400' : 'text-ink-200'}`} /></button>
                  ))}
                </div>
              </fieldset>
              <div><label htmlFor="rv-title" className="label">Title</label><input id="rv-title" className="input" value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} /></div>
              <div><label htmlFor="rv-body" className="label">Review</label><textarea id="rv-body" rows={4} className="input" required value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} /></div>
              <button type="submit" disabled={submittingReview} className="btn-primary">{submittingReview ? 'Submitting…' : 'Submit review'}</button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-ink-600">No reviews yet. Bought this? Be the first to tell others what you thought.</p>
          ) : (
            <ul className="divide-y divide-paper-300 border-y border-paper-300">
              {reviews.map((r) => (
                <li key={r.id} className="py-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex" aria-label={`${r.rating} out of 5 stars`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-ochre-400 text-ochre-400' : 'text-ink-200'}`} />)}</span>
                    <span className="text-sm font-semibold text-ink-900">{r.customer_name || 'Customer'}</span>
                    {r.is_verified_purchase && <span className="text-xs font-medium text-primary-600">Verified purchase</span>}
                    <span className="text-xs text-ink-500">{formatDateTime(r.created_at)}</span>
                  </div>
                  {r.title && <p className="mt-2 font-display text-lg text-ink-900">{r.title}</p>}
                  {r.comment && <p className="mt-1 max-w-2xl leading-relaxed text-ink-700">{r.comment}</p>}
                  {r.vendor_response && (
                    <div className="mt-4 border-l-2 border-paper-400 pl-4 text-sm">
                      <p className="font-semibold text-ink-900">Response from the store</p>
                      <p className="mt-1 text-ink-700">{r.vendor_response}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-20 space-y-16">
        <YouMayAlsoLike productId={product.id} categoryId={product.category_id} maxItems={4} />
        <RecentlyViewed maxItems={6} />
      </div>
    </div>
  )
}

export default ProductDetail
