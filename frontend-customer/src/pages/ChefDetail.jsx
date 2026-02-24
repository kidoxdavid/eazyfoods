import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import StarRating from '../components/StarRating'
import { ChefHat, MapPin, Clock, DollarSign, ArrowLeft, UtensilsCrossed, Flame, Users, Leaf, ShoppingCart, Phone, Mail, Share2, Heart, Truck, MessageCircle, X } from 'lucide-react'
import { resolveImageUrl } from '../utils/imageUtils'
import { ChefDetailSkeleton } from '../components/SkeletonLoader'
import { useCart } from '../contexts/CartContext'

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

const ChefDetail = () => {
  const { id: chefId } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [chef, setChef] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cuisineQuantities, setCuisineQuantities] = useState({})
  const [addingCuisineId, setAddingCuisineId] = useState(null)
  const [galleryLightbox, setGalleryLightbox] = useState(null)
  const [savingSave, setSavingSave] = useState(false)

  useEffect(() => {
    fetchChef()
  }, [chefId])

  const fetchChef = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/customer/chefs/${chefId}`)
      setChef(response.data)
    } catch (error) {
      console.error('Failed to fetch chef:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChef = async () => {
    if (!chef) return
    setSavingSave(true)
    try {
      if (chef.is_saved) {
        await api.delete(`/customer/saved-chefs/${chef.id}`)
        setChef(prev => ({ ...prev, is_saved: false }))
      } else {
        await api.post(`/customer/saved-chefs/${chef.id}`)
        setChef(prev => ({ ...prev, is_saved: true }))
      }
    } catch (e) {
      if (e.response?.status === 401) window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
    } finally {
      setSavingSave(false)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: chef?.chef_name || 'Chef', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
  }

  const minPrice = chef?.cuisine_offerings?.length
    ? Math.min(...(chef.cuisine_offerings.filter(c => c.status === 'active').map(c => Number(c.price) || 0).filter(Boolean) || [0]))
    : null

  if (loading) {
    return <ChefDetailSkeleton />
  }

  if (!chef) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Chef not found</p>
        <Link to="/chefs" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Chefs
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link to="/chefs" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Chefs
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleShare} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50" aria-label="Share">
              <Share2 className="h-4 w-4 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={handleSaveChef}
              disabled={savingSave}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              aria-label={chef.is_saved ? 'Unsave' : 'Save chef'}
            >
              <Heart className={`h-4 w-4 ${chef.is_saved ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Banner */}
        <div className="relative h-48 sm:h-60 md:h-72 mb-3 sm:mb-4 rounded-lg overflow-hidden">
        {chef.banner_image_url ? (
          <img
            src={resolveImageUrl(chef.banner_image_url)}
            alt={chef.chef_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('[ChefDetail] Banner image failed to load:', chef.banner_image_url)
              e.target.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <ChefHat className="h-24 w-24 text-primary-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
          <div className="flex flex-col xs:flex-row items-start xs:items-end gap-2 sm:gap-4">
            {chef.profile_image_url && (
              <img
                src={resolveImageUrl(chef.profile_image_url)}
                alt={chef.chef_name}
                className="h-20 w-20 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-full border-2 sm:border-4 border-white object-cover flex-shrink-0"
                onError={(e) => {
                  console.error('[ChefDetail] Profile image failed to load:', chef.profile_image_url)
                  e.target.style.display = 'none'
                }}
              />
            )}
            <div className="text-white min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 truncate">{chef.chef_name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm sm:text-base">
                <StarRating
                  rating={chef.average_rating}
                  totalReviews={chef.total_reviews}
                  size="md"
                />
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{chef.city}, {chef.state}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-3">
          {/* About */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h2 className="text-lg font-bold text-gray-900 mb-2">About</h2>
            {chef.bio && (
              <p className="text-sm text-gray-700 mb-2">{chef.bio}</p>
            )}
            {chef.cuisine_description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Cuisine Style</h3>
                <p className="text-sm text-gray-700">{chef.cuisine_description}</p>
              </div>
            )}
          </div>

          {/* Operating hours & blocked dates */}
          {(chef.operating_hours && Object.keys(chef.operating_hours).length > 0) || (chef.blocked_dates && chef.blocked_dates.length > 0) ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Schedule</h2>
              {chef.operating_hours && Object.keys(chef.operating_hours).length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Weekly hours</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                    {Object.entries(chef.operating_hours).map(([day, slots]) => (
                      <span key={day}>{DAY_LABELS[day] || day}: {Array.isArray(slots) && slots.length ? slots[0] : '—'}</span>
                    ))}
                  </div>
                </div>
              )}
              {chef.blocked_dates && chef.blocked_dates.length > 0 && (
                <p className="text-xs text-amber-700">Not available on: {chef.blocked_dates.slice(0, 5).join(', ')}{chef.blocked_dates.length > 5 ? ` +${chef.blocked_dates.length - 5} more` : ''}</p>
              )}
            </div>
          ) : null}

          {/* Cuisine Types */}
          {chef.cuisines && chef.cuisines.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Cuisine Types</h2>
              <div className="flex flex-wrap gap-1.5">
                {chef.cuisines.map((cuisine, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cuisine Offerings - large cards with full details */}
          {chef.cuisine_offerings && chef.cuisine_offerings.length > 0 && (
            <div id="cuisine-offerings" className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-5 lg:p-6 scroll-mt-20 sm:scroll-mt-24">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-5">Cuisine Offerings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {chef.cuisine_offerings.map((cuisine) => {
                  const isUnavailable = cuisine.status && cuisine.status !== 'active'
                  const dietary = []
                  if (cuisine.is_vegetarian) dietary.push('Vegetarian')
                  if (cuisine.is_vegan) dietary.push('Vegan')
                  if (cuisine.is_gluten_free) dietary.push('Gluten-free')
                  if (cuisine.is_halal) dietary.push('Halal')
                  if (cuisine.is_kosher) dietary.push('Kosher')
                  const ingredients = Array.isArray(cuisine.ingredients) ? cuisine.ingredients : []
                  const hasDescription = cuisine.description && cuisine.description.trim()
                  return (
                    <div
                      key={cuisine.id}
                      className={`bg-gray-50 rounded-xl border-2 overflow-hidden transition-all duration-300 group flex flex-col ${isUnavailable ? 'border-gray-200 opacity-75' : 'border-gray-200 hover:shadow-xl hover:border-primary-300'}`}
                    >
                      {/* Large image */}
                      <div className="relative aspect-[16/10] min-h-[160px] sm:min-h-[200px] lg:min-h-[220px] bg-gray-100 overflow-hidden">
                        {cuisine.image_url ? (
                          <img
                            src={resolveImageUrl(cuisine.image_url)}
                            alt={cuisine.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              console.error('[ChefDetail] Cuisine image failed to load:', cuisine.image_url)
                              e.target.style.display = 'none'
                              const fallback = e.target.parentElement.querySelector('.image-fallback')
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                            <UtensilsCrossed className="h-20 w-20 text-primary-300" />
                          </div>
                        )}
                        <div className="image-fallback absolute inset-0 w-full h-full flex items-center justify-center text-gray-400 hidden">
                          <UtensilsCrossed className="h-20 w-20" />
                        </div>
                        {isUnavailable && (
                          <div className="absolute top-3 right-3 bg-gray-700 text-white text-sm font-semibold px-3 py-1.5 rounded-md shadow">
                            Temporarily unavailable
                          </div>
                        )}
                        {cuisine.is_featured && !isUnavailable && (
                          <div className="absolute top-3 right-3 bg-primary-600 text-white text-sm font-semibold px-3 py-1.5 rounded-md shadow">
                            Featured
                          </div>
                        )}
                        {cuisine.cuisine_type && (
                          <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm font-medium px-3 py-1.5 rounded-md">
                            {cuisine.cuisine_type}
                          </div>
                        )}
                      </div>

                      {/* Content - always show more detail */}
                      <div className="p-5 sm:p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                          {cuisine.name}
                        </h3>
                        {hasDescription ? (
                          <p className="text-gray-600 mb-4 line-clamp-4 leading-relaxed text-base">
                            {cuisine.description}
                          </p>
                        ) : (
                          <p className="text-gray-500 mb-4 italic text-base">
                            {cuisine.cuisine_type
                              ? `Traditional ${cuisine.cuisine_type} dish prepared by our chef.`
                              : 'Authentic preparation by our chef.'}
                          </p>
                        )}
                        {ingredients.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Key ingredients</p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {ingredients.slice(0, 5).join(', ')}
                              {ingredients.length > 5 && ` +${ingredients.length - 5} more`}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 mb-4">
                          {cuisine.prep_time_minutes != null && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-primary-600" />
                              {cuisine.prep_time_minutes} min prep
                            </span>
                          )}
                          {cuisine.serves != null && cuisine.serves > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-primary-600" />
                              Serves {cuisine.serves}
                            </span>
                          )}
                          {cuisine.spice_level && (
                            <span className="flex items-center gap-1.5">
                              <Flame className="h-4 w-4 text-amber-500" />
                              <span className="capitalize">{cuisine.spice_level.replace('_', ' ')}</span>
                            </span>
                          )}
                        </div>
                        {dietary.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {dietary.map((d) => (
                              <span
                                key={d}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium"
                              >
                                <Leaf className="h-3.5 w-3.5" />
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                        {Array.isArray(cuisine.allergens) && cuisine.allergens.length > 0 && (
                          <p className="text-xs text-amber-700 mb-4">
                            Contains: {cuisine.allergens.join(', ')}
                          </p>
                        )}
                        <div className="flex flex-col gap-3 pt-4 mt-auto border-t-2 border-gray-200">
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-primary-600">
                              ${cuisine.price != null ? Number(cuisine.price).toFixed(2) : '0.00'}
                            </p>
                            {cuisine.minimum_servings != null && cuisine.minimum_servings > 1 && (
                              <span className="text-sm text-gray-500">
                                Min. {cuisine.minimum_servings} servings
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Servings:</label>
                            <input
                              type="number"
                              min={cuisine.minimum_servings ?? 1}
                              max={99}
                              value={cuisineQuantities[cuisine.id] ?? (cuisine.minimum_servings ?? 1)}
                              onChange={(e) => setCuisineQuantities((prev) => ({
                                ...prev,
                                [cuisine.id]: Math.max(cuisine.minimum_servings ?? 1, parseInt(e.target.value, 10) || 1)
                              }))}
                              className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (isUnavailable) return
                                const qty = cuisineQuantities[cuisine.id] ?? (cuisine.minimum_servings ?? 1)
                                setAddingCuisineId(cuisine.id)
                                addToCart({
                                  id: `cuisine_${cuisine.id}`,
                                  name: cuisine.name,
                                  price: Number(cuisine.price) || 0,
                                  image_url: cuisine.image_url,
                                  chef_id: chef.id,
                                  cuisine_id: cuisine.id,
                                  type: 'cuisine'
                                }, qty)
                                setAddingCuisineId(null)
                                navigate('/cart')
                              }}
                              disabled={addingCuisineId === cuisine.id || isUnavailable}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] touch-manipulation bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              {isUnavailable ? 'Unavailable' : addingCuisineId === cuisine.id ? 'Adding...' : 'Add to Cart'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Gallery */}
          {chef.gallery_images && chef.gallery_images.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Gallery</h2>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {chef.gallery_images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setGalleryLightbox(idx)}
                    className="w-full h-24 rounded overflow-hidden focus:ring-2 focus:ring-primary-500"
                  >
                    <img
                      src={resolveImageUrl(img)}
                      alt={`Gallery ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </button>
                ))}
              </div>
              {galleryLightbox != null && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                  onClick={() => setGalleryLightbox(null)}
                  role="dialog"
                  aria-label="Gallery lightbox"
                >
                  <button type="button" onClick={() => setGalleryLightbox(null)} className="absolute top-4 right-4 text-white p-2" aria-label="Close">
                    <X className="h-8 w-8" />
                  </button>
                  {galleryLightbox > 0 && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setGalleryLightbox(galleryLightbox - 1) }} className="absolute left-4 text-white p-2 bg-black/50 rounded-full">‹</button>
                  )}
                  <img
                    src={resolveImageUrl(chef.gallery_images[galleryLightbox])}
                    alt={`Gallery ${galleryLightbox + 1}`}
                    className="max-w-full max-h-[90vh] object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {galleryLightbox < chef.gallery_images.length - 1 && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setGalleryLightbox(galleryLightbox + 1) }} className="absolute right-4 text-white p-2 bg-black/50 rounded-full">›</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Reviews ({chef.reviews?.length || 0})
            </h2>
            {chef.reviews && chef.reviews.length > 0 ? (
              <div className="space-y-2">
                {chef.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-2 last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{review.customer_name}</p>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {(review.cuisine_quality != null || review.service_quality != null || review.value_for_money != null) && (
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-1">
                        {review.cuisine_quality != null && <span>Cuisine: {review.cuisine_quality}/5</span>}
                        {review.service_quality != null && <span>Service: {review.service_quality}/5</span>}
                        {review.value_for_money != null && <span>Value: {review.value_for_money}/5</span>}
                      </div>
                    )}
                    {review.title && (
                      <h4 className="text-sm font-medium text-gray-900 mb-0.5">{review.title}</h4>
                    )}
                    {review.comment && (
                      <p className="text-xs text-gray-700 mb-1">{review.comment}</p>
                    )}
                    {review.chef_response && (
                      <div className="mt-1 pl-2 border-l-2 border-primary-200 bg-gray-50 p-1.5 rounded text-xs">
                        <p className="text-xs font-medium text-gray-900 mb-0.5">Chef's Response:</p>
                        <p className="text-xs text-gray-700">{review.chef_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No reviews yet</p>
            )}
          </div>

          {/* Similar chefs */}
          {chef.similar_chefs && chef.similar_chefs.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
              <h2 className="text-lg font-bold text-gray-900 mb-3">More chefs you might like</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {chef.similar_chefs.map((s) => (
                  <Link key={s.id} to={`/chefs/${s.id}`} className="flex flex-col items-center p-2 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow">
                    {s.profile_image_url ? (
                      <img src={resolveImageUrl(s.profile_image_url)} alt={s.chef_name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center"><ChefHat className="h-8 w-8 text-primary-600" /></div>
                    )}
                    <p className="text-sm font-semibold text-gray-900 mt-1 truncate w-full text-center">{s.chef_name}</p>
                    {s.average_rating > 0 && <p className="text-xs text-gray-500">{s.average_rating.toFixed(1)} ★</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Service Details */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h3 className="text-base font-bold text-gray-900 mb-2">Service Details</h3>
            <div className="space-y-2">
              {chef.service_radius_km && (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  <span>{chef.service_radius_km}km radius</span>
                </div>
              )}
              {chef.estimated_prep_time_minutes && (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Clock className="h-4 w-4 text-primary-600" />
                  <span>~{chef.estimated_prep_time_minutes} min</span>
                </div>
              )}
              {chef.minimum_order_amount && chef.minimum_order_amount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <DollarSign className="h-4 w-4 text-primary-600" />
                  <span>Min: ${chef.minimum_order_amount.toFixed(2)}</span>
                </div>
              )}
              {chef.service_fee && chef.service_fee > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <DollarSign className="h-4 w-4 text-primary-600" />
                  <span>Fee: ${chef.service_fee.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Service: Delivery & Pickup */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h3 className="text-base font-bold text-gray-900 mb-2">Order options</h3>
            <div className="flex flex-wrap gap-2 text-sm text-gray-700">
              {chef.accepts_delivery !== false && <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded"><Truck className="h-4 w-4" /> Delivery</span>}
              {chef.accepts_pickup !== false && <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded">Pickup</span>}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h3 className="text-base font-bold text-gray-900 mb-2">Contact</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p>{chef.street_address}</p>
              <p>{chef.city}, {chef.state} {chef.postal_code}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {chef.phone && (
                <a href={`tel:${chef.phone}`} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
                  <Phone className="h-4 w-4" /> Call
                </a>
              )}
              {chef.website_url && (
                <a href={chef.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
                  Visit Website
                </a>
              )}
            </div>
            <Link to="/contact" className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
              <MessageCircle className="h-4 w-4" /> Message / Request custom order
            </Link>
          </div>

          {/* Social Media */}
          {chef.social_media_links && Object.keys(chef.social_media_links).length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
              <h3 className="text-base font-bold text-gray-900 mb-2">Follow</h3>
              <div className="space-y-1">
                {chef.social_media_links.facebook && (
                  <a
                    href={chef.social_media_links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary-600 hover:underline"
                  >
                    Facebook
                  </a>
                )}
                {chef.social_media_links.instagram && (
                  <a
                    href={chef.social_media_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary-600 hover:underline"
                  >
                    Instagram
                  </a>
                )}
                {chef.social_media_links.youtube && (
                  <a
                    href={chef.social_media_links.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary-600 hover:underline"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {minPrice != null && minPrice > 0 && (
            <span className="text-sm font-bold text-primary-600">From ${minPrice.toFixed(2)}</span>
          )}
          <span className="text-sm text-gray-600 truncate">View menu above</span>
        </div>
        <Link
          to="#cuisine-offerings"
          className="flex-shrink-0 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700"
        >
          Order now
        </Link>
      </div>
    </div>
  )
}

export default ChefDetail

