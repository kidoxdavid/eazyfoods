import { useEffect, useState } from 'react';
import { fmtDate, money, post, put } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Button, Card, ErrorBox, Field, Input, Loading, Notice, PageHeader } from './kit';

type R = { cashback_bps: number; referral_reward_cents: number; referral_min_order_cents: number; referral_max_per_user: number; liability_cents: number; given_30d_cents: number };
type G = { code: string; amount_cents: number; note: string | null; expires_at: string | null; created_at: string; redeemed_at: string | null; redeemed_by_email: string | null };

/** Rewards, referrals, gift codes and goodwill credit. All of it is money the company gives away, so every programme starts OFF. */
export default function Rewards() {
  const toast = useToast();
  const d = useApi<R>('/marketing/rewards'); const codes = useApi<G[]>('/marketing/gift-codes');
  const [f, setF] = useState<any>(null); const [fresh, setFresh] = useState<string[]>([]);
  useEffect(() => { if (d.data) setF({ cashback: String(d.data.cashback_bps / 100), reward: String(d.data.referral_reward_cents / 100), min: String(d.data.referral_min_order_cents / 100), max: String(d.data.referral_max_per_user) }); }, [d.data]);
  const save = useAction(async () => {
    await put('/marketing/rewards', { cashback_bps: Math.round(Number(f.cashback) * 100), referral_reward_cents: Math.round(Number(f.reward) * 100), referral_min_order_cents: Math.round(Number(f.min) * 100), referral_max_per_user: Number(f.max) });
    toast('Saved'); d.reload();
  });
  const make = useAction(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const v = new FormData(e.currentTarget);
    const r = await post<{ codes: string[] }>('/marketing/gift-codes', { amount_cents: Math.round(Number(v.get('amount')) * 100), count: Number(v.get('count') || 1), note: String(v.get('note') || '') || undefined });
    setFresh(r.codes); codes.reload();
  });
  const grant = useAction(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const v = new FormData(e.currentTarget);
    await post('/marketing/credit/grant', { email: String(v.get('email')), amount_cents: Math.round(Number(v.get('amount')) * 100), note: String(v.get('note')) }); toast('Credit added.'); (e.target as HTMLFormElement).reset();
  });
  if (d.loading && !f) return <Loading />;
  if (d.error) return <ErrorBox message={d.error} retry={d.reload} />;
  if (!f || !d.data) return null;
  return (
    <>
      <PageHeader title="Rewards and credit" sub="Cashback, invite rewards, gift codes and goodwill credit. Everything is off until you turn it on." />
      <Notice>Store credit is a promise to customers: <strong>{money(d.data.liability_cents)}</strong> is owed right now, and <strong>{money(d.data.given_30d_cents)}</strong> was given in the last 30 days. Ask your accountant how to treat gift codes and rewards (including any expiry rules) before launching widely.</Notice>
      <Card>
        <h3>Programmes</h3>
        {save.error && <Notice tone="error">{save.error}</Notice>}
        <Field label="Cashback on delivered orders (%)" hint="0 turns it off. Paid as store credit after delivery, on what was actually delivered after refunds."><Input type="number" min="0" max="10" step="0.1" value={f.cashback} onChange={(e) => setF({ ...f, cashback: e.target.value })} /></Field>
        <Field label="Invite reward, each (CA$)" hint="0 turns invites off. Both the inviter and the friend get this after the friend's first completed order and verified email."><Input type="number" min="0" max="50" step="0.5" value={f.reward} onChange={(e) => setF({ ...f, reward: e.target.value })} /></Field>
        <Field label="Friend's first order must be at least (CA$)"><Input type="number" min="0" step="1" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></Field>
        <Field label="Most rewarded invites per person"><Input type="number" min="0" max="100" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></Field>
        <Button busy={save.busy} onClick={() => save.run()}>Save</Button>
      </Card>
      <Card>
        <h3>Make gift codes</h3>
        <form onSubmit={make.run}>{make.error && <Notice tone="error">{make.error}</Notice>}
          <Field label="Value each (CA$)"><Input name="amount" type="number" min="1" max="500" step="1" required /></Field>
          <Field label="How many (1 to 50)"><Input name="count" type="number" min="1" max="50" defaultValue="1" /></Field>
          <Field label="Note (for you)"><Input name="note" maxLength={200} /></Field>
          <Button type="submit" busy={make.busy}>Create</Button></form>
        {fresh.length > 0 && <Notice tone="ok"><strong>New codes (copy them now):</strong><pre style={{ margin: '6px 0 0' }}>{fresh.join('\n')}</pre></Notice>}
        {codes.data && <table className="tbl"><thead><tr><th>Code</th><th>Value</th><th>Note</th><th>Status</th></tr></thead><tbody>
          {codes.data.map((g) => <tr key={g.code}><td>{g.code}</td><td>{money(g.amount_cents)}</td><td>{g.note ?? ''}</td><td>{g.redeemed_at ? `Used ${fmtDate(g.redeemed_at)} by ${g.redeemed_by_email}` : 'Unused'}</td></tr>)}</tbody></table>}
      </Card>
      <Card>
        <h3>Goodwill credit for one customer</h3>
        <form onSubmit={grant.run}>{grant.error && <Notice tone="error">{grant.error}</Notice>}
          <Field label="Customer email"><Input name="email" type="email" required /></Field>
          <Field label="Amount (CA$)"><Input name="amount" type="number" min="1" max="200" step="1" required /></Field>
          <Field label="Reason (recorded)"><Input name="note" required minLength={3} maxLength={200} /></Field>
          <Button type="submit" busy={grant.busy}>Add credit</Button></form>
      </Card>
    </>
  );
}
