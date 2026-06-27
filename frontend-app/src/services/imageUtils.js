const API_ORIGIN = 'https://eazyfoods-api.onrender.com'

export function resolveImg(url) {
  if (!url) return ''
  const s = typeof url === 'string' ? url : (url?.url ?? url?.image_url ?? '')
  if (!s) return ''
  if (s.startsWith('http://') || s.startsWith('https://')) {
    // Replace localhost refs with production origin
    try {
      const u = new URL(s)
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return `${API_ORIGIN}${u.pathname}${u.search}`
      }
    } catch {}
    return s
  }
  if (s.startsWith('/api/v1')) return `${API_ORIGIN}${s}`
  if (s.startsWith('/uploads/')) return `${API_ORIGIN}/api/v1${s}`
  if (s.startsWith('/')) return `${API_ORIGIN}/api/v1${s}`
  if (s.startsWith('uploads/')) return `${API_ORIGIN}/api/v1/${s}`
  return `${API_ORIGIN}/api/v1/uploads/products/${s}`
}
