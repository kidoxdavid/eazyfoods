import { makeHttp, notFound } from '../../http'
import vendor, { myStores, currentStoreId, selectStore, clearStores } from '../../vendor/services/api'

/**
 * The original EAZyfoods chef portal talked to a different backend. This adapter keeps its pages unchanged: every call a page makes is answered from the
 * current API in the shape the page expects. Dishes are the original "cuisines". Orders, ads, promotions, payouts, reviews, support and chat are the same
 * store features the vendor portal uses, so they go through the same adapter.
 */
const { raw } = makeHttp('vendor')
const V = (p) => `/vendor${p}`
const fail = (status, detail) => Object.assign(new Error(detail), { response: { status, data: { detail } } })

/** A kitchen account works with its kitchen store (the portal is the same window as the vendor portal). */
let kitchenCache = null
async function kitchen() {
  if (kitchenCache) return kitchenCache
  const stores = await myStores()
  kitchenCache = stores.find((s) => s.kind === 'kitchen') ?? stores[0]
  if (kitchenCache) selectStore(kitchenCache.id)   // the shared store features (orders, ads, ...) read the selected store
  return kitchenCache
}
const kid = async () => (await kitchen())?.id

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const SPICE = ['mild', 'medium', 'hot', 'very_hot']   // 0..3 in our data (none is mild)
const TAGS = ['halal', 'vegan', 'vegetarian', 'pescatarian', 'gluten_free', 'dairy_free']

// ---------- dishes ("cuisines") ----------
function dishShape(d, store) {
  const tags = d.dish_tags || []
  return {
    id: d.product_id, chef_id: store?.id, name: d.name, description: d.description || '', cuisine_type: d.cuisine || '', price: d.price_cents / 100, price_per_person: null, minimum_servings: 1,
    image_url: d.image_url || '', images: d.images || [], ingredients: d.ingredients ? d.ingredients.split(/,\s*/).filter(Boolean) : [], allergens: d.allergens || [],
    spice_level: SPICE[d.spice_level ?? 1] || 'medium', prep_time_minutes: d.prep_minutes ?? null, serves: /^\d+$/.test(d.serves || '') ? parseInt(d.serves, 10) : 1, portions: d.stock_on_hand,
    is_vegetarian: tags.includes('vegetarian'), is_vegan: tags.includes('vegan'), is_gluten_free: tags.includes('gluten_free'), is_halal: tags.includes('halal'),
    is_pescatarian: tags.includes('pescatarian'), is_dairy_free: tags.includes('dairy_free'),
    status: d.status === 'draft' ? 'inactive' : !d.is_active ? 'inactive' : d.stock_on_hand - (d.stock_reserved || 0) <= 0 ? 'out_of_stock' : 'active', is_featured: false, slug: d.slug,
  }
}
function dishBody(d) {
  const tags = TAGS.filter((t) => d[`is_${t}`])
  const inactive = d.status === 'inactive'
  const portions = d.status === 'out_of_stock' ? 0 : Math.max(0, parseInt(d.portions, 10) || 0)
  const body = {
    name: d.name, description: d.description || null, cuisine: d.cuisine_type || null, price_cents: Math.round(Number(d.price) * 100), portions,
    serves: d.serves ? String(d.serves) : null, spice_level: Math.max(0, SPICE.indexOf(d.spice_level)), prep_minutes: d.prep_time_minutes ? Math.max(5, Number(d.prep_time_minutes)) : null,
    allergens: d.allergens || [], allergens_confirmed: d.allergens_confirmed === true ? true : undefined, ingredients: (d.ingredients || []).join(', ') || null, dish_tags: tags,
    image_url: d.image_url || null, images: d.images || [], is_active: !inactive,
  }
  return body
}

const SALE = { GET: 'get', POST: 'post', PUT: 'put', DELETE: 'delete' }

async function profile() {
  const st = await kitchen()
  const sid = st.id
  const [me, vp, sp, hours, branding, sched, rev] = await Promise.all([
    raw('GET', '/auth/me'), raw('GET', V('/profile')).catch(() => ({})), raw('GET', V(`/stores/${sid}/profile`)), raw('GET', V(`/stores/${sid}/hours`)).catch(() => []),
    raw('GET', V(`/stores/${sid}/branding`)).catch(() => ({})), raw('GET', V(`/stores/${sid}/schedule`)).catch(() => ({})), raw('GET', V(`/stores/${sid}/reviews/summary`)).catch(() => ({})),
  ])
  const [first, ...rest] = (me?.full_name || '').split(' ')
  const operating_hours = {}
  for (const h of hours) { const d = DAYS[h.dow]; if (d) (operating_hours[d] ||= []).push(`${h.opens}-${h.closes}`) }
  return {
    id: sp.id, email: me?.email, first_name: first, last_name: rest.join(' '), chef_name: sp.name, business_number: vp.business_number || '', phone: sp.phone || vp.phone || '', bio: sp.description || '', cuisine_description: branding.story || '',
    street_address: sp.address_line || '', city: sp.city || '', state: 'Alberta', postal_code: sp.postal_code || '', country: 'Canada', cuisines: sp.cuisines || [],
    profile_image_url: sp.logo_url || '', banner_image_url: sp.cover_url || '', gallery_images: sp.gallery || [], website_url: branding.website || '',
    social_media_links: { facebook: branding.facebook || '', instagram: branding.instagram || '' }, minimum_order_amount: sp.min_order_cents ? sp.min_order_cents / 100 : 0, offers_pickup: !!sp.offers_pickup, offers_delivery: !!sp.offers_delivery,
    is_available: !sp.ordering_paused, application_status: vp.status, verification_status: vp.status === 'approved' ? 'verified' : vp.status === 'rejected' ? 'rejected' : 'pending', is_active: sp.status === 'published',
    average_rating: rev.average ?? null, total_reviews: rev.count ?? 0, operating_hours, blocked_dates: (sched.closures || []).map((c) => c.on_date), kitchen_type: sp.kitchen_type, store_status: sp.status,
    preorders_enabled: !!sched.preorders_enabled, preorder_lead_minutes: sched.preorder_lead_minutes, preorder_max_days: sched.preorder_max_days, slot_minutes: sched.slot_minutes, slot_capacity: sched.slot_capacity,
  }
}

async function saveProfile(d) {
  const sid = await kid()
  const sp = {}
  if (d.is_available !== undefined) sp.ordering_paused = !d.is_available
  if (d.bio !== undefined) sp.description = d.bio || null
  if (d.street_address) sp.address_line = d.street_address
  if (d.city) sp.city = d.city
  if (d.postal_code) sp.postal_code = d.postal_code
  if (d.phone) sp.phone = d.phone
  if (d.cuisines) sp.cuisines = d.cuisines.slice(0, 8)
  if (d.offers_pickup !== undefined) sp.offers_pickup = !!d.offers_pickup
  if (d.offers_delivery !== undefined) sp.offers_delivery = !!d.offers_delivery
  if (d.minimum_order_amount !== undefined && d.minimum_order_amount !== null) sp.min_order_cents = Math.round(Number(d.minimum_order_amount || 0) * 100)
  if (d.profile_image_url !== undefined) sp.logo_url = d.profile_image_url || null
  if (d.banner_image_url !== undefined) sp.cover_url = d.banner_image_url || null
  if (Object.keys(sp).length) await raw('PUT', V(`/stores/${sid}/profile`), sp)

  if (d.first_name !== undefined || d.last_name !== undefined) {
    const me = await raw('GET', '/auth/me'); const [f, ...r] = (me?.full_name || '').split(' ')
    const name = `${d.first_name ?? f} ${d.last_name ?? r.join(' ')}`.trim()
    if (name && name !== me?.full_name) await raw('PUT', V('/me/name'), { full_name: name })
  }
  if (d.chef_name || d.phone || d.business_number !== undefined) {
    const p = await raw('GET', V('/profile'))
    if ((d.chef_name && d.chef_name !== p.name) || (d.phone && d.phone !== p.phone) || (d.business_number !== undefined && (d.business_number || null) !== (p.business_number || null))) await raw('PUT', V('/profile'), { name: d.chef_name || p.name, legal_name: p.legal_name, business_number: d.business_number !== undefined ? d.business_number || null : p.business_number, phone: d.phone || p.phone, contact_email: p.contact_email })
  }
  if (d.gallery_images !== undefined) await raw('PUT', V(`/stores/${sid}/gallery`), { images: d.gallery_images || [] })

  if (d.operating_hours !== undefined) {
    const hours = []
    for (const [day, windows] of Object.entries(d.operating_hours || {})) {
      const dow = DAYS.indexOf(day)
      for (const w of windows || []) { const m = /^\s*(\d{1,2}):(\d\d)\s*-\s*(\d{1,2}):(\d\d)\s*$/.exec(w); if (m && dow >= 0) hours.push({ dow, opens: `${m[1].padStart(2, '0')}:${m[2]}`, closes: `${m[3].padStart(2, '0')}:${m[4]}` }) }
    }
    await raw('PUT', V(`/stores/${sid}/hours`), { hours })
  }
  if (d.blocked_dates !== undefined || d.preorders_enabled !== undefined) {
    const cur = await raw('GET', V(`/stores/${sid}/schedule`))
    await raw('PUT', V(`/stores/${sid}/schedule`), {
      preorders_enabled: d.preorders_enabled ?? cur.preorders_enabled, preorder_lead_minutes: d.preorder_lead_minutes ?? cur.preorder_lead_minutes, preorder_max_days: d.preorder_max_days ?? cur.preorder_max_days,
      slot_minutes: d.slot_minutes ?? cur.slot_minutes, slot_capacity: d.slot_capacity ?? cur.slot_capacity,
      closures: d.blocked_dates !== undefined ? d.blocked_dates.map((on_date) => ({ on_date, reason: null })) : cur.closures,
    })
  }
  if (d.cuisine_description !== undefined || d.website_url !== undefined || d.social_media_links) {
    const b = await raw('GET', V(`/stores/${sid}/branding`))
    const https = (u) => (u && /^https:\/\//.test(u) ? u : u ? `https://${String(u).replace(/^https?:\/\//, '')}` : null)
    await raw('PUT', V(`/stores/${sid}/branding`), {
      accent: b.accent ?? null, tagline: b.tagline ?? null, story: d.cuisine_description !== undefined ? d.cuisine_description || null : b.story ?? null, announcement: b.announcement ?? null, featured_slugs: b.featured_slugs || [],
      website: d.website_url !== undefined ? https(d.website_url) : b.website ?? null, instagram: d.social_media_links ? https(d.social_media_links.instagram) : b.instagram ?? null, facebook: d.social_media_links ? https(d.social_media_links.facebook) : b.facebook ?? null,
    }).catch((e) => { if (e.response?.status !== 403) throw e })   // the storefront page is a capability the team can switch off
  }
  return profile()
}

// ---------- orders: a cook accepts, then marks ready ----------
const slotText = (o) => (o.scheduled_for ? `SCHEDULED for ${new Date(o.scheduled_for).toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${o.scheduled_until ? ' to ' + new Date(o.scheduled_until).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : ''}` : '')
const orderOut = (o) => ({ ...o, special_instructions: [slotText(o), o.special_instructions].filter(Boolean).join('\n'), status: o.status === 'picking' ? 'accepted' : o.status, customer_contact: { name: o.customer_name }, cancellation_reason: o.cancellation_reason || null, customer_notes: '', ready_at: null,
  items: (o.items || []).map((i) => ({ ...i, product_price: i.unit_price, subtotal: i.total_price })) })

const routes = [
  ['GET', /^\/chef\/(auth\/me|profile)$/, async () => profile()],
  ['PUT', /^\/chef\/profile$/, async (m, { data }) => saveProfile(data)],

  ['GET', /^\/chef\/cuisines\/?$/, async () => { const st = await kitchen(); return (await raw('GET', V(`/stores/${st.id}/dishes`))).dishes.map((d) => dishShape(d, st)) }],
  ['GET', /^\/chef\/cuisines\/([0-9a-f-]{36})$/, async (m) => {
    const st = await kitchen(); const d = (await raw('GET', V(`/stores/${st.id}/dishes`))).dishes.find((x) => x.product_id === m[1])
    if (!d) throw fail(404, 'Dish not found')
    return dishShape(d, st)
  }],
  ['POST', /^\/chef\/cuisines\/?$/, async (m, { data }) => { const st = await kitchen(); const r = await raw('POST', V(`/stores/${st.id}/dishes`), dishBody(data)); return { id: r.product_id, ...r } }],
  ['PUT', /^\/chef\/cuisines\/([0-9a-f-]{36})$/, async (m, { data }) => { await raw('PUT', V(`/stores/${await kid()}/dishes/${m[1]}`), dishBody(data)); return { id: m[1] } }],
  ['DELETE', /^\/chef\/cuisines\/([0-9a-f-]{36})$/, async (m) => raw('DELETE', V(`/stores/${await kid()}/dishes/${m[1]}`))],

  ['GET', /^\/chef\/dashboard\/stats$/, async () => { await kitchen(); return (await vendor.get('/dashboard/stats')).data }],

  ['GET', /^\/chef\/orders\/?$/, async (m, { params }) => {
    await kitchen()
    const list = (await vendor.get('/orders', { params: {} })).data.map(orderOut)
    return list.filter((o) => !params.status || params.status === 'all' || o.status === params.status)
      .map((o) => ({ id: o.id, order_number: o.order_number, status: o.status, total_amount: o.total_amount, payment_status: o.payment_status, created_at: o.created_at, scheduled_for: o.scheduled_for, scheduled_until: o.scheduled_until, delivery_method: o.delivery_method }))
  }],
  ['GET', /^\/chef\/orders\/export\/csv$/, async () => {
    await kitchen()
    const rows = (await vendor.get('/orders', { params: {} })).data
    const csv = ['Order,Status,Total,Placed', ...rows.map((o) => [o.order_number, o.status, o.total_amount.toFixed(2), o.created_at].join(','))].join('\n')
    return new Blob([csv], { type: 'text/csv' })
  }],
  ['GET', /^\/chef\/orders\/([0-9a-f-]{36})$/, async (m) => { await kitchen(); return orderOut((await vendor.get(`/orders/${m[1]}`)).data) }],
  ['PUT', /^\/chef\/orders\/([0-9a-f-]{36})\/accept$/, async (m) => { await kitchen(); await vendor.put(`/orders/${m[1]}/accept`); return { ok: true } }],
  ['PUT', /^\/chef\/orders\/([0-9a-f-]{36})\/mark-ready$/, async (m) => {
    await kitchen()
    const o = (await vendor.get(`/orders/${m[1]}`)).data
    if (o.status === 'new') await vendor.put(`/orders/${m[1]}/accept`)
    await vendor.put(`/orders/${m[1]}/start-picking`)   // cooking starts, then it is ready
    await vendor.put(`/orders/${m[1]}/mark-ready`)
    return { ok: true }
  }],
  ['PUT', /^\/chef\/orders\/([0-9a-f-]{36})\/complete$/, async (m) => { await kitchen(); await vendor.put(`/orders/${m[1]}/complete`); return { ok: true } }],   // a pickup order handed over
  ['PUT', /^\/chef\/orders\/([0-9a-f-]{36})\/cancel$/, async (m, { params }) => { await kitchen(); await raw('POST', V(`/suborders/${m[1]}/reject`), { reason: params.cancellation_reason || 'Cancelled by the kitchen' }); return { ok: true } }],

  ['GET', /^\/chef\/reviews$/, async () => (await vendor.get('/reviews', { params: {} })).data.map((r) => ({ id: r.id, rating: r.rating, title: r.title, comment: r.comment, customer_name: r.customer_name, created_at: r.created_at,
    chef_response: r.vendor_response, chef_response_at: r.vendor_response_at, cuisine_quality: null, service_quality: null, value_for_money: null }))],
  ['POST', /^\/chef\/reviews\/([0-9a-f-]{36})\/respond$/, async (m, { data }) => { await kitchen(); return (await vendor.put(`/reviews/${m[1]}/respond`, { vendor_response: data.response || data.chef_response })).data }],

  // ----- payouts (our team pays out through the same Stripe-connected account as stores) -----
  ['GET', /^\/chef\/me\/stripe-connect\/status$/, async () => (await vendor.get('/vendors/me/stripe-connect/status')).data],
  ['POST', /^\/chef\/me\/stripe-connect\/onboard$/, async () => (await vendor.post('/vendors/me/stripe-connect/onboard')).data],
  ['GET', /^\/chef\/payouts\/balance$/, async () => (await vendor.get('/payouts/balance/available')).data],
  ['GET', /^\/chef\/payouts\/stats$/, async () => (await vendor.get('/payouts/summary/stats')).data],
  ['GET', /^\/chef\/payouts\/?$/, async () => (await vendor.get('/payouts')).data],
  ['GET', /^\/chef\/payouts\/statement\/csv$/, async () => {
    const rows = (await vendor.get('/payouts')).data
    return new Blob([['Payout,Status,Amount,Created', ...rows.map((p) => [p.payout_number, p.status, p.net_amount.toFixed(2), p.created_at].join(','))].join('\n')], { type: 'text/csv' })
  }],

  // ----- promotions, support, chat, ads: the same features as the store portal -----
  ['GET', /^\/chef\/promotions\/?$/, async () => { await kitchen(); return (await vendor.get('/promotions')).data.map((p) => ({ ...p, cuisine_ids: p.product_ids })) }],
  ['POST', /^\/chef\/promotions\/?$/, async (m, { data }) => { await kitchen(); return (await vendor.post('/promotions', { ...data, product_ids: data.cuisine_ids })).data }],
  ['PUT', /^\/chef\/promotions\/([0-9a-f-]{36})$/, async (m, { data }) => { await kitchen(); return (await vendor.put(`/promotions/${m[1]}`, { ...data, product_ids: data.cuisine_ids })).data }],
  ['DELETE', /^\/chef\/promotions\/([0-9a-f-]{36})$/, async (m) => { await kitchen(); return (await vendor.delete(`/promotions/${m[1]}`)).data }],
  ['GET', /^\/chef\/support\/?$/, async () => (await vendor.get('/support')).data],
  ['POST', /^\/chef\/support\/?$/, async (m, { data }) => (await vendor.post('/support', data)).data],
  ['GET', /^\/chef\/chat\/messages$/, async (m, { params }) => (await vendor.get('/vendor/chat/messages', { params })).data],
  ['POST', /^\/chef\/chat\/messages$/, async (m, { data }) => (await vendor.post('/vendor/chat/messages', data)).data],
  ['GET', /^\/chef\/marketing\/config$/, async () => (await vendor.get('/vendor/marketing/config')).data],
  ['GET', /^\/chef\/marketing\/ads\/?$/, async () => { await kitchen(); return (await vendor.get('/vendor/marketing/ads')).data }],
  ['GET', /^\/chef\/marketing\/ads\/([0-9a-f-]{36})$/, async (m) => (await vendor.get(`/vendor/marketing/ads/${m[1]}`)).data],
  ['POST', /^\/chef\/marketing\/ads\/?$/, async (m, { data }) => { await kitchen(); return (await vendor.post('/vendor/marketing/ads', data)).data }],
  ['PUT', /^\/chef\/marketing\/ads\/([0-9a-f-]{36})\/(pause|activate)$/, async (m) => (await vendor.put(`/vendor/marketing/ads/${m[1]}/${m[2]}`)).data],
  ['PUT', /^\/chef\/marketing\/ads\/([0-9a-f-]{36})$/, async (m, { data }) => (await vendor.put(`/vendor/marketing/ads/${m[1]}`, data)).data],
  ['DELETE', /^\/chef\/marketing\/ads\/([0-9a-f-]{36})$/, async (m) => (await vendor.delete(`/vendor/marketing/ads/${m[1]}`)).data],

  ['GET', /^\/chef\/analytics\/summary$/, async (m, { params }) => {
    await kitchen()
    const r = (await vendor.get('/analytics/sales-report', { params })).data
    return { period_start: r.period_start, period_end: r.period_end, total_orders: r.total_orders, total_revenue: r.total_revenue, total_commission: r.total_commission, net_payout: r.net_payout, average_order_value: r.average_order_value,
      by_cuisine: (r.top_products || []).map((p) => ({ cuisine_id: p.product_id, cuisine_name: p.product_name, order_lines: p.total_sold, revenue: p.revenue })) }
  }],

  // The ad pages are the store portal's, with dishes in place of products.
  ['GET', /^\/products\/?$/, async () => { const st = await kitchen(); return (await raw('GET', V(`/stores/${st.id}/dishes`))).dishes.map((d) => ({ id: d.product_id, name: d.name, image_url: d.image_url, price: d.price_cents / 100, status: 'active' })) }],

  // ----- uploads: one public image store for everything -----
  ['POST', /^\/uploads\/(image|chefs|chef-gallery|ads)$/, async (m, { data }) => raw('POST', '/uploads/image', data, { isForm: true })],
  ['GET', /^\/config\/signup-documentation$/, async () => ({ require_chef_docs: false })],
]

const PASS = /^\/vendor\/marketing\//
function request(method, url, config = {}) {
  if (PASS.test(url)) return vendor[method.toLowerCase()](url, ...(method === 'GET' || method === 'DELETE' ? [config] : [config?.data, config]))
  const [path, qs] = url.split('?')
  const params = { ...Object.fromEntries(new URLSearchParams(qs || '')), ...(config.params || {}) }
  const route = routes.find(([m, re]) => m === method && re.test(path))
  if (!route) return Promise.reject(notFound(`${method} ${path}`))
  return Promise.resolve(route[2](route[1].exec(path), { params, data: config.data, config })).then((data) => ({ data, status: 200 }))
}

export const resolveUploadUrl = (url) => url
export const getApiOrigin = () => window.location.origin
export const clearKitchen = () => { kitchenCache = null; clearStores() }
const api = {
  get: (url, config) => request('GET', url, config),
  delete: (url, config) => request('DELETE', url, config),
  post: (url, data, config) => request('POST', url, { ...config, data }),
  put: (url, data, config) => request('PUT', url, { ...config, data }),
  patch: (url, data, config) => request('PATCH', url, { ...config, data }),
  defaults: { headers: { common: {} } },
}
void SALE
export default api
