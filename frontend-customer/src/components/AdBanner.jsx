import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { resolveImageUrl } from '../utils/imageUtils'

const AdBanner = ({ placement }) => {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const authContext = useAuth()
  const token = (authContext && authContext.token) ? authContext.token : null

  useEffect(() => {
    if (!token) {
      setAds([])
      setLoading(false)
      return
    }
    fetchAds()
  }, [placement, token])

  const fetchAds = async () => {
    try {
      const response = await api.get('/customer/marketing/ads', {
        params: { placement, limit: 5 }
      })
      setAds(response.data || [])
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdClick = async (adId, ctaLink) => {
    try {
      await api.post(`/customer/marketing/ads/${adId}/click`)
      if (ctaLink) {
        if (ctaLink.startsWith('http')) {
          window.open(ctaLink, '_blank')
        } else {
          window.location.href = ctaLink
        }
      }
    } catch (error) {
      console.error('Failed to track click:', error)
      // Still navigate even if tracking fails
      if (ctaLink) {
        if (ctaLink.startsWith('http')) {
          window.open(ctaLink, '_blank')
        } else {
          window.location.href = ctaLink
        }
      }
    }
  }

  if (loading || ads.length === 0) {
    return null
  }

  // Display the first ad for this placement
  const ad = ads[0]

  const imageUrl = ad.image_url ? resolveImageUrl(ad.image_url) : null

  return (
    <div
      className="w-full rounded-lg overflow-hidden mb-6 cursor-pointer bg-gradient-to-r from-primary-600 to-primary-800 text-white"
      style={{
        height: '240px',
        minHeight: '240px',
        maxHeight: '240px'
      }}
      onClick={() => handleAdClick(ad.id, ad.cta_link)}
    >
      <div className="w-full h-full flex items-center relative overflow-hidden">
        {/* Image Section - 55% width with fade effect */}
        {imageUrl && (
          <div 
            className="h-full relative"
            style={{
              width: '55%',
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              maskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)'
            }}
          >
            {/* Dark overlay for better text readability */}
            <div 
              className="absolute inset-0 bg-black/20"
              style={{
                maskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)'
              }}
            ></div>
            <img
              src={imageUrl}
              alt={ad.title || ad.name}
              className="w-full h-full object-cover"
              style={{
                maskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black 70%, transparent 100%)'
              }}
              onError={(e) => {
                console.error('[AdBanner] Image failed to load:', {
                  originalUrl: ad.image_url,
                  resolvedUrl: imageUrl,
                  adId: ad.id,
                  adTitle: ad.title || ad.name
                })
                e.target.style.display = 'none'
              }}
            />
          </div>
        )}
        
        {/* Text Content Section - 45% width (or 100% if no image) */}
        <div 
          className={`h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 relative ${imageUrl ? 'w-[45%]' : 'w-full'}`}
        >
          <div className="relative z-10 w-full">
            <div className="text-center w-full max-w-2xl mx-auto">
              {ad.title && (
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 drop-shadow-lg">
                  {ad.title}
                </h1>
              )}
              
              {ad.description && (
                <p className="text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4 text-white/95 drop-shadow-md line-clamp-2 sm:line-clamp-3">
                  {ad.description}
                </p>
              )}

              {ad.cta_text && (
                <button
                  className="inline-block bg-white text-primary-600 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-nude-100 transition-colors text-xs sm:text-sm md:text-base shadow-lg hover:shadow-xl"
                  style={{
                    fontFamily: ad.design_data?.fontFamily || 'Arial',
                    fontSize: `${(ad.design_data?.fontSize || 16) * 0.875}px`
                  }}
                >
                  {ad.cta_text}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdBanner

