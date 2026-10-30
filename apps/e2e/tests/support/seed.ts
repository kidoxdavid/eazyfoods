import { base, db, setOffer } from '../helpers.js';

/**
 * Puts one real example of every kind of record into the test database, so the pages that open a single record
 * (an order, a ticket, a delivery...) can be opened and audited. Returns the address of each, by route pattern.
 * Done through the app's own API where money or state is involved, and plain inserts for simple records.
 */
const S1 = 'demo-calgary-west-african-market';
const call = async (cookie: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const r = await fetch(base() + path, { method, headers: { cookie, 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json: any = null; try { json = await r.json(); } catch { /* no body */ }
  return { status: r.status, json, setCookie: r.headers.get('set-cookie') };
};
const login = async (email: string, area?: string) => {
  const r = await call('', 'POST', '/api/auth/login', { email, password: 'dev-password-123', ...(area ? { area } : {}) }, area ? { 'x-area': area } : {});
  return String(r.setCookie).split(';')[0];
};

export async function seedSamples(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const c = await db();
  try {
    await setOffer(S1, 'garri-white', 2000, 80);
    const customer = await login('customer@example.test');
    const addr = (await call(customer, 'POST', '/api/addresses', { recipient_name: 'Audit Buyer', phone: '5875550100', line1: '1 Audit St NE', city: 'Calgary', postal_code: 'T2A0A1' })).json;
    const offer = (await c.query(`SELECT o.id FROM store_offers o JOIN products p ON p.id=o.product_id JOIN stores s ON s.id=o.store_id WHERE p.slug='garri-white' AND s.slug=$1`, [S1])).rows[0].id;
    await call(customer, 'PUT', `/api/cart/items/${offer}`, { quantity: 2 });
    const order = (await call(customer, 'POST', '/api/checkout', { address_id: addr?.id ?? null, method: 'delivery' }, { 'idempotency-key': `audit-${Date.now()}` })).json?.order;
    if (order?.id) {
      await call(customer, 'POST', `/api/dev/orders/${order.id}/simulate-payment`, { outcome: 'succeeded' });
      out['/orders/:id'] = `/orders/${order.id}`; out['/admin/orders/:id'] = `/admin/orders/${order.id}`; out['/finance/orders/:id'] = `/finance/orders/${order.id}`;
      const sub = (await c.query(`SELECT id FROM suborders WHERE order_id=$1 LIMIT 1`, [order.id])).rows[0]?.id;
      if (sub) {
        out['/vendor/orders/:id'] = `/vendor/orders/${sub}`;
        const owner = await login('owner1@example.test', 'vendor');
        for (const step of ['accept', 'ready']) await call(owner, 'POST', `/api/vendor/suborders/${sub}/${step}`, {}, { 'x-area': 'vendor' });
        const del = (await c.query(`SELECT id FROM deliveries WHERE suborder_id=$1 LIMIT 1`, [sub])).rows[0]?.id;
        const drv = (await c.query(`SELECT d.id FROM drivers d JOIN users u ON u.id=d.user_id WHERE u.email='driver@example.test'`)).rows[0]?.id;
        if (del && drv) { const admin = await login('admin@example.test', 'admin'); await call(admin, 'POST', `/api/admin/deliveries/${del}/assign`, { driver_id: drv }, { 'x-area': 'admin' }); out['/driver/deliveries/:deliveryId/track'] = `/driver/deliveries/${del}/track`; }
      }
    }
    const cust = (await c.query(`SELECT id FROM users WHERE email='customer@example.test'`)).rows[0].id;
    const t = (await c.query(`INSERT INTO support_tickets(user_id, kind, category, subject, status) VALUES ($1,'customer','other','Audit sample question','open') RETURNING id`, [cust])).rows[0].id;
    await c.query(`INSERT INTO ticket_messages(ticket_id, author_user_id, body) VALUES ($1,$2,'Hello, this is a sample message for the audit.')`, [t, cust]);
    out['/admin/support/:id'] = `/admin/support/${t}`;
    const list = (await c.query(`INSERT INTO shopping_lists(user_id, name, share_token) VALUES ($1,'Audit list','audit-share-token') RETURNING id, share_token`, [cust])).rows[0];
    out['/lists/:id'] = `/lists/${list.id}`; out['/l/:token'] = `/l/${list.share_token}`;
    out['/unsubscribe/:token'] = '/unsubscribe/audit-sample-token';          // an unknown token: the page that explains it
    const vendor = (await c.query(`SELECT id FROM vendors ORDER BY created_at LIMIT 1`)).rows[0].id;
    out['/admin/vendors/:id'] = `/admin/vendors/${vendor}`;
    const product = (await c.query(`SELECT id FROM products WHERE status='published' ORDER BY name LIMIT 1`)).rows[0].id;
    out['/admin/catalogue/:id'] = `/admin/catalogue/${product}`;
    const pros = (await c.query(`INSERT INTO vendor_prospects(business_name, contact_name, phone, email, stage) VALUES ('Audit Grocer', 'A. Owner', '5875550123', 'audit@example.test', 'contacted') RETURNING id`)).rows[0].id;
    out['/admin/crm/:id'] = `/admin/crm/${pros}`;
    const mail = (await c.query(`INSERT INTO email_campaigns(name, subject, body) VALUES ('Audit email', 'Hello from the audit', 'A short sample body.') RETURNING id`)).rows[0].id;
    out['/marketing/emails/:id'] = `/marketing/emails/${mail}`;
    const store = (await c.query(`SELECT s.id, s.vendor_id FROM stores s WHERE s.slug=$1`, [S1])).rows[0];
    const ad = (await c.query(`INSERT INTO ad_campaigns(vendor_id, placement, title, cpc_cents, budget_cents, starts_at, ends_at) VALUES ($1,'search_sponsored','Audit ad',25,2000, now(), now() + interval '7 days') RETURNING id`, [store.vendor_id])).rows[0]?.id;
    if (ad) out['/vendor/ads/:id/edit'] = `/vendor/ads/${ad}/edit`;
  } catch (e: any) { console.log('SEED note:', String(e.message).slice(0, 160)); }
  finally { await c.end(); }
  return out;
}
