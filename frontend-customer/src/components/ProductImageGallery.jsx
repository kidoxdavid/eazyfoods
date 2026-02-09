import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, RotateCw } from 'lucide-react'
import { resolveImageUrl } from '../utils/imageUtils'

const ProductImageGallery = ({ images, productName, mainImage, imageType = 'product' }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [is360View, setIs360View] = useState(false)
  const [current360Index, setCurrent360Index] = useState(0)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const zoomIntervalRef = useRef(null)

  // Combine main image with additional images; normalize to strings (API may return objects)
  const toUrl = (img) => (typeof img === 'string' ? img : (img?.url ?? img?.image_url ?? img?.src ?? ''))
  const rawImages = mainImage ? [mainImage, ...(images || [])] : (images || [])
  const allImages = rawImages.map(toUrl).filter(Boolean)

  // Check if we have enough images for 360° view (at least 8 images from different angles)
  const has360View = allImages.length >= 8

  const currentImage = is360View
    ? allImages[Math.min(current360Index, allImages.length - 1)]
    : allImages[selectedIndex]

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setSelectedIndex(0)
  }, [mainImage, images])

  // Reset load state when switching to a different image in the gallery
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [selectedIndex, current360Index, is360View])

  // Timeout: if image hasn't loaded in 10s, treat as failed to avoid infinite loading
  useEffect(() => {
    if (!currentImage) return
    const timer = setTimeout(() => {
      setImageLoaded((loaded) => {
        if (!loaded) {
          setImageError(true)
        }
        return true
      })
    }, 10000)
    return () => clearTimeout(timer)
  }, [currentImage])

  // Handle 360° view auto-rotation
  useEffect(() => {
    if (is360View && allImages.length >= 8) {
      zoomIntervalRef.current = setInterval(() => {
        setCurrent360Index((prev) => (prev + 1) % Math.min(allImages.length, 24))
      }, 150) // Rotate every 150ms for smooth animation
    } else {
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current)
      }
    }
    return () => {
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current)
      }
    }
  }, [is360View, allImages.length])

  const handleMouseMove = (e) => {
    if (!imageRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const nextImage = () => {
    if (is360View) {
      setCurrent360Index((prev) => (prev + 1) % Math.min(allImages.length, 24))
    } else {
      setSelectedIndex((prev) => (prev + 1) % allImages.length)
    }
  }

  const prevImage = () => {
    if (is360View) {
      setCurrent360Index((prev) => (prev - 1 + Math.min(allImages.length, 24)) % Math.min(allImages.length, 24))
    } else {
      setSelectedIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
    }
  }

  if (!allImages || allImages.length === 0) {
    return (
      <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No Image</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div 
        ref={containerRef}
        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-zoom-in border border-gray-200 shadow-sm"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Blur-up placeholder with low-res preview - hide when loaded or error */}
        {!imageLoaded && currentImage && !imageError && (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center overflow-hidden z-10">
            {/* Low-res blur preview - silent fail, don't block */}
            <img
              src={resolveImageUrl(currentImage, imageType)}
              alt=""
              className="w-full h-full object-cover blur-md scale-110 opacity-50"
              style={{ filter: 'blur(20px)' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            {/* Loading spinner overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* Main Image */}
        {currentImage && (
          <>
            <img
              ref={imageRef}
              src={resolveImageUrl(currentImage, imageType)}
              alt={productName}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
              onLoad={handleImageLoad}
              loading="lazy"
              onError={(e) => {
                console.error('[ProductImageGallery] Image failed to load:', currentImage)
                setImageError(true)
                setImageLoaded(true)
                e.target.style.display = 'none'
              }}
              style={
                isZoomed && imageLoaded
                  ? {
                      transform: `scale(2.5)`,
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      transition: 'transform 0.1s ease-out',
                      cursor: 'zoom-out'
                    }
                  : {
                      cursor: isZoomed ? 'zoom-out' : 'zoom-in'
                    }
              }
            />

            {/* Zoom Indicator */}
            {isZoomed && imageLoaded && (
              <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm backdrop-blur-md shadow-lg animate-pulse">
                <ZoomIn className="h-4 w-4" />
                <span className="hidden sm:inline">Hover to Zoom</span>
              </div>
            )}
            {!isZoomed && imageLoaded && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4" />
                <span className="hidden sm:inline">Hover to Zoom</span>
              </div>
            )}

            {/* 360° View Indicator */}
            {has360View && (
              <button
                onClick={() => setIs360View(!is360View)}
                className={`absolute top-4 left-4 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm backdrop-blur-sm transition-all ${
                  is360View
                    ? 'bg-primary-600 text-white'
                    : 'bg-black/50 text-white hover:bg-black/70'
                }`}
                title={is360View ? 'Exit 360° View' : 'View 360°'}
              >
                <RotateCw className="h-4 w-4" />
                <span>{is360View ? '360° View' : '360°'}</span>
              </button>
            )}

            {/* Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image Counter */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
                {is360View 
                  ? `${current360Index + 1} / ${Math.min(allImages.length, 24)}`
                  : `${selectedIndex + 1} / ${allImages.length}`
                }
              </div>
            )}

            {/* Fallback - shown when image fails to load or times out */}
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 image-fallback" 
              style={{ display: imageError ? 'flex' : 'none' }}
            >
              No Image
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {allImages.length > 1 && !is360View && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
          {allImages.slice(0, 8).map((img, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                selectedIndex === index
                  ? 'border-primary-600 ring-2 ring-primary-200 scale-105'
                  : 'border-transparent hover:border-gray-300 hover:scale-105'
              }`}
            >
              <img
                src={resolveImageUrl(img, imageType)}
                alt={`${productName} ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                  const fb = e.target.parentElement?.querySelector('.thumb-fallback')
                  if (fb) fb.classList.remove('hidden')
                }}
              />
              <div className="thumb-fallback hidden absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                No Image
              </div>
            </button>
          ))}
          {allImages.length > 8 && (
            <button
              onClick={() => setSelectedIndex(8)}
              className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-300 bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-medium"
            >
              +{allImages.length - 8} more
            </button>
          )}
        </div>
      )}

      {/* 360° View Controls */}
      {is360View && has360View && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">360° Interactive View</span>
            <button
              onClick={() => setIs360View(false)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Exit 360° View
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrent360Index(Math.max(0, current360Index - 1))}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center text-sm text-gray-600">
              Frame {current360Index + 1} of {Math.min(allImages.length, 24)}
            </div>
            <button
              onClick={() => setCurrent360Index(Math.min(Math.min(allImages.length, 24) - 1, current360Index + 1))}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {is360View ? 'Auto-rotating... Click arrows to control manually' : 'Click to start 360° view'}
          </p>
        </div>
      )}
    </div>
  )
}

export default ProductImageGallery

