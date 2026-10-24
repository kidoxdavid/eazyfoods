import { Link } from 'react-router-dom';
import { fmtDate, money, post } from '../api';
import { useAction, useApi } from '../hooks';
import { useToast } from '../toast';
import { Button, ErrorBox, Field, Input, Loading, Notice } from '../ui';

type Info = {
  balance_cents: number; entries: { id: number; delta_cents: number; kind: string; note: string | null; created_at: string; order_id: string | null }[];
  program: { cashback_bps: number; referral_reward_cents: number; referral_min_order_cents: number };
  referral: { code: string; link: string; invited: number; rewarded: number } | null;
};
const KIND: Record<string, string> = { grant: 'Credit from EAZyfoods', cashback: 'Cashback', referral: 'Invite reward', gift_code: 'Gift code', redeem: 'Used at checkout', release: 'Returned (order not paid)', refund: 'Refunded to credit', adjust: 'Adjustment' };

/** Store credit: balance, history, gift codes and the invite link. Credit has no cash value and cannot be withdrawn. */
export function CreditPage() {
  const { data, loading, error, reload } = useApi<Info>('/me/credit');
  const toast = useToast();
  const redeem = useAction(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const code = String(new FormData(e.currentTarget).get('code'));
    const r = await post<{ added_cents: number }>('/me/credit/redeem', { code }); toast(`${money(r.added_cents)} added to your credit.`); (e.target as HTMLFormElement).reset(); reload();
  });
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!data) return null;
  const { program: p, referral: r } = data;
  return (
    <>
      <h1>Store credit</h1>
      <div className="panel"><div className="muted small">Your balance</div><div style={{ fontSize: '2rem', fontWeight: 800 }}>{money(data.balance_cents)}</div>
        <p className="small muted">Use it at checkout by ticking “Use my store credit”. It has no cash value and cannot be withdrawn.</p></div>
      <section className="panel"><h2 style={{ marginTop: 0 }}>Have a gift code?</h2>
        <form className="row top" onSubmit={redeem.run}><div className="grow"><Field label="Gift code"><Input name="code" required placeholder="EAZY-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" /></Field></div><Button type="submit" busy={redeem.busy} style={{ marginTop: 24 }}>Add</Button></form>
        {redeem.error && <p className="error-text">{redeem.error}</p>}</section>
      {r && <section className="panel"><h2 style={{ marginTop: 0 }}>Invite a friend</h2>
        <p>When a friend joins with your link, verifies their email and completes a first order of {money(p.referral_min_order_cents)} or more, you both get <strong>{money(p.referral_reward_cents)}</strong> in store credit.</p>
        <div className="row wrap"><Input readOnly aria-label="Your invite link" value={r.link} onFocus={(e) => e.currentTarget.select()} /><Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(r.link); toast('Link copied'); } catch { toast('Copy failed', 'error'); } }}>Copy</Button></div>
        <p className="small muted">{r.invited} joined with your link · {r.rewarded} rewarded</p></section>}
      {p.cashback_bps > 0 && <Notice>You earn {(p.cashback_bps / 100).toFixed(p.cashback_bps % 100 ? 1 : 0)}% back as store credit on delivered orders.</Notice>}
      <h2>History</h2>
      {!data.entries.length ? <p className="muted">Nothing yet.</p> : <ul className="list-items" role="list">{data.entries.map((e) => (
        <li key={e.id} className="panel row between wrap"><span>{KIND[e.kind] ?? e.kind}{e.note ? <span className="muted small"> · {e.note}</span> : null}<div className="muted small">{fmtDate(e.created_at)}{e.order_id && <> · <Link to={`/orders/${e.order_id}`}>order</Link></>}</div></span>
          <strong className={e.delta_cents > 0 ? 'okc' : ''}>{e.delta_cents > 0 ? '+' : '−'}{money(Math.abs(e.delta_cents))}</strong></li>))}</ul>}
    </>
  );
}
