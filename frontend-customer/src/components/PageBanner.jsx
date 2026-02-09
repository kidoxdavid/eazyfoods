import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useLocation } from '../contexts/LocationContext'
import { useAuth } from '../contexts/AuthContext'
import { resolveImageUrl } from '../utils/imageUtils'

const PageBanner = ({ title, subtitle, placement, defaultContent, variant = 'primary', size = 'normal' }) => {
  const [ads, setAds] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [parallaxOffset, setParallaxOffset] = useState(0)
  const bannerRef = useRef(null)
  const authContext = useAuth()
  const token = (authContext && authContext.token) ? authContext.token : null
  const locationContext = useLocation()
  const selectedCity = (locationContext && locationContext.selectedCity) ? locationContext.selectedCity : 'All'

  useEffect(() => {
    if (!token) {
      setAds([])
      setLoading(false)
      return
    }
    setAds([])
    setLoading(true)
    setCurrentIndex(0)
    fetchAds()
  }, [placement, selectedCity, token])

  // Parallax effect on scroll (only for top banners; bottom banner keeps image fixed)
  useEffect(() => {
    if (size === 'tall') return
    const handleScroll = () => {
      if (!bannerRef.current) return
      
      const rect = bannerRef.current.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      const bannerTop = rect.top + scrollY
      const viewportHeight = window.innerHeight
      
      // Calculate parallax offset (slower scroll for background)
      if (rect.top < viewportHeight && rect.bottom > 0) {
        const parallaxSpeed = 0.5 // Adjust for more/less parallax effect
        const offset = (scrollY - bannerTop + viewportHeight) * parallaxSpeed
        setParallaxOffset(offset)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [ads, currentIndex, size])

  const resolveMediaUrl = (url) => {
    if (!url) return ''
    // Use the same image resolution logic for consistency
    // This handles localhost URLs and relative paths correctly
    // resolveImageUrl returns a relative path like /api/v1/uploads/ads/image.jpg
    // This works fine with img src tags and the Vite proxy
    return resolveImageUrl(url)
  }

  // Legacy placement fallbacks for backward compatibility (new format -> legacy)
  const LEGACY_PLACEMENTS = {
    home_top_banner: ['home_banner'],
    home_bottom_banner: ['home_banner', 'home_bottom'],
    products_top_banner: ['products_banner', 'groceries_banner'],
    products_bottom_banner: [],
    stores_top_banner: ['stores_banner'],
    stores_bottom_banner: [],
    chefs_top_banner: ['chefs_banner'],
    chefs_bottom_banner: [],
    cart_top_banner: ['cart_banner'],
    cart_bottom_banner: [],
    orders_top_banner: ['orders_banner'],
    orders_bottom_banner: [],
    profile_top_banner: ['profile_banner'],
    profile_bottom_banner: [],
    about_top_banner: ['about_banner'],
    about_bottom_banner: [],
    contact_top_banner: ['contact_banner'],
    contact_bottom_banner: [],
    meals_top_banner: ['meals_banner'],
    meals_bottom_banner: [],
    top_market_deals_top_banner: ['top_market_deals_banner'],
    top_market_deals_bottom_banner: [],
    checkout_top_banner: ['checkout_banner'],
    checkout_bottom_banner: [],
    become_a_driver_top_banner: [],
    become_a_driver_bottom_banner: []
  }

  const fetchAds = async () => {
    try {
      const placementsToTry = [placement, ...(LEGACY_PLACEMENTS[placement] || [])]
      let adsData = []

      for (const p of placementsToTry) {
        const params = {
          placement: p,
          status: 'active',
          approval_status: 'approved'
        }
        if (selectedCity && selectedCity !== 'All') {
          params.city = selectedCity
        }
        const response = await api.get('/customer/marketing/ads', { params })
        const data = (response && response.data && Array.isArray(response.data)) ? response.data : []
        const seen = new Set(adsData.map(a => a.id))
        data.forEach(ad => { if (ad && ad.id && !seen.has(ad.id)) { seen.add(ad.id); adsData.push(ad) } })
        if (adsData.length > 0) break
      }

      // If still no ads, try without placement filter and filter client-side
      if (adsData.length === 0) {
        const fallbackParams = { status: 'active', approval_status: 'approved' }
        if (selectedCity && selectedCity !== 'All') {
          fallbackParams.city = selectedCity
        }
        const response = await api.get('/customer/marketing/ads', { params: fallbackParams })
        const allAds = (response && response.data && Array.isArray(response.data)) ? response.data : []
        const allowed = new Set([placement, ...(LEGACY_PLACEMENTS[placement] || [])])
        adsData = allAds.filter(ad => ad && (!ad.placement || allowed.has(ad.placement)))
      }

      // Filter by date and sort by priority
      const now = new Date()
      const activeAds = adsData.filter(ad => {
        if (ad.start_date && new Date(ad.start_date) > now) return false
        if (ad.end_date && new Date(ad.end_date) < now) return false
        return true
      }).sort((a, b) => (b.priority || 0) - (a.priority || 0))

      setAds(activeAds)
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-advance slideshow
  useEffect(() => {
    if (ads.length <= 1 || dismissed) return

    const currentAd = ads[currentIndex]
    const duration = (currentAd?.slideshow_duration || 5) * 1000
    const transitionTime = 500

    const transitionStartTimer = setTimeout(() => {
      setTransitioning(true)
    }, duration - transitionTime)

    const switchTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length)
      setTimeout(() => setTransitioning(false), 50)
    }, duration)

    return () => {
      clearTimeout(transitionStartTimer)
      clearTimeout(switchTimer)
    }
  }, [currentIndex, ads, dismissed])

  const handlePrevious = () => {
    setTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length)
      setTimeout(() => setTransitioning(false), 50)
    }, 250)
  }

  const handleNext = () => {
    setTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length)
      setTimeout(() => setTransitioning(false), 50)
    }, 250)
  }

  const handleAdClick = async (adId, ctaLink) => {
    try {
      await api.post(`/customer/marketing/ads/${adId}/click`)
    } catch (error) {
      console.error('Failed to track click:', error)
    }
    if (ctaLink) {
      if (ctaLink.startsWith('http')) {
        window.open(ctaLink, '_blank')
      } else {
        window.location.href = ctaLink
      }
    }
  }

  // Default banner gradient by variant
  const defaultBannerClass = variant === 'orange'
    ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600'
    : 'bg-gradient-to-r from-primary-600 to-primary-700'
  const bannerHeight = size === 'tall' ? 'auto' : '240px'
  const bannerMinHeight = size === 'tall' ? '200px' : '240px'

  // Show default banner if loading, dismissed, or no ads
  if (loading || dismissed || ads.length === 0) {
    return (
      <div className={`${defaultBannerClass} text-white px-4 sm:px-6 lg:px-8 mb-6 overflow-hidden`} style={{ height: bannerHeight, minHeight: bannerMinHeight, maxHeight: size === 'tall' ? 'none' : '240px', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-7xl mx-auto w-full">
          {defaultContent || (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{title}</h1>
              {subtitle && <p className="text-white/90 text-sm sm:text-base">{subtitle}</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  // Safety check: ensure currentIndex is valid
  const safeIndex = currentIndex >= 0 && currentIndex < ads.length ? currentIndex : 0
  const currentAd = ads[safeIndex]
  
  if (!currentAd) {
    return (
      <div className={`${defaultBannerClass} text-white px-4 sm:px-6 lg:px-8 mb-6 overflow-hidden`} style={{ height: bannerHeight, minHeight: bannerMinHeight, maxHeight: size === 'tall' ? 'none' : '240px', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-7xl mx-auto w-full">
          {defaultContent || (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{title}</h1>
              {subtitle && <p className="text-white/90 text-sm sm:text-base">{subtitle}</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  const hasImage = currentAd?.image_url
  const hasVideo = currentAd?.video_url
  const imageUrl = hasImage ? resolveMediaUrl(currentAd.image_url) : null
  const videoUrl = hasVideo ? resolveMediaUrl(currentAd.video_url) : null
  const transitionStyle = currentAd?.transition_style || 'fade'

  const getTransitionClasses = () => {
    if (!transitioning) return ''
    switch (transitionStyle) {
      case 'slide':
        return 'transform transition-transform duration-500'
      case 'fade':
      default:
        return 'opacity-0 transition-opacity duration-500'
    }
  }

  return (
    <div 
      ref={bannerRef}
      className="relative w-full bg-gradient-to-r from-primary-600 to-primary-800 text-white overflow-hidden mb-6" 
      style={{ height: bannerHeight, minHeight: bannerMinHeight, maxHeight: size === 'tall' ? 'none' : '240px', display: 'block', width: '100%', position: 'relative', zIndex: 1 }}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
        aria-label="Dismiss ad"
      >
        <X className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {/* Navigation arrows */}
      {ads.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
            aria-label="Previous ad"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
            aria-label="Next ad"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* Ad content - fixed height container with image background */}
      <div className={`w-full h-full flex items-center relative overflow-hidden ${getTransitionClasses()}`}>
        {/* Image/Video Background Section - extends to create fade effect */}
        {(imageUrl || videoUrl) && (
          <div 
            className="h-full relative overflow-hidden"
            style={{
              width: '55%',
              maskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
            }}
          >
            {/* Image */}
            {imageUrl && (
              <img
                src={imageUrl}
                alt={currentAd.title || 'Banner'}
                className="absolute inset-0 w-full h-full object-cover"
                style={size === 'tall'
                  ? {}
                  : {
                      transform: `translateY(${parallaxOffset * 0.3}px)`,
                      transition: 'transform 0.1s ease-out',
                      objectPosition: `center ${parallaxOffset}px`
                    }}
                loading="lazy"
                onError={(e) => {
                  console.error('[PageBanner] Image failed to load:', {
                    originalUrl: currentAd.image_url,
                    resolvedUrl: imageUrl,
                    fullUrl: window.location.origin + imageUrl
                  })
                  e.target.style.display = 'none'
                }}
              />
            )}
            {/* Video overlay if video exists */}
            {videoUrl && (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  maskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)'
                }}
                onError={(e) => {
                  console.error('Preview video failed to load:', currentAd.video_url, 'Resolved:', videoUrl)
                  e.target.style.display = 'none'
                }}
              >
                Your browser does not support the video tag.
              </video>
            )}
            {/* Dark overlay for better text readability */}
            <div 
              className="absolute inset-0 bg-black/20"
              style={{
                maskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)'
              }}
            ></div>
          </div>
        )}
        
        {/* Text Content Section - 45% width (or 100% if no image) with fade from left */}
        <div 
          className={`h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 relative ${(imageUrl || videoUrl) ? 'w-[45%]' : 'w-full'}`}
        >
          {/* Content wrapper */}
          <div className="relative z-10 w-full">
            <div className="text-center w-full max-w-2xl mx-auto">
              {currentAd.title && (
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 drop-shadow-lg">
                  {currentAd.title}
                </h1>
              )}
              
              {currentAd.description && (
                <p className="text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4 text-white/95 drop-shadow-md line-clamp-2 sm:line-clamp-3">
                  {currentAd.description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                {currentAd.cta_text && currentAd.cta_link && (
                  <button
                    onClick={() => handleAdClick(currentAd.id, currentAd.cta_link)}
                    className="inline-block bg-white text-primary-600 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-nude-100 transition-colors text-xs sm:text-sm md:text-base shadow-lg hover:shadow-xl"
                  >
                    {currentAd.cta_text}
                  </button>
                )}
              </div>

              {/* Fallback to default title if no ad title */}
              {!currentAd.title && (
                <>
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 drop-shadow-lg">{title}</h1>
                  {subtitle && <p className="text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4 text-white/95 drop-shadow-md">{subtitle}</p>}
                </>
              )}

              {/* Slide indicators */}
              {ads.length > 1 && (
                <div className="flex justify-center gap-2 mt-4 sm:mt-5">
                  {ads.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setTransitioning(true)
                        setTimeout(() => {
                          setCurrentIndex(index)
                          setTimeout(() => setTransitioning(false), 50)
                        }, 250)
                      }}
                      className={`h-1.5 sm:h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'w-6 sm:w-8 bg-white'
                          : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PageBanner

