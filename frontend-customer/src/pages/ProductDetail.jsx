import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ShoppingCart, Star, Minus, Plus, MessageSquare } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useRecentlyViewed } from '../contexts/RecentlyViewedContext'
import { formatDateTime } from '../utils/format'
import { resolveImageUrl } from '../utils/imageUtils'
import { ProductDetailSkeleton } from '../components/SkeletonLoader'
import ProductImageGallery from '../components/ProductImageGallery'
import AnimatedButton from '../components/AnimatedButton'
import SuccessCheckmark from '../components/SuccessCheckmark'
import StickyAddToCart from '../components/StickyAddToCart'
import YouMayAlsoLike from '../components/YouMayAlsoLike'
import RecentlyViewed from '../components/RecentlyViewed'
import SocialProof from '../components/SocialProof'
import TrustBadges from '../components/TrustBadges'
import PaymentIcons from '../components/PaymentIcons'
import CountdownTimer from '../components/CountdownTimer'
import ProgressBar from '../components/ProgressBar'
import AnimatedDiscount from '../components/AnimatedDiscount'
import PromotionalBadges from '../components/PromotionalBadges'
import ProductVideo from '../components/ProductVideo'
import ColorSwatches from '../components/ColorSwatches'
import SizeChart from '../components/SizeChart'
import ShareProduct from '../components/ShareProduct'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
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
  const [showSuccessCheckmark, setShowSuccessCheckmark] = useState(false)
  const { addToCart } = useCart()
  const { token } = useAuth()
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
    if (!token) {
      alert('Please login to submit a review')
      navigate('/login')
      return
    }

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
      alert('Review submitted successfully!')
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert(error.response?.data?.detail || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStars = (rating, interactive = false, onChange = null) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        } ${interactive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
        onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
      />
    ))
  }

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const handleAddToCart = () => {
    addToCart(product, quantity)
    showSuccessToast(`${quantity} x ${product.name} added to cart!`)
    setShowSuccessCheckmark(true)
    // navigate('/cart') // Removed direct navigation to cart
  }

  if (loading) {
    return <ProductDetailSkeleton />
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-600">This African product isn't available yet — but we're always adding new authentic items! 🛒</p>
      </div>
    )
  }

  // Defensive: ensure price and stock_quantity are valid (API may return null/undefined)
  const price = Number(product.price) ?? 0
  const stockQuantity = product.stock_quantity != null ? Number(product.stock_quantity) : 0

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-gray-500 mb-4 flex items-center gap-1.5 flex-wrap">
        <Link to="/groceries" className="hover:text-primary-600">Groceries</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-[180px] sm:max-w-none">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Image - larger, hero feel */}
        <div className="lg:col-span-6 lg:sticky lg:top-4">
          <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-xl aspect-square max-w-lg mx-auto lg:max-w-none">
            <ProductImageGallery
              images={product.images || []}
              mainImage={product.image_url}
              productName={product.name}
              imageType="product"
            />
          </div>
        </div>

        {/* Info column */}
        <div className="lg:col-span-6 space-y-6">
          {product.vendor && (
            <p className="text-sm text-gray-500">
              Sold by <span className="font-semibold text-gray-800">{product.vendor.business_name}</span>
              {product.vendor.average_rating != null && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600">
                  <Star className="h-4 w-4 fill-current" />
                  {product.vendor.average_rating.toFixed(1)} ({product.vendor.total_reviews ?? 0} reviews)
                </span>
              )}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">{product.name}</h1>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-primary-600">${price.toFixed(2)}</span>
            {product.compare_at_price != null && product.compare_at_price > price && (
              <>
                <span className="text-lg text-gray-500 line-through">${product.compare_at_price.toFixed(2)}</span>
                <AnimatedDiscount discount={Math.round(((product.compare_at_price - price) / product.compare_at_price) * 100)} size="md" />
              </>
            )}
          </div>

          <SocialProof productId={product.id} product={product} />
          <div className="flex flex-wrap gap-2">
            <PromotionalBadges
              freeShipping={price > 50}
              buy2Get1={product.promotions?.some(p => p.name?.toLowerCase().includes('buy 2'))}
              bundleDeal={product.promotions?.some(p => p.name?.toLowerCase().includes('bundle'))}
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
            {product.unit && <span>Unit: <strong className="text-gray-800">{product.unit}</strong></span>}
            {product.weight_kg != null && <span>Weight: <strong className="text-gray-800">{product.weight_kg} kg</strong></span>}
            <span>Stock: <strong className={stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}>{stockQuantity > 0 ? `${stockQuantity} available` : 'Out of stock'}</strong></span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-gray-100 touch-manipulation" aria-label="Decrease">
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={1}
                max={stockQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(stockQuantity, parseInt(e.target.value) || 1)))}
                className="w-14 text-center border-x-2 border-gray-200 py-2.5 text-sm font-medium"
              />
              <button onClick={() => setQuantity(Math.min(stockQuantity, quantity + 1))} className="p-3 hover:bg-gray-100 touch-manipulation" aria-label="Increase">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <AnimatedButton
              onClick={handleAddToCart}
              disabled={stockQuantity === 0}
              className="flex-1 min-w-[160px] text-sm py-3 rounded-xl"
              variant="primary"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Add to Cart</span>
            </AnimatedButton>
          </div>
          <SuccessCheckmark show={showSuccessCheckmark} onComplete={() => setShowSuccessCheckmark(false)} />

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <TrustBadges showSecurePayment showFreeReturns showVerified={product.vendor?.is_verified} vendor={product.vendor} />
            <div className="mt-3"><PaymentIcons /></div>
          </div>
        </div>
      </div>

      {/* Description - full width section */}
      {product.description && (
        <section className="mt-8 lg:mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Description</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <p className="text-gray-600 whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>
        </section>
      )}

      {/* Sticky Add to Cart Button (Mobile) */}
      <StickyAddToCart
        product={product}
        quantity={quantity}
        setQuantity={setQuantity}
        onAddToCart={handleAddToCart}
        disabled={stockQuantity === 0}
      />

      {/* Reviews Section */}
      <section className="mt-8 lg:mt-10" aria-label="Customer reviews">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Customer Reviews</h2>
            {reviews.length > 0 && (
              <div className="flex items-center space-x-2 mt-2 flex-wrap">
                {renderStars(Math.round(averageRating))}
                <span className="text-sm sm:text-base text-gray-600">
                  {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}
          </div>
          {token && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="btn-primary flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Write a Review</span>
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm mb-4 sm:mb-6 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Write a Review</h3>
            <form onSubmit={handleSubmitReview}>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Rating *</label>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {renderStars(reviewForm.rating, true, (rating) => 
                    setReviewForm({ ...reviewForm, rating })
                  )}
                  <span className="text-xs sm:text-sm text-gray-600 ml-1 sm:ml-2">{reviewForm.rating} out of 5</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Tap the stars to select your rating</p>
              </div>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  placeholder="Brief summary of your review"
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Your Review *</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  required
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewForm(false)
                    setReviewForm({ rating: 5, title: '', comment: '' })
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm text-center py-12 px-4">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No reviews yet</p>
            {token && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="btn-primary"
              >
                Be the first to review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {renderStars(review.rating)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {review.customer_name || 'Anonymous'}
                      </p>
                      {review.is_verified_purchase && (
                        <span className="text-xs text-green-600">Verified Purchase</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(review.created_at)}
                  </span>
                </div>
                
                {review.title && (
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{review.title}</h4>
                )}
                
                <p className="text-gray-700 mb-3">{review.comment}</p>
                
                {review.vendor_response && (
                  <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded mt-3">
                    <p className="text-sm font-medium text-primary-900 mb-1">Vendor Response:</p>
                    <p className="text-primary-800">{review.vendor_response}</p>
                    {review.vendor_response_at && (
                      <p className="text-xs text-primary-600 mt-2">
                        {formatDateTime(review.vendor_response_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* You May Also Like */}
      {product && (
        <section className="mt-10 lg:mt-12" aria-label="You may also like">
          <YouMayAlsoLike
            productId={product.id}
            categoryId={product.category_id || product.category?.id}
            maxItems={4}
          />
        </section>
      )}

      {/* Recently Viewed */}
      <section className="mt-8 lg:mt-10" aria-label="Recently viewed">
        <RecentlyViewed maxItems={5} />
      </section>
    </div>
  )
}

export default ProductDetail

