/**
 * Utility function to resolve image URLs for proxy compatibility
 * Ensures relative paths work correctly with the API proxy
 */
export const resolveImageUrl = (url) => {
  if (!url) return ''

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url)
      let path = urlObj.pathname + urlObj.search
      if (!path.startsWith('/api/v1') && path.startsWith('/')) {
        if (path.startsWith('/uploads/')) {
          path = `/api/v1${path}`
        } else if (!path.startsWith('/api/')) {
          path = `/api/v1${path}`
        }
      }
      return path
    } catch (e) {
      return url
    }
  }

  let path = url
  if (path.startsWith('/uploads/')) {
    path = `/api/v1${path}`
  } else if (!path.startsWith('/api/v1') && path.startsWith('/')) {
    path = `/api/v1${path}`
  } else if (!path.startsWith('/')) {
    if (url.includes('ad') || url.includes('ads') || url.includes('banner')) {
      path = `/api/v1/uploads/ads/${path}`
    } else {
      path = `/api/v1/uploads/products/${path}`
    }
  }

  return path
}
