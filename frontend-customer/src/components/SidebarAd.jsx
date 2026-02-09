import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { resolveImageUrl } from '../utils/imageUtils'
import { X } from 'lucide-react'

const SidebarAd = ({ placement, position = 'left' }) => {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [dismissedAds, setDismissedAds] = useState(new Set())
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
      console.log('[SidebarAd] Fetching ads for placement:', placement)
      const response = await api.get('/customer/marketing/ads', {
        params: { placement, limit: 2, status: 'active', approval_status: 'approved' }
      })
      const adsData = Array.isArray(response.data) ? response.data : []
      console.log('[SidebarAd] Received ads:', adsData.length, adsData)
      
      // Filter by date to ensure ads are currently active
      const now = new Date()
      const activeAds = adsData.filter(ad => {
        if (ad.start_date && new Date(ad.start_date) > now) {
          console.log('[SidebarAd] Ad filtered out - start_date in future:', ad.id, ad.start_date)
          return false
        }
        if (ad.end_date && new Date(ad.end_date) < now) {
          console.log('[SidebarAd] Ad filtered out - end_date in past:', ad.id, ad.end_date)
          return false
        }
        return true
      })
      
      console.log('[SidebarAd] Active ads after date filter:', activeAds.length, activeAds)
      setAds(activeAds.slice(0, 2)) // Limit to 2 ads max
    } catch (error) {
      console.error('[SidebarAd] Failed to fetch sidebar ads:', error)
      setAds([])
    } finally {
      setLoading(false)
    }
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

  // Check if dismissed ads in localStorage
  useEffect(() => {
    const dismissed = new Set()
    ads.forEach(ad => {
      const dismissedKey = `sidebar_ad_dismissed_${placement}_${ad.id}`
      if (localStorage.getItem(dismissedKey) === 'true') {
        dismissed.add(ad.id)
      }
    })
    setDismissedAds(dismissed)
  }, [ads, placement])

  const handleDismiss = (adId) => {
    const dismissedKey = `sidebar_ad_dismissed_${placement}_${adId}`
    localStorage.setItem(dismissedKey, 'true')
    setDismissedAds(prev => new Set([...prev, adId]))
  }

  // Debug logging
  useEffect(() => {
    console.log('[SidebarAd] Render state:', {
      placement,
      position,
      loading,
      dismissedAdsCount: dismissedAds.size,
      adsCount: ads.length,
      willRender: !loading && ads.length > 0
    })
  }, [placement, position, loading, dismissedAds.size, ads.length])

  if (!token || loading) {
    return null
  }
  
  // Filter out dismissed ads
  const visibleAds = ads.filter(ad => !dismissedAds.has(ad.id))
  
  if (visibleAds.length === 0) {
    console.log('[SidebarAd] Not rendering - no visible ads')
    return null
  }

  const renderAd = (ad, index) => {
    const imageUrl = ad.image_url ? resolveImageUrl(ad.image_url) : null
    
    return (
      <div key={ad.id} className="mb-4 last:mb-0">
        {/* Ad Section Label - only show on first ad */}
        {index === 0 && (
          <div className="mb-2 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Advertisement</span>
          </div>
        )}
        
        <div
          className="relative overflow-hidden cursor-pointer group bg-white rounded-lg shadow-md border border-gray-200"
          onClick={() => handleAdClick(ad.id, ad.cta_link)}
        >
          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDismiss(ad.id)
            }}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Dismiss ad"
          >
            <X className="h-3 w-3 text-white" />
          </button>

          {/* Ad Image */}
          {imageUrl && (
            <div className="relative w-full aspect-square overflow-hidden">
              <img
                src={imageUrl}
                alt={ad.title || ad.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  console.error('[SidebarAd] Image failed to load:', {
                    originalUrl: ad.image_url,
                    resolvedUrl: imageUrl,
                    adId: ad.id
                  })
                  e.target.style.display = 'none'
                }}
              />
              {/* Overlay gradient for text readability */}
              {(ad.title || ad.description || ad.cta_text) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3">
                  {ad.title && (
                    <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">{ad.title}</h3>
                  )}
                  {ad.description && (
                    <p className="text-white text-xs mb-2 line-clamp-2">{ad.description}</p>
                  )}
                  {ad.cta_text && (
                    <button
                      className="w-full px-3 py-1.5 bg-primary-600 text-white rounded text-xs font-semibold hover:bg-primary-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAdClick(ad.id, ad.cta_link)
                      }}
                    >
                      {ad.cta_text}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Text-only ad */}
          {!imageUrl && (ad.title || ad.description) && (
            <div className="p-4 text-center">
              {ad.title && (
                <h3 className="font-bold text-sm mb-2 text-gray-900">{ad.title}</h3>
              )}
              {ad.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-3">{ad.description}</p>
              )}
              {ad.cta_text && (
                <button
                  className="w-full px-3 py-2 bg-primary-600 text-white rounded text-xs font-semibold hover:bg-primary-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAdClick(ad.id, ad.cta_link)
                  }}
                >
                  {ad.cta_text}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // If only one ad, render it at the top
  if (visibleAds.length === 1) {
    return (
      <div 
        className={`absolute ${position === 'left' ? 'left-4' : 'right-4'} z-30 hidden lg:block`}
        style={{ 
          width: '200px',
          top: '256px' // 240px banner height + 16px margin
        }}
      >
        {renderAd(visibleAds[0], 0)}
      </div>
    )
  }

  // If two ads, render one at top and one at bottom
  return (
    <>
      {/* Top Ad */}
      <div 
        className={`absolute ${position === 'left' ? 'left-4' : 'right-4'} z-30 hidden lg:block`}
        style={{ 
          width: '200px',
          top: '256px' // 240px banner height + 16px margin
        }}
      >
        {renderAd(visibleAds[0], 0)}
      </div>
      
      {/* Bottom Ad */}
      <div 
        className={`absolute ${position === 'left' ? 'left-4' : 'right-4'} z-30 hidden lg:block`}
        style={{ 
          width: '200px',
          bottom: '16px' // Position from bottom
        }}
      >
        {renderAd(visibleAds[1], 1)}
      </div>
    </>
  )
}

export default SidebarAd

