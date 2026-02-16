/**
 * Get API origin for building absolute image URLs.
 * Uses the same sources as the API client so ad/product images load when the app
 * points to a remote API (e.g. customer app on Vercel, API on Render).
 * E.g. https://eazyfoods-api.onrender.com/api/v1 -> https://eazyfoods-api.onrender.com
 */
const getApiOrigin = () => {
  let base = ''
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('API_BASE_URL')
    if (stored && (stored.startsWith('http://') || stored.startsWith('https://'))) base = stored
    else if (window.API_BASE_URL && (window.API_BASE_URL.startsWith('http://') || window.API_BASE_URL.startsWith('https://'))) base = window.API_BASE_URL
  }
  if (!base && import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL
    if (typeof envUrl === 'string' && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) base = envUrl
  }
  if (!base || typeof base !== 'string') return ''
  try {
    const u = new URL(base)
    return u.origin
  } catch {
    return ''
  }
}

/**
 * Utility function to resolve image URLs for mobile compatibility.
 * In production (VITE_API_BASE_URL set to Render API), prepends API origin so images load from the API host.
 * @param {string|object} url - Image URL (string or {url: "..."})
 * @param {string} [type] - Optional: 'recipe' | 'product' | 'chef' | 'ad' - use for plain filenames
 */
export const resolveImageUrl = (url, type) => {
  if (url == null || url === '') return ''
  // Ensure we have a string (API might return objects like {url: "..."})
  const urlStr = typeof url === 'string' ? url : (url?.url ?? '')
  if (!urlStr) return ''

  const apiOrigin = getApiOrigin()

  // If it's already an absolute URL, return as-is (backend may return full URLs when API_PUBLIC_URL set)
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr
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
    // Paths that already contain uploads/ (e.g. from chef ad uploads: "api/v1/uploads/chefs/xxx" or "uploads/chefs/xxx")
    if (urlStr.includes('/uploads/') || urlStr.startsWith('uploads/')) {
      path = path.startsWith('/api/v1') ? path : `/api/v1/${path.replace(/^\/?api\/v1\/?/, '')}`
    } else if (urlStr.includes('ad') || urlStr.includes('ads') || urlStr.includes('banner')) {
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
  
  // In production with VITE_API_BASE_URL, prepend API origin so images load from Render (not Vercel)
  if (apiOrigin) {
    return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`
  }
  return path
}

