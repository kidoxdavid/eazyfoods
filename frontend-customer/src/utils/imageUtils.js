/**
 * Utility function to resolve image URLs for mobile compatibility
 * Uses relative URLs so Vite proxy works correctly on mobile devices
 * @param {string|object} url - Image URL (string or {url: "..."})
 * @param {string} [type] - Optional: 'recipe' | 'product' | 'chef' | 'ad' - use for plain filenames
 */
export const resolveImageUrl = (url, type) => {
  if (url == null || url === '') return ''
  // Ensure we have a string (API might return objects like {url: "..."})
  const urlStr = typeof url === 'string' ? url : (url?.url ?? '')
  if (!urlStr) return ''

  // If it's already an absolute URL, convert to relative for proxy
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    // Extract the path from absolute URLs
    try {
      const urlObj = new URL(urlStr)
      // Use relative path so Vite proxy can handle it
      // This works on both desktop and mobile
      let path = urlObj.pathname + urlObj.search
      
      // Ensure it starts with /api/v1 for proxy to work
      if (!path.startsWith('/api/v1') && path.startsWith('/')) {
        // If path doesn't have /api/v1, check if it needs it
        if (path.startsWith('/uploads/')) {
          path = `/api/v1${path}`
        } else if (!path.startsWith('/api/')) {
          path = `/api/v1${path}`
        }
      }
      
      return path
    } catch (e) {
      console.error('[ImageUtils] Error parsing URL:', urlStr, e)
      // Fallback: try to extract path manually
      const match = urlStr.match(/\/api\/v1\/.*$/)
      if (match) {
        return match[0]
      }
      return urlStr
    }
  }
  
  // For relative paths, ensure they're properly formatted for proxy
  let path = urlStr
  
  // Ensure it starts with /api/v1 for proxy to work
  if (path.startsWith('/uploads/')) {
    path = `/api/v1${path}`
  } else if (!path.startsWith('/api/v1') && path.startsWith('/')) {
    // If it's a relative path but doesn't have /api/v1, add it
    path = `/api/v1${path}`
  } else if (!path.startsWith('/')) {
    // If no leading slash, try to determine the type based on common patterns
    // Extract filename only - avoid double-prefixing (e.g. "products/xxx" -> xxx, not products/products/xxx)
    const getFilename = (str, prefix) => {
      if (str.startsWith(prefix)) return str.slice(prefix.length).replace(/^\//, '')
      const match = str.match(new RegExp(`${prefix.replace(/\//g, '\\/')}\\/?([^/]+)$`))
      return match ? match[1] : str
    }
    if (urlStr.includes('ad') || urlStr.includes('ads') || urlStr.includes('banner')) {
      path = `/api/v1/uploads/ads/${getFilename(path, 'ads')}`
    } else if (urlStr.startsWith('recipes/') || /\/recipes\//.test(urlStr) || type === 'recipe') {
      const filename = path.replace(/^recipes\//, '').replace(/^.*\/recipes\//, '')
      path = `/api/v1/uploads/recipes/${filename || path}`
    } else if (urlStr.startsWith('products/') || /\/products\//.test(urlStr) || type === 'product') {
      const filename = path.replace(/^products\//, '').replace(/^.*\/products\//, '')
      path = `/api/v1/uploads/products/${filename || path}`
    } else if (urlStr.startsWith('uploads/')) {
      // "uploads/products/xxx" or "uploads/recipes/xxx" -> /api/v1/uploads/...
      path = `/api/v1/${path}`
    } else if (type === 'chef') {
      path = `/api/v1/uploads/chefs/${path}`
    } else if (type === 'ad') {
      path = `/api/v1/uploads/ads/${path}`
    } else {
      path = `/api/v1/uploads/products/${path}`
    }
  }
  
  // Return relative URL - Vite proxy will handle it correctly on mobile
  return path
}

