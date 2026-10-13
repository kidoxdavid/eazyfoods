/**
 * HTTP client that uses Capacitor's native HTTP on device (bypasses CORS)
 * and falls back to regular fetch/axios on web.
 *
 * CapacitorHttp is built into @capacitor/core v5+ — no extra install needed.
 * Native HTTP calls never go through the WebView so CORS headers are irrelevant.
 */
import axios from 'axios'

const PROD = 'https://eazyfoods-api.onrender.com/api/v1'

function isNative() {
  try {
    return !!(window.Capacitor?.isNativePlatform?.())
  } catch {
    return false
  }
}

function resolveBase() {
  try {
    const stored = localStorage.getItem('API_BASE_URL')
    if (stored?.startsWith('http')) return stored
    if (isNative()) return PROD
    const o = typeof window !== 'undefined' ? window.location.origin : ''
    if (o === 'https://localhost' || o === 'capacitor://localhost' || o.startsWith('file://')) return PROD
    const env = import.meta.env?.VITE_API_BASE_URL
    if (env?.startsWith('http')) return env
    return '/api/v1'
  } catch {
    return PROD
  }
}

function buildUrl(path) {
  const base = resolveBase().replace(/\/$/, '')
  const p = (path || '').replace(/^\//, '')
  return `${base}/${p}`
}

// Login-free identity: every browser/device gets its own guest id, sent as X-Customer-Id.
// The API provisions a private guest customer for it (cart, orders, addresses).
const GUEST_ID_KEY = 'eazy_guest_id'
export function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY)
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() ||
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
        }))
      localStorage.setItem(GUEST_ID_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

// ── Native path: CapacitorHttp (no CORS at all) ────────────────────────────
async function nativeRequest(method, url, data, params, extraHeaders = {}) {
  const { CapacitorHttp } = await import('@capacitor/core')
  const guestId = getGuestId()

  // Build query string for GET params
  let fullUrl = url
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString()
    fullUrl = qs ? `${url}?${qs}` : url
  }

  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
    ...(guestId ? { 'X-Customer-Id': guestId } : {}),
  }

  // CapacitorHttp cannot send FormData as JSON; detect and let it handle natively
  let body = undefined
  if (data !== undefined && data !== null) {
    if (data instanceof FormData) {
      delete headers['Content-Type'] // let native layer set multipart boundary
      body = data
    } else {
      body = typeof data === 'string' ? data : JSON.stringify(data)
    }
  }

  const res = await CapacitorHttp.request({
    method: method.toUpperCase(),
    url: fullUrl,
    headers,
    data: body,
    responseType: 'json',
  })

  if (res.status >= 400) {
    const err = new Error(res.data?.detail || `HTTP ${res.status}`)
    err.response = { status: res.status, data: res.data }
    err.config = { url }
    throw err
  }

  return { data: res.data, status: res.status, headers: res.headers }
}

// ── Web path: axios ────────────────────────────────────────────────────────
const axiosInstance = axios.create({ timeout: 30000, headers: { 'Content-Type': 'application/json' } })

axiosInstance.interceptors.request.use((config) => {
  if (!config.url?.startsWith('http')) config.url = buildUrl(config.url)
  const guestId = getGuestId()
  if (guestId) config.headers['X-Customer-Id'] = guestId
  if (config.data instanceof FormData) delete config.headers['Content-Type']
  return config
})

axiosInstance.interceptors.response.use(
  r => r,
  err => {
    const url = err.config?.url || ''
    const isPublic = /\/(customer\/products|customer\/stores|customer\/categories|auth\/login|auth\/signup|home-products|chefs|promotions|recipes)/.test(url)
    return Promise.reject(err)
  }
)

// ── Unified API surface (axios-compatible) ─────────────────────────────────
function makeMethod(method) {
  return async (path, dataOrConfig, config) => {
    // Resolve overloads:
    //   api.get(url, config?)
    //   api.post(url, data?, config?)
    let data, cfg
    if (method === 'get' || method === 'delete') {
      cfg = dataOrConfig
      data = undefined
    } else {
      data = dataOrConfig
      cfg = config
    }

    const url = buildUrl(path)
    const params = cfg?.params
    const extraHeaders = cfg?.headers || {}

    if (isNative()) {
      return nativeRequest(method, url, data, params, extraHeaders)
    }
    // Web: delegate to axios
    return axiosInstance({ method, url, data, params, headers: extraHeaders })
  }
}

const api = {
  get:    makeMethod('get'),
  post:   makeMethod('post'),
  put:    makeMethod('put'),
  patch:  makeMethod('patch'),
  delete: makeMethod('delete'),
}

export default api
