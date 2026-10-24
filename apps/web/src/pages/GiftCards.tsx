import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money, post } from '../api';
import { useAuth } from '../auth';
import { useAction, useApi } from '../hooks';
import { useFeature } from '../features';
import { useToast } from '../toast';
import { Button, ErrorBox, Field, Input, Loading, Notice, Textarea } from '../ui';
import { PaymentStep } from './Checkout';

type Gift = { id: string; amount_cents: number; status: 'pending_payment' | 'paid' | 'failed'; recipient_email: string | null; recipient_name: string | null; code: string | null; payment: { provider: string; client_secret: string | null } | null };
type Cfg = { payment_provider: 'mock' | 'stripe'; stripe_publishable_key: string | null; test_mode: boolean };
const PRESETS = [2500, 5000, 10000];

/** Buy a gift card for someone (or yourself). Gift cards are not refundable and the code is shown only after payment is confirmed. */
export function GiftCardPage() {
  const { me } = useAuth(); const nav = useNavigate();
  const on = useFeature('shop.gift_cards');
  const cfg = useApi<Cfg>('/config');
  const [amount, setAmount] = useState(5000); const [custom, setCustom] = useState('');
  const [gift, setGift] = useState<Gift | null>(null);
  const key = useRef(crypto.randomUUID());
  const start = useAction(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setGift(await post<Gift>('/gift-cards', { amount_cents: amount, recipient_name: f.name || null, recipient_email: f.email || null, message: f.message || null }, { 'idempotency-key': key.current }));
  });
  if (!on) return <Notice>Gift cards are not available right now.</Notice>;
  if (gift?.payment && cfg.data) return <PaymentStep kind="gift" order={{ id: gift.id, order_number: 'Gift card', total_cents: gift.amount_cents, client_secret: gift.payment.client_secret }} cfg={cfg.data} onPaid={() => nav(`/gift-cards/${gift.id}`)} />;
  return (
    <>
      <h1>Gift cards</h1>
      <p className="muted">Give African groceries from local stores. The recipient adds the code to their account and uses it at checkout. Gift cards are not refundable.</p>
      {!me && <Notice><Link to="/signin?next=/gift-cards">Sign in</Link> or <Link to="/register?next=/gift-cards">create an account</Link> to buy a gift card.</Notice>}
      <form className="panel" onSubmit={start.run}>
        <fieldset className="tip-box"><legend>Amount</legend>
          <div className="tip-opts">
            {PRESETS.map((c) => <button type="button" key={c} className={`chip ${amount === c && !custom ? 'on' : ''}`} aria-pressed={amount === c && !custom} onClick={() => { setAmount(c); setCustom(''); }}>{money(c)}</button>)}
            <label className="tip-custom">Other $<input type="number" min="10" max="500" step="1" inputMode="numeric" value={custom} placeholder="10–500" aria-label="Custom amount in dollars" onChange={(e) => { setCustom(e.target.value); const v = Math.round(Number(e.target.value) * 100); if (Number.isFinite(v) && v >= 1000 && v <= 50000) setAmount(v); }} /></label>
          </div>
        </fieldset>
        <div className="form-grid">
          <Field label="Recipient’s name (optional)"><Input name="name" maxLength={80} /></Field>
          <Field label="Recipient’s email (optional)" hint="We email them the code. Leave blank to get the code yourself."><Input name="email" type="email" /></Field>
        </div>
        <Field label="Message (optional)"><Textarea name="message" rows={2} maxLength={300} placeholder="Happy birthday!" /></Field>
        {start.error && <ErrorBox message={start.error} />}
        <Button type="submit" size="lg" busy={start.busy} disabled={!me || amount < 1000 || amount > 50000}>Continue to payment · {money(amount)}</Button>
      </form>
    </>
  );
}

/** After paying: the code (to the buyer only). Waits for the payment confirmation, which can take a moment. */
export function GiftCardDonePage() {
  const { id } = useParams(); const toast = useToast();
  const { data, loading, error, reload } = useApi<Gift>(`/gift-cards/${id}`);
  useEffect(() => { if (data?.status !== 'pending_payment') return; const t = setInterval(reload, 3000); return () => clearInterval(t); }, [data?.status, reload]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!data) return null;
  return (
    <>
      <h1>Gift card</h1>
      {data.status === 'pending_payment' && <Notice>Waiting for your payment to be confirmed. This page updates by itself.</Notice>}
      {data.status === 'failed' && <Notice tone="error">The payment did not go through, so no card was made and you were not charged. <Link to="/gift-cards">Try again</Link>.</Notice>}
      {data.status === 'paid' && data.code && (
        <section className="panel"><p>Your <strong>{money(data.amount_cents)}</strong> gift card is ready.</p>
          <p className="code-box" aria-label={`Gift card code ${data.code}`}>{data.code}</p>
          <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(data.code!); toast('Code copied'); } catch { toast('Copy failed', 'error'); } }}>Copy code</Button>
          <p className="small muted">{data.recipient_email ? `We also emailed it to ${data.recipient_email}.` : 'Share this code with the person you are giving it to.'} It can be used once, from Account → Store credit.</p>
        </section>)}
    </>
  );
}
