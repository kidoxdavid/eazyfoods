import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { SkelRows } from '../skeletons';
import { useFeatures } from '../features';
import { useT } from '../i18n';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api, money, post } from '../api';
import { useCart } from '../cart';
import { useAuth } from '../auth';
import { useAction, useApi } from '../hooks';
import { SlotPicker, slotText } from '../slots';
import { Badge, Button, ErrorBox, Field, Input, Loading, Notice, Select, Textarea } from '../ui';

type Address = { id: string; label: string | null; recipient_name: string; phone: string; line1: string; line2: string | null; city: string; province: string; postal_code: string; instructions: string | null; is_default: boolean; serviceable: boolean; zone: string | null };
type Line = { name: string; quantity: number; unit_price_cents: number; line_total_cents: number };
type Sub = { store_slug: string; store_name: string; lines: Line[]; subtotal_cents: number; discount_cents: number; delivery_cents: number; delivery_tax_cents: number; tax_cents: number; total_cents: number; eta_minutes: number | null; preorders_enabled?: boolean; scheduled_for?: string | null; scheduled_until?: string | null };
type Quote = { ok: boolean; issues: { type: string; message: string; store_slug?: string }[]; warnings: { message: string }[]; suborders: Sub[]; subtotal_cents: number; discount_cents: number; delivery_cents: number; tax_cents: number; tip_cents: number; total_cents: number; credit_available_cents: number; credit_applied_cents: number; pay_cents: number; coupon: { code: string; discount_cents: number } | null; coupon_error?: string; separate_deliveries: boolean };
type Cfg = { payment_provider: 'mock' | 'stripe'; stripe_publishable_key: string | null; test_mode: boolean };

export function AddressForm({ onSaved, onCancel, name }: { onSaved: (a: Address) => void; onCancel?: () => void; name?: string }) {
  const t = useT();
  const save = useAction(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    onSaved(await post('/addresses', { ...f, line2: f.line2 || null, instructions: f.instructions || null, label: f.label || undefined, province: 'AB' }));
  });
  return (
    <form onSubmit={save.run} className="stack">
      {save.error && <ErrorBox message={save.error} />}
      <div className="form-grid">
        <Field label={t('Full name')}><Input name="recipient_name" required defaultValue={name} autoComplete="name" /></Field>
        <Field label="Phone for the driver"><Input name="phone" type="tel" required autoComplete="tel" /></Field>
        <Field label={t('Street address')}><Input name="line1" required autoComplete="address-line1" /></Field>
        <Field label="Unit / apartment (optional)"><Input name="line2" autoComplete="address-line2" /></Field>
        <Field label={t('City')}><Input name="city" required defaultValue="Calgary" autoComplete="address-level2" /></Field>
        <Field label={t('Postal code')}><Input name="postal_code" required placeholder="T2A 0A0" autoComplete="postal-code" /></Field>
      </div>
      <Field label="Delivery instructions (optional)"><Textarea name="instructions" rows={2} placeholder="Buzzer code, where to leave the order…" /></Field>
      <div className="row"><Button type="submit" busy={save.busy}>{t('Save address')}</Button>{onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}</div>
    </form>
  );
}

export function CheckoutPage() {
  const on = useFeatures();
  const t = useT();
  const { me } = useAuth();
  const { cart, refresh } = useCart();
  const nav = useNavigate();
  const addrs = useApi<Address[]>('/addresses');
  const cfg = useApi<Cfg>('/config');
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [coupon, setCoupon] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tip, setTip] = useState(0);   // never pre-filled: a tip is the customer's choice
  const [customTip, setCustomTip] = useState('');
  const [useCredit, setUseCredit] = useState(false);
  const [gift, setGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [later, setLater] = useState<Record<string, boolean>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState<string>();
  const [order, setOrder] = useState<{ id: string; order_number: string; total_cents: number; pay_cents?: number; client_secret: string | null } | null>(null);
  const keyRef = useRef(crypto.randomUUID());

  useEffect(() => { if (addrs.data && !addressId) setAddressId(addrs.data.find((a) => a.is_default)?.id ?? addrs.data[0]?.id ?? null); }, [addrs.data, addressId]);
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-price on the server whenever anything that affects the price changes. A new key marks a new attempt.
  const sig = useMemo(() => JSON.stringify([addressId, method, coupon, slots, tip, useCredit, cart?.stores.map((s) => s.items.map((i) => [i.offer_id, i.quantity]))]), [addressId, method, coupon, slots, tip, useCredit, cart]);
  useEffect(() => {
    if (order) return;
    keyRef.current = crypto.randomUUID();
    if (!cart?.item_count) return;
    let live = true;
    post<Quote>('/checkout/quote', { address_id: method === 'delivery' ? addressId : null, method, coupon_code: coupon || null, slots, tip_cents: method === 'delivery' ? tip : 0, use_credit: useCredit }).then((q) => live && (setQuote(q), setQuoteErr(undefined)), (e) => live && setQuoteErr(e.message));
    return () => { live = false; };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = useAction(async () => {
    try {
      const r = await post<{ order: { id: string; order_number: string; total_cents: number; pay_cents: number }; payment: { client_secret: string | null } | null }>(
        '/checkout', { address_id: method === 'delivery' ? addressId : null, method, coupon_code: coupon || null, instructions: instructions || null, slots, tip_cents: method === 'delivery' ? tip : 0, gift_message: gift && giftMessage.trim() ? giftMessage.trim() : null, use_credit: useCredit }, { 'idempotency-key': keyRef.current });
      setOrder({ ...r.order, client_secret: r.payment?.client_secret ?? null });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'checkout_blocked') { await refresh(); const q = await post<Quote>('/checkout/quote', { address_id: addressId, method, coupon_code: coupon || null, slots, tip_cents: method === 'delivery' ? tip : 0, use_credit: useCredit }); setQuote(q); }
      throw e;
    }
  });

  if (!me) return null;
  if (order) return <PaymentStep order={order} cfg={cfg.data} onPaid={() => { refresh(); nav(`/orders/${order.id}`); }} />;
  if (!cart) return <><h1>{t('Checkout')}</h1><SkelRows n={3} label="Loading checkout" /></>;
  if (!cart.item_count) return <Notice>Your basket is empty. <Link to="/search">Find something to buy</Link>.</Notice>;

  const pickupOk = quote ? !quote.issues.some((i) => i.type === 'pickup_unavailable') || method === 'pickup' : true;
  const issues = quote?.issues.filter((i) => !(method === 'delivery' && !addressId && i.type === 'address_required')) ?? [];
  return (
    <>
      <h1>{t('Checkout')}</h1>
      <div className="checkout">
        <div>
          <section className="panel">
            <h2>1. {t('How do you want it?')}</h2>
            {(['delivery', 'pickup'] as const).map((m) => (
              <label key={m} className={`choice ${method === m ? 'selected' : ''}`}>
                <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                <span><strong>{m === 'delivery' ? t('Delivery') : t('Pickup from the store')}</strong><br /><span className="muted small">{m === 'delivery' ? 'A driver brings each store’s order to your door.' : 'Collect it yourself. Only stores that offer pickup can be used.'}</span></span>
              </label>
            ))}
            {method === 'pickup' && !pickupOk && <Notice tone="warn">One of the stores in your basket does not offer pickup.</Notice>}
          </section>

          {method === 'delivery' && (
            <section className="panel">
              <h2>2. {t('Delivery address')}</h2>
              {addrs.loading && <Loading />}
              {addrs.data?.map((a) => (
                <label key={a.id} className={`choice ${addressId === a.id ? 'selected' : ''}`}>
                  <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  <span><strong>{a.label ?? a.recipient_name}</strong> {a.serviceable ? <Badge tone="ok">{t('We deliver here')}</Badge> : <Badge tone="danger">{t('Outside our area')}</Badge>}<br />
                    <span className="small muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postal_code}</span></span>
                </label>
              ))}
              {adding || !addrs.data?.length
                ? <AddressForm name={me.full_name} onCancel={addrs.data?.length ? () => setAdding(false) : undefined} onSaved={async (a) => { await addrs.reload(); setAddressId(a.id); setAdding(false); }} />
                : <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>{t('Add a new address')}</Button>}
            </section>
          )}

          {quote?.suborders.some((s) => s.preorders_enabled) && (
            <section className="panel">
              <h2>{method === 'delivery' ? '3' : '2'}. When?</h2>
              {quote.suborders.filter((s) => s.preorders_enabled).map((s) => {
                const closedNow = quote.issues.some((i) => i.type === 'store_closed' && i.store_slug === s.store_slug);
                const chosen = !!slots[s.store_slug] || later[s.store_slug] || closedNow;
                return (
                  <div key={s.store_slug} style={{ marginBottom: 12 }}>
                    <strong>{s.store_name}</strong>
                    {!closedNow && <label className={`choice ${!chosen ? 'selected' : ''}`}><input type="radio" name={`when-${s.store_slug}`} checked={!chosen} onChange={() => { setLater((l) => ({ ...l, [s.store_slug]: false })); setSlots(({ [s.store_slug]: _drop, ...rest }) => rest); }} /><span><strong>As soon as possible</strong></span></label>}
                    <label className={`choice ${chosen ? 'selected' : ''}`}><input type="radio" name={`when-${s.store_slug}`} checked={chosen} onChange={() => setLater((l) => ({ ...l, [s.store_slug]: true }))} /><span><strong>Choose a time</strong>{closedNow && <><br /><span className="muted small">This store is closed right now, so pick a time for later.</span></>}</span></label>
                    {chosen && <SlotPicker slug={s.store_slug} value={slots[s.store_slug]} onChange={(v) => setSlots((cur) => { const { [s.store_slug]: _drop, ...rest } = cur; return v ? { ...rest, [s.store_slug]: v } : rest; })} />}
                  </div>
                );
              })}
            </section>
          )}
          <section className="panel">
            <h2>{(method === 'delivery' ? 3 : 2) + (quote?.suborders.some((s) => s.preorders_enabled) ? 1 : 0)}. {t('Extras')}</h2>
            {method === 'delivery' && on('shop.tips') && (
              <fieldset className="tip-box">
                <legend>{t('Tip your driver')}</legend>
                <p className="muted small" style={{ margin: '0 0 8px' }}>{t('100% goes to the driver who delivers your order. If the delivery doesn’t happen, it’s refunded.')}</p>
                <div className="tip-opts">
                  {[0, 200, 300, 500].map((c) => (
                    <button type="button" key={c} className={`chip ${tip === c && !customTip ? 'on' : ''}`} aria-pressed={tip === c && !customTip} onClick={() => { setTip(c); setCustomTip(''); }}>{c ? money(c) : t('No tip')}</button>
                  ))}
                  <label className="tip-custom">{t('Other $')}<input type="number" min="0" max="100" step="0.5" inputMode="decimal" value={customTip} placeholder="0.00" aria-label="Custom tip in dollars"
                    onChange={(e) => { setCustomTip(e.target.value); const v = Math.round(Number(e.target.value) * 100); setTip(Number.isFinite(v) ? Math.max(0, Math.min(10000, v)) : 0); }} /></label>
                </div>
              </fieldset>
            )}
            {on('shop.gift_notes') && <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} /> {t('This is a gift (add a note for the store)')}</label>}
            {gift && on('shop.gift_notes') && <Field label={t('Gift note')} hint="The store will see this with your order. No prices are shared with the recipient."><Textarea rows={2} maxLength={300} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Happy birthday, Mum!" /></Field>}
          </section>
          <section className="panel">
            <h2>{(method === 'delivery' ? 4 : 3) + (quote?.suborders.some((s) => s.preorders_enabled) ? 1 : 0)}. {t('Notes and discount code')}</h2>
            <Field label="Notes for the stores (optional)"><Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Allergies, ripeness, anything the store should know…" /></Field>
            <form className="row top" onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim()); }}>
              <div className="grow"><Field label={t('Discount code')}><Input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={t('Enter code')} autoCapitalize="characters" /></Field></div>
              <Button type="submit" variant="secondary" style={{ marginTop: 24 }}>{t('Apply')}</Button>
            </form>
            {quote?.coupon_error && <p className="error-text">{quote.coupon_error}</p>}
            {quote?.coupon && <p className="okc small">“{quote.coupon.code}” applied: −{money(quote.coupon.discount_cents)}</p>}
          </section>
        </div>

        <aside>
          <section className="panel" aria-label="Order summary">
            <h2>{t('Summary')}</h2>
            {quoteErr && <ErrorBox message={quoteErr} />}
            {!quote && !quoteErr && <SkelRows n={2} label="Checking prices" />}
            {quote && (
              <>
                {quote.separate_deliveries && <Notice tone="warn">{quote.suborders.length} stores = {quote.suborders.length} separate deliveries, each with its own fee and arrival time.</Notice>}
                {quote.suborders.map((s) => (
                  <div key={s.store_slug} style={{ marginBottom: 14 }}>
                    <strong>{s.store_name}</strong>{s.scheduled_for ? <span className="muted small"> · scheduled for {slotText(s.scheduled_for, s.scheduled_until)}</span> : s.eta_minutes && <span className="muted small"> · arrives about {s.eta_minutes} min after the store confirms</span>}
                    {s.lines.map((l, i) => <div key={i} className="summary-row small"><span>{l.quantity} × {l.name}</span><span>{money(l.line_total_cents)}</span></div>)}
                    {method === 'delivery' && <div className="summary-row small"><span>Delivery</span><span>{money(s.delivery_cents)}</span></div>}
                  </div>
                ))}
                <hr />
                <div className="summary-row"><span>{t('Items')}</span><span>{money(quote.subtotal_cents)}</span></div>
                {quote.discount_cents > 0 && <div className="summary-row okc"><span>{t('Discount')}</span><span>−{money(quote.discount_cents)}</span></div>}
                {method === 'delivery' && <div className="summary-row"><span>{t('Delivery (incl. tax)')}</span><span>{money(quote.delivery_cents)}</span></div>}
                <div className="summary-row"><span>{t('GST on taxable items')}</span><span>{money(quote.tax_cents)}</span></div>
                {quote.tip_cents > 0 && <div className="summary-row"><span>{t('Driver tip')}</span><span>{money(quote.tip_cents)}</span></div>}
                <div className="summary-row total"><span>{t('Total')}</span><span>{money(quote.total_cents)}</span></div>
                {on('shop.store_credit') && quote.credit_available_cents > 0 && quote.suborders.length > 0 && (
                  <label className="check" style={{ margin: '8px 0' }}><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} /> {t('Use my store credit')} ({money(quote.credit_available_cents)} available)</label>)}
                {quote.credit_applied_cents > 0 && <><div className="summary-row okc"><span>{t('Store credit')}</span><span>−{money(quote.credit_applied_cents)}</span></div><div className="summary-row"><span><strong>{t('To pay by card')}</strong></span><strong>{money(quote.pay_cents)}</strong></div></>}
                {quote.warnings.map((w, i) => <Notice key={i} tone="warn">{w.message}</Notice>)}
                {issues.length > 0 && <Notice tone="error"><strong>{t('Before you can pay:')}</strong><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{issues.map((i, k) => <li key={k}>{i.message}</li>)}</ul><p style={{ margin: '8px 0 0' }}><Link to="/cart">{t('Edit basket')}</Link></p></Notice>}
                {place.error && <ErrorBox message={place.error} />}
                <Button size="lg" style={{ width: '100%' }} busy={place.busy} disabled={!quote.ok || (method === 'delivery' && !addressId)} onClick={() => place.run()}>{t('Continue to payment')} · {money(quote.pay_cents)}</Button>
                <p className="small muted" style={{ marginTop: 8 }}>{t('You are not charged until the next step. We never see or store your card number.')}</p>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

export function PaymentStep({ order, cfg, onPaid, kind = 'order' }: { order: { id: string; order_number: string; total_cents: number; pay_cents?: number; client_secret: string | null }; cfg?: Cfg; onPaid: () => void; kind?: 'order' | 'gift' }) {
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const simulate = async (outcome: 'succeeded' | 'failed') => {
    setBusy(true); setErr(undefined);
    try {
      await post(kind === 'gift' ? `/dev/gift-cards/${order.id}/simulate-payment` : `/dev/orders/${order.id}/simulate-payment`, { outcome });
      if (outcome === 'succeeded') onPaid(); else setErr('Your card was declined (simulated). Nothing was charged. You can go back and try again.');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  if (!cfg) return <Loading />;
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1>Payment</h1>
      <p>{kind === 'gift' ? 'Gift card' : <>Order <strong>{order.order_number}</strong></>} · Total <strong>{money(order.pay_cents ?? order.total_cents)}</strong>{order.pay_cents != null && order.pay_cents < order.total_cents && <span className="muted small"> (after {money(order.total_cents - order.pay_cents)} store credit)</span>}</p>
      {kind === 'order' && <Notice>Your stock is being held for you for a short time while you pay.</Notice>}
      {cfg.payment_provider === 'mock' ? (
        <div className="test-banner" role="region" aria-label="Test payment">
          <strong>TEST MODE: no real money moves.</strong>
          <p className="small">This is a development payment screen. Choosing an outcome sends a signed provider event through the same webhook that real payments use. This screen does not exist in production.</p>
          {err && <Notice tone="error">{err}</Notice>}
          <div className="stack"><Button size="lg" busy={busy} onClick={() => simulate('succeeded')}>Simulate successful payment</Button><Button variant="secondary" busy={busy} onClick={() => simulate('failed')}>Simulate declined card</Button></div>
        </div>
      ) : <StripePay order={order} publishableKey={cfg.stripe_publishable_key} onSubmitted={onPaid} returnPath={kind === 'gift' ? `/gift-cards/${order.id}` : `/orders/${order.id}`} />}
      {kind === 'order' && <p className="row" style={{ marginTop: 14 }}><Link to={`/orders/${order.id}`}>View this order</Link></p>}
    </div>
  );
}

/** Stripe Payment Element. UNVERIFIED against a live Stripe account (no credentials were available); see docs/PAYMENTS.md. */
function StripePay({ order, publishableKey, onSubmitted, returnPath }: { order: { id: string; client_secret: string | null }; publishableKey: string | null; onSubmitted: () => void; returnPath: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const ctx = useRef<{ stripe: any; elements: any } | null>(null);
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!publishableKey || !order.client_secret) return;
    let off = false;
    import('@stripe/stripe-js').then(async ({ loadStripe }) => {
      const stripe = await loadStripe(publishableKey);
      if (!stripe || off) return;
      const elements = stripe.elements({ clientSecret: order.client_secret! });
      elements.create('payment').mount(mount.current!);
      ctx.current = { stripe, elements };
    }).catch((e) => setErr(e.message));
    return () => { off = true; };
  }, [publishableKey, order.client_secret]);
  if (!publishableKey) return <Notice tone="error">Card payments are not configured yet (missing publishable key).</Notice>;
  return (
    <div>
      <div ref={mount} />
      {err && <Notice tone="error">{err}</Notice>}
      <Button size="lg" style={{ width: '100%', marginTop: 12 }} busy={busy} onClick={async () => {
        if (!ctx.current) return; setBusy(true);
        const r = await ctx.current.stripe.confirmPayment({ elements: ctx.current.elements, redirect: 'if_required', confirmParams: { return_url: `${location.origin}${returnPath}` } });
        setBusy(false);
        if (r.error) setErr(r.error.message); else onSubmitted();   // the order page waits for the webhook before showing "paid"
      }}>Pay now</Button>
    </div>
  );
}

