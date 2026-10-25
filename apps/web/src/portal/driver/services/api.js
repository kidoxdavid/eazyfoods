import { makeHttp, notFound } from '../../http'

/**
 * The original EAZyfoods driver portal talked to a different backend. This adapter keeps its pages unchanged: every call a page makes is answered from the
 * current API in the shape the page expects. Anything with no equivalent answers "not available" so a page shows its empty state instead of breaking.
 */
const { raw } = makeHttp('driver')
const fail = (status, detail) => Object.assign(new Error(detail), { response: { status, data: { detail } } })

// Our job steps -> the steps the original portal shows. Pickup puts the order on its way, so "picked up" and "in transit" are one step here.
const STATUS = { assigned: 'accepted', picked_up: 'in_transit', delivered: 'delivered', failed: 'cancelled' }
const cents = (c) => (c ?? 0) / 100
const addr = (a) => ({ street: [a?.line1, a?.line2].filter(Boolean).join(', '), city: a?.city || '', state: 'Alberta', postal_code: a?.postal_code || '' })

export function jobShape(j) {
  return {
    id: j.id, order_id: j.id, status: STATUS[j.status] || j.status, order_number: j.order_number,
    delivery_address: addr(j.dropoff), pickup_address: { street: j.pickup?.address_line || '', city: j.pickup?.city || '', state: 'Alberta', postal_code: j.pickup?.postal_code || '' },
    vendor_name: j.pickup?.store_name || '', customer_name: j.dropoff?.first_name || '', customer_phone: j.dropoff?.phone || '', instructions: j.instructions || '',
    pickup_latitude: null, pickup_longitude: null, delivery_latitude: null, delivery_longitude: null, current_latitude: null, current_longitude: null,
    estimated_delivery_time: j.promised_at, estimated_pickup_time: null, actual_pickup_time: j.picked_up_at, actual_delivery_time: j.delivered_at, delivered_at: j.delivered_at,
    distance_km: null, route_distance_km: null, current_eta_minutes: null, delivery_fee: null, driver_earnings: cents((j.earning_cents ?? 0) + (j.tip_cents ?? 0)),
    created_at: j.assigned_at || j.created_at,
  }
}
const jobs = async (scope = 'all') => {
  try { return (await raw('GET', `/driver/jobs?scope=${scope}`)).map(jobShape) } catch (e) { if (e.response?.status === 403) return []; throw e }
}
const jobBy = async (id) => jobShape(await raw('GET', `/driver/jobs/${id}`))

async function dashStats() {
  const all = await jobs('all'); const done = all.filter((j) => j.status === 'delivered')
  let earned = 0, average = null
  try { const e = await raw('GET', '/driver/earnings'); earned = (e.earnings || []).reduce((a, r) => a + r.amount_cents, 0) / 100 } catch { /* not approved yet */ }
  try { average = (await raw('GET', '/driver/ratings')).average } catch { /* none */ }
  return { total_deliveries: all.length, completed_deliveries: done.length, active_deliveries: all.filter((j) => j.status === 'accepted' || j.status === 'in_transit').length, total_earnings: earned, average_rating: average }
}
const pending = new Map()
const sendPending = async (url) => {
  if (!url || !url.startsWith('pending:')) return url
  const fd = new FormData(); fd.append('file', pending.get(url))
  return (await raw('POST', '/driver/files', fd, { isForm: true })).url
}
const docOut = (f) => f ? { url: f.url, validity: f.validity || null } : undefined
function profileIn(d) {
  const o = {}
  for (const k of ['first_name', 'last_name', 'phone', 'street_address', 'city', 'state', 'postal_code', 'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_color', 'license_plate', 'driver_license_number', 'payout_email', 'nav_app']) if (d[k] !== undefined && d[k] !== '') o[k] = d[k]
  if (typeof d.share_location === 'boolean') o.share_location = d.share_location
  if (d.preferred_delivery_zones) o.preferred_delivery_zones = d.preferred_delivery_zones
  if (d.delivery_radius_km !== undefined && d.delivery_radius_km !== '' && d.delivery_radius_km !== null) o.delivery_radius_km = Number(d.delivery_radius_km)
  return o
}

const routes = [
  ['GET', /^\/driver\/me$/, async () => {
    const me = await raw('GET', '/driver/me')
    if (me.status === 'none') throw fail(404, 'No driver profile')
    return { ...me, ...(await dashStats()) }
  }],
  ['PUT', /^\/driver\/me$/, async (m, { data }) => { await raw('PUT', '/driver/profile', profileIn(data)); return raw('GET', '/driver/me') }],
  ['PUT', /^\/driver\/availability$/, async (m, { params }) => {
    const on = params.is_available === true || params.is_available === 'true'
    return raw('PUT', '/driver/availability', { available: on }).then((r) => ({ ...r, message: 'Availability updated' }))
      .catch((e) => { throw e.response?.status === 403 ? fail(403, 'You can go available once the team has approved your account.') : e })
  }],
  ['GET', /^\/driver\/dashboard\/stats$/, async () => dashStats()],
  ['GET', /^\/driver\/available-orders$/, async () => {
    try {
      const r = await raw('GET', '/driver/available')
      return (r.jobs || []).map((j) => ({ id: j.id, order_number: j.order_number, vendor_name: j.store_name, total_amount: 0, delivery_fee: null, driver_earnings_estimate: cents((j.earning_cents ?? 0) + (j.tip_cents ?? 0)),
        pickup_address: { street: j.pickup_address || '', city: j.pickup_city || '', state: 'Alberta', postal_code: '' }, delivery_address: { street: 'Exact address shown after you accept', city: j.dropoff_city || '', state: 'Alberta', postal_code: j.dropoff_area || '' },
        ready_at: j.promised_at || j.created_at, created_at: j.created_at }))
    } catch (e) { if (e.response?.status === 403) return []; throw e }
  }],
  ['POST', /^\/driver\/deliveries\/([0-9a-f-]{36})\/accept$/, async (m) => raw('POST', `/driver/jobs/${m[1]}/accept`, {})],
  ['POST', /^\/driver\/deliveries\/([0-9a-f-]{36})\/reject$/, async (m) => ({ message: 'Delivery declined', order_id: m[1] })],   // stays available for others; nothing to record
  ['GET', /^\/driver\/deliveries$/, async () => jobs('all')],
  ['GET', /^\/driver\/deliveries\/([0-9a-f-]{36})$/, async (m) => jobBy(m[1])],
  ['PUT', /^\/driver\/deliveries\/([0-9a-f-]{36})\/status$/, async (m, { data: d }) => {
    if (d.status === 'picked_up') await raw('POST', `/driver/jobs/${m[1]}/pickup`, {})
    else if (d.status === 'delivered') await raw('POST', `/driver/jobs/${m[1]}/deliver`, { code: d.code || undefined, bypass_reason: d.bypass_reason || undefined, photo_url: d.delivery_photo_url || undefined })
    else if (d.status === 'failed' || d.status === 'cancelled') await raw('POST', `/driver/jobs/${m[1]}/fail`, { reason: d.notes || 'Could not complete the delivery' })
    return jobBy(m[1])
  }],
  ['POST', /^\/driver\/deliveries\/([0-9a-f-]{36})\/update-location$/, async (m, { data: d }) => raw('POST', `/driver/jobs/${m[1]}/location`, { lat: d.latitude, lng: d.longitude })],

  ['GET', /^\/driver\/ratings$/, async () => {
    try { return (await raw('GET', '/driver/ratings')).ratings.map((r, i) => ({ id: `${r.created_at}-${i}`, order_number: null, rating: r.rating, comment: r.comment, customer_name: r.first_name || 'Customer', created_at: r.created_at })) } catch (e) { if (e.response?.status === 403) return []; throw e }
  }],
  ['GET', /^\/driver\/payout-summary$/, async () => { try { const e = await raw('GET', '/driver/earnings'); return { unpaid_cents: e.unpaid_cents, paid_cents: e.paid_cents } } catch { return { unpaid_cents: 0, paid_cents: 0 } } }],
  ['GET', /^\/driver\/me\/stripe-connect\/status$/, async () => ({ connected: false, onboarding_complete: false })],

  ['GET', /^\/driver\/documents$/, async () => {
    const [me, d] = await Promise.all([raw('GET', '/driver/me'), raw('GET', '/driver/documents')])
    const f = d.documents || {}
    const doc = (k) => ({ type: k, url: f[k]?.url ? `/api/driver/documents/${k}/file` : null, validity: f[k]?.validity || null })
    return { verification_status: me.verification_status, documents: [doc('driver_license'), doc('vehicle_registration'), doc('insurance')],
      driver_license_url: doc('driver_license').url, vehicle_registration_url: doc('vehicle_registration').url, insurance_document_url: doc('insurance').url,
      driver_license_validity: f.driver_license?.validity || null, vehicle_registration_validity: f.vehicle_registration?.validity || null, insurance_validity: f.insurance?.validity || null }
  }],
  ['PUT', /^\/driver\/documents$/, async (m, { data: d }) => raw('PUT', '/driver/documents', {
    driver_license: d.driver_license_url ? docOut({ url: d.driver_license_url, validity: d.driver_license_validity }) : undefined,
    vehicle_registration: d.vehicle_registration_url ? docOut({ url: d.vehicle_registration_url, validity: d.vehicle_registration_validity }) : undefined,
    insurance: d.insurance_document_url ? docOut({ url: d.insurance_document_url, validity: d.insurance_validity }) : undefined })],
  ['POST', /^\/uploads\/(driver-documents|delivery-proof)$/, async (m, { data }) => {
    // Documents picked on the application form are sent once the account exists (the person is not signed in yet).
    if (m[1] === 'driver-documents') { const key = `pending:${pending.size + 1}`; pending.set(key, data.get('file')); return { url: key } }
    return raw('POST', '/driver/files', data, { isForm: true })
  }],
  ['GET', /^\/config\/signup-documentation$/, async () => ({ require_driver_docs: true })],

  ['POST', /^\/driver\/auth\/signup$/, async (m, { data: d }) => {
    const me = await raw('GET', '/auth/me').catch(() => null)
    if (!me) await raw('POST', '/auth/register-staff', { email: d.email, password: d.password, full_name: `${d.first_name} ${d.last_name}`.trim(), area: 'driver' })
    const docs = {}
    if (d.driver_license_url) docs.driver_license = docOut({ url: await sendPending(d.driver_license_url), validity: d.driver_license_validity })
    if (d.vehicle_registration_url) docs.vehicle_registration = docOut({ url: await sendPending(d.vehicle_registration_url), validity: d.vehicle_registration_validity })
    if (d.insurance_document_url) docs.insurance = docOut({ url: await sendPending(d.insurance_document_url), validity: d.insurance_validity })
    await raw('POST', '/driver/apply', { phone: d.phone, first_name: d.first_name, last_name: d.last_name, ...profileIn({ ...d, first_name: undefined, last_name: undefined, phone: undefined }), preferred_delivery_zones: d.delivery_zone ? [d.delivery_zone] : undefined, documents: docs })
    return { ok: true }
  }],

  // ----- chat with the EAZyfoods team (drivers do not message vendors or customers) -----
  ['GET', /^\/driver\/chat\/messages$/, async (m, { params }) => {
    if (params.recipient_type && params.recipient_type !== 'admin') return []
    return (await raw('GET', '/driver/messages')).map((x) => ({ id: x.id, message: x.body, sender_type: x.from_staff ? 'admin' : 'driver', created_at: x.created_at }))
  }],
  ['POST', /^\/driver\/chat\/messages$/, async (m, { data: d }) => {
    if (d.recipient_type && d.recipient_type !== 'admin') throw fail(400, 'Message the EAZyfoods team from here.')
    return raw('POST', '/driver/messages', { body: d.message })
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
export default api
