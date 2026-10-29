import { makeHttp, notFound } from '../../http'

/**
 * The original EAZyfoods vendor portal talked to a different backend. This adapter keeps its pages unchanged: every call the pages make
 * (`api.get('/products/')`, `api.delete('/products/ID')`, ...) is answered from the current API, in the shape the page expects.
 * Anything with no equivalent yet answers "not available" so a page shows its empty state instead of breaking.
 */
const { raw } = makeHttp('vendor')

const pendingDocs = new Map()   // documents picked on the registration form, sent once the business exists
const STORE_KEY = 'ez_vendor_store'
let storesCache = null
export async function myStores(force = false) {
  if (!storesCache || force) storesCache = await raw('GET', '/vendor/stores')
  return storesCache
}
export const clearStores = () => { storesCache = null }
export async function currentStoreId() {
  const stores = await myStores()
  const saved = localStorage.getItem(STORE_KEY)
  return (stores.find((s) => s.id === saved) ?? stores[0])?.id ?? null
}
export const selectStore = (id) => localStorage.setItem(STORE_KEY, id)

const clean = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]))
const productBody = (d) => clean({ ...d, price: d.price === '' || d.price == null ? undefined : Number(d.price), sale_price: d.sale_price ? Number(d.sale_price) : null,
  stock_quantity: Number(d.stock_quantity || 0), low_stock_threshold: Number(d.low_stock_threshold ?? 3), image_url: d.image_url || null, images: (d.images || []).filter(Boolean),
  track_expiry: !!d.track_expiry, expiry_date: d.track_expiry && d.expiry_date ? d.expiry_date : null, category_id: d.category_id || null })

const sid = async (d) => (d && d.store_id) || (await currentStoreId())
const V = (p) => `/vendor${p}`

async function promoCreate(d) {
  const sid = await currentStoreId()
  const products = await raw('GET', V(`/stores/${sid}/catalogue`))
  const targets = d.applies_to_all_products ? products : products.filter((p) => (d.product_ids || []).includes(p.id))
  if (!targets.length) throw Object.assign(new Error('Choose at least one product'), { response: { status: 400, data: { detail: 'Choose at least one product' } } })
  const group = crypto.randomUUID()
  const type = d.discount_type === 'fixed' || d.promotion_type === 'fixed_amount' ? 'fixed' : 'percentage'
  let made = 0
  for (const p of targets) {
    const regular = p.sale_price ? p.price : p.price
    const sale = type === 'fixed' ? regular - Number(d.discount_value) : regular * (1 - Number(d.discount_value) / 100)
    const cents = Math.round(sale * 100)
    if (cents <= 0 || cents >= Math.round(regular * 100)) continue
    await raw('POST', V(`/stores/${sid}/promotions`), { product_id: p.id, sale_price_cents: cents, starts_at: new Date(d.start_date).toISOString(), ends_at: new Date(d.end_date).toISOString(),
      group_id: group, name: d.name, description: d.description || undefined, discount_type: type, discount_value: Number(d.discount_value) })
    made++
  }
  if (!made) throw Object.assign(new Error('Nothing to discount'), { response: { status: 400, data: { detail: 'That discount would not lower any selected product’s price.' } } })
  return { id: group, products: made }
}
async function promoCancel(id) {
  const sid = await currentStoreId()
  const rows = await raw('GET', V(`/stores/${sid}/promotions`))
  const mine = rows.filter((r) => (r.group_id || r.id) === id && r.state !== 'cancelled')
  for (const r of mine) await raw('DELETE', V(`/stores/${sid}/promotions/${r.id}`))
  return { ok: true }
}

const REGION_NAME = { 'west-africa': 'West African', 'east-africa': 'East African', 'north-africa': 'North African', 'central-africa': 'Central African', 'southern-africa': 'South African' }
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
function storeShape(s, p, all) {
  return {
    id: s.id, name: s.name, description: p.description || '', store_code: '', street_address: p.address_line || '', city: p.city || '', state: 'Alberta', postal_code: p.postal_code || '', phone: p.phone || '', email: '',
    is_active: !p.ordering_paused && p.status === 'published', is_primary: all[0]?.id === s.id, pickup_available: !!p.offers_pickup, delivery_available: !!p.offers_delivery,
    delivery_radius_km: 0, delivery_fee: 0, minimum_order_amount: p.min_order_cents ? p.min_order_cents / 100 : 0, timezone: 'America/Edmonton', average_rating: 0, total_reviews: 0, status: p.status,
  }
}
function storeBodyOut(d) {
  return { name: d.name, description: d.description || null, address_line: d.street_address, city: d.city || 'Calgary', postal_code: d.postal_code, phone: d.phone || null,
    min_order_cents: d.minimum_order_amount ? Math.round(Number(d.minimum_order_amount) * 100) : null, offers_delivery: !!d.delivery_available, offers_pickup: !!d.pickup_available }
}
function storeProfileOut(d) {
  const o = {}
  if (d.description !== undefined) o.description = d.description || null
  if (d.street_address) o.address_line = d.street_address
  if (d.city) o.city = d.city
  if (d.postal_code) o.postal_code = d.postal_code
  if (d.phone) o.phone = d.phone
  if (d.minimum_order_amount !== undefined) o.min_order_cents = d.minimum_order_amount ? Math.round(Number(d.minimum_order_amount) * 100) : null
  if (d.delivery_available !== undefined) o.offers_delivery = !!d.delivery_available
  if (d.pickup_available !== undefined) o.offers_pickup = !!d.pickup_available
  if (d.is_active !== undefined) o.ordering_paused = !d.is_active
  return o
}

function adShape(a) {
  return { id: a.id, name: a.title, ad_type: 'banner', title: a.title, description: a.body || '', image_url: a.image_url || '', video_url: '', cta_text: 'Shop Now', cta_link: '', placement: a.placement, priority: 0,
    start_date: a.starts_at, end_date: a.ends_at, approval_status: a.status === 'pending' || a.status === 'rejected' ? a.status : 'approved', status: a.status === 'paused' ? 'paused' : a.status === 'approved' ? 'active' : 'inactive',
    approved_at: a.status === 'approved' || a.status === 'paused' ? a.starts_at : null, impressions: a.impressions, clicks: a.clicks, spent: (a.spent_cents || 0) / 100, budget: a.budget_cents / 100, review_note: a.review_note }
}

// Our order steps -> the steps the original portal knows.
const STATUS = { placed: 'new', accepted: 'accepted', preparing: 'picking', ready: 'ready', out_for_delivery: 'in_transit', delivered: 'delivered', collected: 'picked_up', rejected: 'cancelled', cancelled: 'cancelled', expired: 'cancelled' }
export function orderShape(r) {
  const cents = (c) => (c ?? 0) / 100
  const delivery = r.fulfilment_method === 'delivery'
  const status = STATUS[r.status] || r.status
  let delivery_status = null
  if (delivery && ['ready', 'out_for_delivery', 'delivered'].includes(r.status)) delivery_status = r.status === 'delivered' ? 'delivered' : r.status === 'out_for_delivery' ? 'in_transit' : r.driver_id ? 'accepted' : 'awaiting_driver'
  return {
    id: r.id, order_number: r.order_number, status, delivery_status, delivery_method: delivery ? 'delivery' : 'pickup', payment_status: r.payment_status,
    created_at: r.placed_at || r.created_at, customer_name: r.customer_first_name || 'Customer', customer_email: '', special_instructions: r.delivery_instructions || r.gift_message || '',
    subtotal: cents(r.subtotal_cents), tax_amount: cents(r.tax_cents), shipping_amount: cents(r.delivery_cents), discount_amount: cents(r.discount_cents), total_amount: cents(r.total_cents),
    gross_sales: cents(r.subtotal_cents), commission_rate: (r.commission_bps ?? 0) / 100, commission_amount: cents(r.commission_cents), net_payout: cents(r.subtotal_cents - r.commission_cents),
    items: (r.lines || []).map((l) => ({ id: l.id, product_name: l.name + (l.pack_label ? ` (${l.pack_label})` : ''), quantity: l.quantity, unit_price: cents(l.unit_price_cents), total_price: cents(l.unit_price_cents * l.quantity), status: l.status })),
    scheduled_for: r.scheduled_for || null, scheduled_until: r.scheduled_until || null,
    driver_id: r.driver_id || null,
    driver: r.driver_id ? { name: r.driver_first_name, phone: r.driver_phone, vehicle_type: r.driver_vehicle } : null,
    delivery: delivery_status ? { status: delivery_status } : null, needs_attention: r.needs_attention, store_name: r.store_name,
  }
}

/** [method, pattern, handler(match, { params, data, config })] */
const routes = [
  ['GET', /^\/vendors\/me$/, async () => {
    const stores = await myStores()
    const sid = await currentStoreId()
    const [me, vp, sp, hours] = await Promise.all([raw('GET', '/auth/me'), raw('GET', V('/profile')).catch(() => ({})), sid ? raw('GET', V(`/stores/${sid}/profile`)).catch(() => ({})) : {}, sid ? raw('GET', V(`/stores/${sid}/hours`)).catch(() => []) : []])
    const [first, ...rest] = (me?.full_name || '').split(' ')
    const operating_hours = {}
    for (const h of hours) { const d = DAYS[h.dow]; if (d && !operating_hours[d]) operating_hours[d] = { open: h.opens, close: h.closes } }
    return { id: me?.id, email: me?.email, first_name: first, last_name: rest.join(' '), business_name: vp.name || stores[0]?.name || 'Vendor', business_number: vp.business_number || '', legal_name: vp.legal_name || '', phone: vp.phone || sp.phone || '', status: sp.ordering_paused ? 'inactive' : 'active',
      description: sp.description || '', store_profile_image_url: sp.logo_url || '', store_cover_image_url: sp.cover_url || '', street_address: sp.address_line || '', city: sp.city || '', state: 'Alberta', postal_code: sp.postal_code || '', country: 'Canada',
      pickup_available: !!sp.offers_pickup, delivery_available: !!sp.offers_delivery, delivery_radius_km: 5, region: (sp.regions || []).map((r) => REGION_NAME[r]).filter(Boolean).join(','), operating_hours, stores, approval_status: vp.status, kind: sp.kind }
  }],
  ['PUT', /^\/vendors\/me$/, async (m, { data: d }) => {
    // Active / inactive toggles whether the store takes new orders (the original hid products; here the store stays visible but pauses checkout).
    const sid = await currentStoreId()
    const sp = {}
    if (d.status) sp.ordering_paused = d.status !== 'active'
    if (d.description !== undefined) sp.description = d.description || null
    if (d.street_address) sp.address_line = d.street_address
    if (d.city) sp.city = d.city
    if (d.postal_code) sp.postal_code = d.postal_code
    if (d.phone) sp.phone = d.phone
    if (d.store_profile_image_url !== undefined) sp.logo_url = d.store_profile_image_url || null
    if (d.store_cover_image_url !== undefined) sp.cover_url = d.store_cover_image_url || null
    if (d.pickup_available !== undefined) sp.offers_pickup = !!d.pickup_available
    if (d.delivery_available !== undefined) sp.offers_delivery = !!d.delivery_available
    if (d.region !== undefined) sp.regions = String(d.region).split(',').map((r) => r.trim()).map((r) => Object.keys(REGION_NAME).find((k) => REGION_NAME[k] === r)).filter(Boolean)
    if (Object.keys(sp).length) await raw('PUT', V(`/stores/${sid}/profile`), sp)
    if (d.operating_hours) {
      const hours = Object.entries(d.operating_hours).map(([day, v]) => ({ dow: DAYS.indexOf(day), opens: v.open, closes: v.close })).filter((h) => h.dow >= 0 && h.opens && h.closes && h.closes > h.opens)
      await raw('PUT', V(`/stores/${sid}/hours`), { hours })
    }
    if (d.business_name || d.phone || d.business_number !== undefined) { const p = await raw('GET', V('/profile')); await raw('PUT', V('/profile'), { name: d.business_name || p.name, legal_name: p.legal_name, business_number: d.business_number !== undefined ? d.business_number || null : p.business_number, phone: d.phone || p.phone, contact_email: p.contact_email }) }
    return { ok: true }
  }],

  // ----- stores -----
  ['GET', /^\/stores\/?$/, async () => {
    const list = await myStores(true)
    const full = await Promise.all(list.map((s) => raw('GET', V(`/stores/${s.id}/profile`)).then((p) => storeShape(s, p, list))))
    return full
  }],
  ['POST', /^\/stores\/?$/, async (m, { data: d }) => { const r = await raw('POST', V('/stores'), storeBodyOut(d)); clearStores(); return r }],
  ['PUT', /^\/stores\/([0-9a-f-]{36})$/, async (m, { data: d }) => { await raw('PUT', V(`/stores/${m[1]}/profile`), storeProfileOut(d)); clearStores(); return { ok: true } }],
  ['DELETE', /^\/stores\/([0-9a-f-]{36})$/, async (m) => { const r = await raw('DELETE', V(`/stores/${m[1]}`)); clearStores(); return r }],

  // ----- dashboard -----
  ['GET', /^\/dashboard\/stats$/, async () => {
    const sid = await currentStoreId()
    const [d, exp, reviews] = await Promise.all([raw('GET', V(`/dashboard?store=${sid}`)), raw('GET', V(`/stores/${sid}/catalogue/expiring`)).catch(() => []), raw('GET', V(`/stores/${sid}/reviews/summary`)).catch(() => ({}))])
    const trend = d.trend || []
    const sum = (rows) => rows.reduce((a, r) => a + r.gross_cents, 0) / 100
    return {
      today_orders: d.today?.orders ?? 0, pending_orders: d.pending?.pending ?? 0, low_stock_alerts: (d.low_stock?.length ?? 0) + (d.out_of_stock?.length ?? 0), expiring_products_count: exp.length,
      today_revenue: (d.today?.gross_cents ?? 0) / 100, week_revenue: sum(trend.slice(-7)), month_revenue: (d.last_30_days?.gross_cents ?? 0) / 100,
      average_rating: reviews.average ?? null, total_reviews: reviews.count ?? 0,
    }
  }],

  // ----- orders (a store's part of an order) -----
  ['GET', /^\/orders\/?$/, async (m, { params }) => {
    const sid = await currentStoreId()
    const rows = (await raw('GET', V(`/orders?store=${sid}`))).map(orderShape)
    return rows.filter((o) => (!params.status || params.status === 'all' || o.status === params.status) && (!params.start_date || o.created_at >= params.start_date))
  }],
  ['GET', /^\/orders\/([0-9a-f-]{36})$/, async (m) => {
    const sid = await currentStoreId()
    const row = (await raw('GET', V(`/orders?store=${sid}`))).find((r) => r.id === m[1])
    if (!row) throw notFound('Order')
    return orderShape(row)
  }],
  ['PUT', /^\/orders\/([0-9a-f-]{36})\/(accept|start-picking|mark-ready|complete|cancel)$/, async (m) => {
    const path = { accept: 'accept', 'start-picking': 'preparing', 'mark-ready': 'ready', complete: 'collected' }[m[2]]
    if (m[2] === 'cancel') return raw('POST', V(`/suborders/${m[1]}/reject`), { reason: 'Cancelled by the store' })
    return raw('POST', V(`/suborders/${m[1]}/${path}`), {})
  }],

  // ----- payouts (the vendor's own money) -----
  ['GET', /^\/vendors\/me\/stripe-connect\/status$/, async () => { const r = await raw('GET', V('/payouts')); return { connected: r.account.connected, onboarding_complete: r.account.status === 'enabled' } }],
  ['POST', /^\/vendors\/me\/stripe-connect\/onboard$/, async () => raw('POST', V('/payout-account/start'), {})],
  ['GET', /^\/payouts\/?$/, async () => {
    const r = await raw('GET', V('/payouts'))
    const MAP = { paid: 'completed', requested: 'pending', pending: 'pending', processing: 'processing', failed: 'failed' }
    return (r.history || []).map((h) => ({ id: h.id, payout_number: `PO-${String(h.id).slice(0, 8).toUpperCase()}`, period_start: h.created_at, period_end: h.paid_at || h.created_at, gross_amount: h.amount_cents / 100, commission_amount: 0,
      net_amount: h.amount_cents / 100, status: MAP[h.status] || h.status, created_at: h.created_at, note: h.note }))
  }],
  ['GET', /^\/payouts\/summary\/stats$/, async () => {
    const r = await raw('GET', V('/payouts')); const paid = (r.history || []).filter((h) => h.status === 'paid')
    const pend = (r.history || []).filter((h) => !['paid', 'failed'].includes(h.status))
    return { total_paid: paid.reduce((a, h) => a + h.amount_cents, 0) / 100, total_payouts: r.history?.length || 0, pending_payouts: pend.length, pending_amount: pend.reduce((a, h) => a + h.amount_cents, 0) / 100,
      total_commission: 0, commission_rate: null }
  }],
  ['GET', /^\/payouts\/balance\/available$/, async () => { const r = await raw('GET', V('/payouts')); return { available_balance: (r.balance?.payable_now_cents ?? 0) / 100, pending_orders_count: 0, in_hold: (r.balance?.in_hold_cents ?? 0) / 100 } }],

  // ----- promotions: one campaign (name, type, value, products) = one sale price per product -----
  ['GET', /^\/promotions\/?$/, async () => {
    const rows = await raw('GET', V(`/stores/${await currentStoreId()}/promotions`))
    const groups = new Map()
    for (const r of rows) {
      const key = r.group_id || r.id
      const g = groups.get(key) || { id: key, name: r.name || r.product_name, description: r.description || '', promotion_type: r.discount_type === 'fixed' ? 'fixed_amount' : 'percentage', discount_type: r.discount_type || 'percentage', discount_value: r.discount_value ?? Math.round((1 - r.sale_price_cents / r.regular_price_cents) * 100),
        start_date: r.starts_at, end_date: r.ends_at, minimum_order_amount: 0, applies_to_all_products: false, product_ids: [], rows: [], is_active: r.state === 'active' || r.state === 'scheduled', approval_status: 'approved', affected_products: 0, state: r.state }
      g.product_ids.push(r.product_id); g.rows.push(r.id); g.affected_products = g.product_ids.length; groups.set(key, g)
    }
    return [...groups.values()].filter((g) => g.state !== 'cancelled')
  }],
  ['POST', /^\/promotions\/?$/, async (m, { data: d }) => promoCreate(d)],
  ['PUT', /^\/promotions\/([0-9a-f-]{36})$/, async (m, { data: d }) => { await promoCancel(m[1]); return promoCreate(d) }],
  ['DELETE', /^\/promotions\/([0-9a-f-]{36})$/, async (m) => promoCancel(m[1])],

  // ----- support -----
  ['GET', /^\/support\/?$/, async () => (await raw('GET', V('/support')).catch(() => [])).map((t) => ({ id: t.id, subject: t.subject, message: [t.first_message, t.last_reply ? `\n\nEAZyfoods replied: ${t.last_reply}` : ''].join(''), status: t.status === 'closed' ? 'resolved' : t.status === 'pending' ? 'in_progress' : t.status, priority: 'normal', created_at: t.created_at, assigned_to: null }))],
  ['POST', /^\/support\/?$/, async (m, { data: d }) => raw('POST', V('/support'), { subject: d.subject, message: d.message })],
  ['PUT', /^\/support\/([0-9a-f-]{36})$/, async (m) => raw('POST', V(`/support/${m[1]}/reopen`), {})],

  // ----- team -----
  ['GET', /^\/staff\/?$/, async () => raw('GET', V('/staff'))],
  ['POST', /^\/staff\/?$/, async (m, { data: d }) => raw('POST', V('/staff'), { email: d.email, first_name: d.first_name, last_name: d.last_name || '', password: d.password, phone: d.phone || null })],
  ['PUT', /^\/staff\/([0-9a-f-]{36})$/, async (m, { data: d }) => raw('PUT', V(`/staff/${m[1]}`), { is_active: !!d.is_active })],
  ['DELETE', /^\/staff\/([0-9a-f-]{36})$/, async (m) => raw('DELETE', V(`/staff/${m[1]}`))],

  // ----- analytics -----
  ['GET', /^\/analytics\/(sales-report|sales-trends|revenue-breakdown|product-performance|fulfillment-metrics|comparison)$/, async (m, { params }) => {
    const qs = new URLSearchParams(params).toString()
    return raw('GET', V(`/stores/${await currentStoreId()}/analytics/${m[1]}?${qs}`))
  }],

  // ----- chat with the EAZyfoods team (drivers are not reachable from here) -----
  ['GET', /^\/deliveries\/?$/, async () => []],
  ['GET', /^\/deliveries\/stats$/, async () => ({})],
  ['GET', /^\/vendor\/chat\/messages$/, async (m, { params }) => {
    if (params.recipient_type === 'driver') return []
    const threads = await raw('GET', V('/messages'))
    const all = (await Promise.all(threads.map((t) => raw('GET', V(`/messages/${t.id}`))))).flatMap((r) => r.messages)
    return all.sort((a, b) => a.id - b.id).map((x) => ({ id: x.id, message: x.body, sender_type: x.from_staff ? 'admin' : 'vendor', sender_id: x.from_staff ? 'admin' : 'me', created_at: x.created_at }))
  }],
  ['POST', /^\/vendor\/chat\/messages$/, async (m, { data: d }) => {
    const threads = await raw('GET', V('/messages'))
    const open = threads.find((t) => t.status === 'open')
    return open ? raw('POST', V(`/messages/${open.id}/reply`), { body: d.message }) : raw('POST', V('/messages'), { subject: 'Chat with EAZyfoods', body: d.message })
  }],

  // ----- ads (pay-per-click from a budget; our team approves each ad first) -----
  ['GET', /^\/vendor\/marketing\/config$/, async () => { const c = await raw('GET', V('/ads-config')); return { min_budget: c.min_budget_cents / 100, min_cpc: c.min_cpc_cents / 100 } }],
  ['GET', /^\/vendor\/marketing\/ads$/, async () => (await raw('GET', V('/ads'))).map(adShape)],
  ['GET', /^\/vendor\/marketing\/ads\/([0-9a-f-]{36})$/, async (m) => adShape(await raw('GET', V(`/ads/${m[1]}`)))],
  ['POST', /^\/vendor\/marketing\/ads$/, async (m, { data: d }) => raw('POST', V('/ads'), { store_id: await currentStoreId(), placement: d.placement, title: d.title || d.name, body: d.description || undefined, image_url: d.image_url || undefined,
    cpc_cents: Math.round(Number(d.cpc) * 100), budget_cents: Math.round(Number(d.budget) * 100), starts_at: new Date(d.start_date || Date.now()).toISOString(), ends_at: new Date(d.end_date || Date.now() + 7 * 864e5).toISOString(), product_slug: d.product_slug })],
  ['PUT', /^\/vendor\/marketing\/ads\/([0-9a-f-]{36})\/(pause|activate)$/, async (m) => raw('POST', V(`/ads/${m[1]}/${m[2]}`), {})],
  ['PUT', /^\/vendor\/marketing\/ads\/([0-9a-f-]{36})$/, async (m, { data: d }) => raw('PUT', V(`/ads/${m[1]}`), { title: d.title || d.name, body: d.description || null, image_url: d.image_url || null, starts_at: new Date(d.start_date).toISOString(), ends_at: new Date(d.end_date).toISOString() })],
  ['DELETE', /^\/vendor\/marketing\/ads\/([0-9a-f-]{36})$/, async (m) => raw('DELETE', V(`/ads/${m[1]}`))],

  // ----- inventory -----
  ['GET', /^\/inventory\/adjustments$/, async (m, { params }) => {
    const rows = await raw('GET', V(`/stores/${await currentStoreId()}/adjustments?limit=${params.limit || 50}`))
    const TYPE = { receive: 'stock_in', initial: 'stock_in', sale: 'stock_out', correction: 'adjustment', damage: 'damage', expired: 'expired', return: 'return' }
    return rows.map((a) => ({ id: a.id, created_at: a.created_at, adjustment_type: TYPE[a.reason] || 'adjustment', quantity_change: a.delta, quantity_before: a.resulting_on_hand - a.delta, quantity_after: a.resulting_on_hand,
      reason: [a.product_name, a.note].filter(Boolean).join(' · '), product_id: a.product_id, product_name: a.product_name }))
  }],
  ['POST', /^\/inventory\/adjustments$/, async (m, { data: d }) => {
    const sid = await currentStoreId()
    let pid = d.product_id
    if (!pid && d.barcode) pid = (await raw('GET', V(`/stores/${sid}/barcode?code=${encodeURIComponent(d.barcode)}`))).id
    const reason = { stock_in: 'receive', stock_out: 'correction', adjustment: 'correction', damage: 'damage', expired: 'expired', return: 'return' }[d.adjustment_type] || 'correction'
    return raw('POST', V(`/stores/${sid}/offers/${pid}/stock`), { delta: d.quantity_change, reason, note: [d.reason, d.notes, d.reference_number].filter(Boolean).join(' · ').slice(0, 300) || undefined })
  }],
  ['GET', /^\/inventory\/low-stock-alerts$/, async () => {
    const list = await raw('GET', V(`/stores/${await currentStoreId()}/catalogue`))
    const seen = JSON.parse(localStorage.getItem('ez_resolved_alerts') || '{}')
    return list.filter((p) => p.status !== 'hidden' && p.stock_quantity - p.reserved <= p.low_stock_threshold && seen[p.id] !== p.stock_quantity)
      .map((p) => ({ id: p.id, product_id: p.id, product_name: p.name, current_quantity: p.stock_quantity - p.reserved, threshold_quantity: p.low_stock_threshold }))
  }],
  ['PUT', /^\/inventory\/low-stock-alerts\/([0-9a-f-]{36})\/resolve$/, async (m) => {
    const list = await raw('GET', V(`/stores/${await currentStoreId()}/catalogue/${m[1]}`))
    const seen = JSON.parse(localStorage.getItem('ez_resolved_alerts') || '{}'); seen[m[1]] = list.stock_quantity   // hidden until the stock changes
    localStorage.setItem('ez_resolved_alerts', JSON.stringify(seen)); return { ok: true }
  }],

  // ----- reviews -----
  ['GET', /^\/reviews\/?$/, async (m, { params }) => raw('GET', V(`/stores/${await currentStoreId()}/reviews${params.rating_filter ? `?rating=${params.rating_filter}` : ''}`))],
  ['GET', /^\/reviews\/stats\/summary$/, async () => {
    const r = await raw('GET', V(`/stores/${await currentStoreId()}/reviews/summary`))
    return { total_reviews: r.count, average_rating: r.average ?? 0, rating_distribution: r.distribution, unread: r.unread }
  }],
  ['PUT', /^\/reviews\/mark-read$/, async () => raw('PUT', V(`/stores/${await currentStoreId()}/reviews/mark-read`), {})],
  ['PUT', /^\/reviews\/([0-9a-f-]{36})\/respond$/, async (m, { data }) => raw('PUT', V(`/stores/${await currentStoreId()}/reviews/${m[1]}/respond`), { response: data.vendor_response })],
  ['POST', /^\/reviews\/([0-9a-f-]{36})\/report$/, async (m, { params }) => raw('POST', V(`/stores/${await currentStoreId()}/reviews/${m[1]}/report`), { reason: params.reason || 'Reported by the store' })],

  // ----- registration (account + business application + documents, in one step like the original form) -----
  ['GET', /^\/config\/signup-documentation$/, async () => ({ require_vendor_docs: false })],
  ['POST', /^\/auth\/signup$/, async (m, { data: d }) => {
    const me = await raw('GET', '/auth/me').catch(() => null)
    if (!me) await raw('POST', '/auth/register-staff', { email: d.email, password: d.password, full_name: `${d.first_name} ${d.last_name}`.trim() || d.business_name, area: 'vendor' })
    const chef = d.business_type === 'chef' || d.business_type === 'restaurant'
    const regionSlugs = (d.region || '').split(',').map((r) => r.trim().toLowerCase().replace(/ african$/, '')).filter(Boolean).map((r) => ({ west: 'west-africa', east: 'east-africa', north: 'north-africa', central: 'central-africa', south: 'southern-africa' })[r]).filter(Boolean)
    const applied = await raw('POST', '/vendor/apply', {
      business_name: d.business_name, phone: d.phone, store_name: d.business_name, address_line: d.street_address, city: d.city || 'Calgary', postal_code: d.postal_code,
      regions: regionSlugs, kind: chef ? 'chef' : 'store', business_type: d.business_type === 'restaurant' ? 'restaurant' : 'home', cuisines: [],
    })
    clearStores()
    const kinds = [['government_id_url', 'id'], ['business_registration_url', 'business_licence'], ['tax_permit_url', 'gst_registration']]
    for (const [field, kind] of kinds) {
      const file = pendingDocs.get(d[field])
      if (file) { const fd = new FormData(); fd.append('file', file); await raw('POST', `/vendor/documents?kind=${kind}`, fd, { isForm: true }).catch(() => {}) }
    }
    return applied
  }],

  // ----- products -----
  ['GET', /^\/products\/categories\/list$/, async () => (await raw('GET', '/categories')).map((c) => ({ id: c.id, name: c.name, parent_id: c.parent_id }))],
  ['GET', /^\/products\/expiring-soon\/list$/, async () => raw('GET', V(`/stores/${await currentStoreId()}/catalogue/expiring`))],
  ['GET', /^\/products\/?$/, async (m, { params }) => {
    const s = await currentStoreId(); if (!s) return []
    const list = await raw('GET', V(`/stores/${s}/catalogue`)); const q = (params.search || '').toLowerCase()
    return (q ? list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) : list).slice(0, Number(params.limit) || 10000)
  }],
  ['GET', /^\/products\/([0-9a-f-]{36})$/, async (m) => raw('GET', V(`/stores/${await currentStoreId()}/catalogue/${m[1]}`))],
  ['POST', /^\/products\/?$/, async (m, { data }) => raw('POST', V(`/stores/${await sid(data)}/catalogue`), productBody(data))],
  ['PUT', /^\/products\/([0-9a-f-]{36})$/, async (m, { data }) => raw('PUT', V(`/stores/${await sid(data)}/catalogue/${m[1]}`), productBody(data))],
  ['DELETE', /^\/products\/([0-9a-f-]{36})$/, async (m) => raw('DELETE', V(`/stores/${await currentStoreId()}/catalogue/${m[1]}`))],
  ['GET', /^\/barcode\/lookup$/, async (m, { params }) => raw('GET', V(`/stores/${await currentStoreId()}/barcode?code=${encodeURIComponent(params.barcode)}`))],
  ['GET', /^\/barcode\/suggest$/, async (m, { params }) => raw('GET', V(`/stores/${await currentStoreId()}/barcode/suggest?code=${encodeURIComponent(params.barcode)}`))],
  ['POST', /^\/barcode\/generate$/, async (m, { params }) => raw('POST', V(`/stores/${await currentStoreId()}/catalogue/${params.product_id}/barcode`), { regenerate: params.regenerate === 'true' || params.regenerate === true })],
  ['DELETE', /^\/barcode\/remove$/, async (m, { params }) => raw('DELETE', V(`/stores/${await currentStoreId()}/catalogue/${params.product_id}/barcode`))],
  ['POST', /^\/uploads\/(products|ads|vendor-profile|vendor-documents)$/, async (m, { data }) => {
    if (m[1] === 'vendor-documents') { const f = data.get('file'); const key = `pending:${pendingDocs.size + 1}`; pendingDocs.set(key, f); return { url: key } }
    return raw('POST', '/uploads/image', data, { isForm: true })
  }],
  ['POST', /^\/ai\/generate-description$/, async (m, { data: d }) => {
    // No AI service is connected: write a plain, honest starting description from what the vendor entered, to edit.
    const bits = [d.name + (d.category ? ` from our ${d.category} range` : '') + '.', d.unit ? `Sold per ${d.unit}.` : '', 'Please check the pack for ingredients and allergens before eating.'].filter(Boolean)
    return { description: bits.join(' ') }
  }],
]

function request(method, url, config = {}) {
  const [path, qs] = url.split('?')
  const params = { ...Object.fromEntries(new URLSearchParams(qs || '')), ...(config.params || {}) }
  const route = routes.find(([m, re]) => m === method && re.test(path))
  if (!route) return Promise.reject(notFound(`${method} ${path}`))
  return Promise.resolve(route[2](route[1].exec(path), { params, data: config.data, config })).then((data) => ({ data, status: 200 }))
}

const api = {
  get: (url, config) => request('GET', url, config),
  delete: (url, config) => request('DELETE', url, config),
  post: (url, data, config) => request('POST', url, { ...config, data }),
  put: (url, data, config) => request('PUT', url, { ...config, data }),
  patch: (url, data, config) => request('PATCH', url, { ...config, data }),
  defaults: { headers: { common: {} } },
}

export const getApiOrigin = () => window.location.origin
/** Uploaded files are served from this same site. */
export function resolveUploadUrl(url) {
  if (!url || typeof url !== 'string') return url
  return url
}
export default api
