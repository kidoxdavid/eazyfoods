import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useLocation } from '../contexts/LocationContext'
import { useAuth } from '../contexts/AuthContext'
import { resolveImageUrl } from '../utils/imageUtils'

const AdSlideshow = () => {
  const [ads, setAds] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const authContext = useAuth()
  const token = (authContext && authContext.token) ? authContext.token : null
  const { selectedCity } = useLocation()

  // Check if ads were dismissed in localStorage (but reset on page reload for new ads)
  useEffect(() => {
    setDismissed(false)
  }, [])

  // Helper function to resolve media URLs (for uploaded images/videos)
  const resolveMediaUrl = (url) => {
    if (!url) return ''
    // Use the same image resolution logic for consistency
    // This handles localhost URLs and relative paths correctly
    return resolveImageUrl(url)
  }

  useEffect(() => {
    if (!token) {
      setAds([])
      setLoading(false)
      return
    }
    fetchAds()
  }, [selectedCity, token])

  const fetchAds = async () => {
    try {
      // Home top banner accepts both home_top_banner (new) and home_banner (legacy)
      const homePlacements = ['home_top_banner', 'home_banner']
      let adsData = []

      for (const placement of homePlacements) {
        const params = {
          placement,
          status: 'active',
          approval_status: 'approved'
        }
        if (selectedCity && selectedCity !== 'All') {
          params.city = selectedCity
        }
        const response = await api.get('/customer/marketing/ads', { params })
        const data = Array.isArray(response.data) ? response.data : []
        adsData = adsData.concat(data)
      }

      // Dedupe by ad id
      const seen = new Set()
      adsData = adsData.filter(ad => {
        if (seen.has(ad.id)) return false
        seen.add(ad.id)
        return true
      })

      // Fallback: fetch without placement filter if still empty
      if (adsData.length === 0) {
        const fallbackParams = {
          status: 'active',
          approval_status: 'approved'
        }
        if (selectedCity && selectedCity !== 'All') {
          fallbackParams.city = selectedCity
        }
        const response = await api.get('/customer/marketing/ads', { params: fallbackParams })
        const allAds = Array.isArray(response.data) ? response.data : []
        adsData = allAds.filter(ad => !ad.placement || ad.placement === 'home_top_banner' || ad.placement === 'home_banner')
      }
      
      // Backend already filtered by dates, so just sort by priority
      const sortedAds = adsData.sort((a, b) => (b.priority || 0) - (a.priority || 0))
      
      console.log('AdSlideshow: Fetched ads', { 
        total: adsData.length,
        ads: sortedAds.map(ad => ({ 
          id: ad.id, 
          name: ad.name, 
          placement: ad.placement,
          image_url: ad.image_url, 
          video_url: ad.video_url,
          start_date: ad.start_date,
          end_date: ad.end_date,
          status: ad.status,
          approval_status: ad.approval_status,
          slideshow_duration: ad.slideshow_duration,
          transition_style: ad.transition_style
        }))
      })
      
      setAds(sortedAds)
      if (sortedAds.length > 0) {
        setCurrentIndex(0)
      }
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      })
      
      // If it's a network error, the backend might not be running
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        console.warn('AdSlideshow: Network error - backend may not be running or proxy not working')
      }
      
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ads.length === 0 || dismissed) return

    const currentAd = ads[currentIndex]
    const duration = (currentAd?.slideshow_duration || 5) * 1000 // Convert to milliseconds
    const transitionTime = 500 // Transition animation time in ms

    // Start transition animation slightly before switching
    const transitionStartTimer = setTimeout(() => {
      setTransitioning(true)
    }, duration - transitionTime)
    
    // Switch to next ad
    const switchTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length)
      // Reset transition after switching
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

  const handleDismiss = () => {
    setDismissed(true)
  }

  if (loading) {
    // Show default banner while loading so it's visible on mobile
    return (
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white overflow-hidden" style={{ height: '240px', minHeight: '240px', maxHeight: '240px', display: 'block', width: '100%', position: 'relative', zIndex: 1 }}>
        <div className="w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Welcome to eazyfoods</h1>
            <p className="text-xs sm:text-sm md:text-base mb-3 sm:mb-4 text-white/90">
              Authentic African Groceries Delivered to Your Doorstep
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (dismissed || ads.length === 0) {
    // Show default welcome message if no ads or dismissed
    return (
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white overflow-hidden" style={{ height: '240px', minHeight: '240px', maxHeight: '240px', display: 'block', width: '100%' }}>
        <div className="w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Welcome to eazyfoods</h1>
            <p className="text-xs sm:text-sm md:text-base mb-3 sm:mb-4 text-white/90">
              Authentic African Groceries Delivered to Your Doorstep
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <Link
                to="/stores"
                className="inline-block bg-white text-primary-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-nude-100 transition-colors text-xs sm:text-sm"
              >
                Browse Stores
              </Link>
              <Link
                to="/groceries"
                className="btn-shop-all inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-colors text-xs sm:text-sm"
              >
                Shop All Groceries
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const currentAd = ads[currentIndex]
  
  // Determine if we have an image or video to use as background
  const hasImage = currentAd.image_url
  const hasVideo = currentAd.video_url
  const imageUrl = hasImage ? resolveMediaUrl(currentAd.image_url) : null
  const videoUrl = hasVideo ? resolveMediaUrl(currentAd.video_url) : null
  const transitionStyle = currentAd?.transition_style || 'fade'
  
  // Get transition classes and styles based on style
  const getTransitionProps = () => {
    if (transitioning) {
      switch (transitionStyle) {
        case 'slide':
          return {
            className: 'transform transition-transform duration-500',
            style: { transform: 'translateX(-100%)' }
          }
        case 'fade':
          return {
            className: 'transition-opacity duration-500',
            style: { opacity: 0 }
          }
        case 'none':
          return {
            className: '',
            style: {}
          }
        default:
          return {
            className: 'transition-opacity duration-500',
            style: { opacity: 0 }
          }
      }
    }
    return {
      className: transitionStyle === 'slide' ? 'transform transition-transform duration-500' : transitionStyle === 'fade' ? 'transition-opacity duration-500' : '',
      style: {}
    }
  }
  
  const transitionProps = getTransitionProps()

  return (
    <div className="relative w-full bg-gradient-to-r from-primary-600 to-primary-800 text-white overflow-hidden" style={{ height: '240px', minHeight: '240px', maxHeight: '240px', display: 'block', width: '100%', position: 'relative', zIndex: 1 }}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
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
      <div className={`w-full h-full flex items-center relative overflow-hidden ${transitionProps.className}`} style={transitionProps.style}>
        {/* Image/Video Background Section - extends to create fade effect */}
        {(imageUrl || videoUrl) && (
          <div 
            className="h-full relative"
            style={{
              width: '55%',
              backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              maskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)'
            }}
          >
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
        
        {/* Text Content Section - 50% width (or 100% if no image) with fade from left */}
        <div 
          className={`h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 relative ${(imageUrl || videoUrl) ? 'w-1/2' : 'w-full'}`}
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
                  <Link
                    to={currentAd.cta_link}
                    className="inline-block bg-white text-primary-600 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-nude-100 transition-colors text-xs sm:text-sm md:text-base shadow-lg hover:shadow-xl"
                    onClick={() => {
                      // Track click
                      if (currentAd.id) {
                        api.post(`/customer/marketing/ads/${currentAd.id}/click`).catch(console.error)
                      }
                    }}
                  >
                    {currentAd.cta_text}
                  </Link>
                )}
                {/* Always show Browse Stores and Shop All Groceries buttons */}
                <Link
                  to="/stores"
                  className="inline-block bg-white/90 text-primary-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-white transition-colors text-xs sm:text-sm shadow-md hover:shadow-lg"
                >
                  Browse Stores
                </Link>
                <Link
                  to="/groceries"
                  className="btn-shop-all inline-block bg-white/90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-colors text-xs sm:text-sm shadow-md hover:shadow-lg"
                >
                  Shop All Groceries
                </Link>
              </div>

              {/* Slide indicators */}
              {ads.length > 1 && (
                <div className="flex justify-center gap-2 mt-4 sm:mt-5">
                  {ads.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
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

export default AdSlideshow

