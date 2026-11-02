import { useState } from 'react';
import { SkelRows, SkelGrid } from '../skeletons';
import { useFeature, useFeatures } from '../features';
import { Link, useNavigate } from 'react-router-dom';
import { api, del, post, put } from '../api';
import { useAuth } from '../auth';
import { useAction, useApi } from '../hooks';
import { useToast } from '../toast';
import { Badge, Button, Confirm, Empty, ErrorBox, Field, Input, Loading, Notice, Tabs, StatusBadge } from '../ui';
import { ProductGrid } from '../cards';
import { AddressForm } from './Checkout';
import { fmtDate, money } from '../api';

type Summary = {
  rewards: { points: number; value_cents: number; can_redeem: boolean; step: number; step_value_cents: number; to_next: number; next_at: number; next_reward_cents: number; progress: number } | null;
  membership: { member: { status: string; ends_at: string; active: boolean } | null; can_try: boolean; trial_days: number; free_delivery_min_cents: number; points_multiplier: number } | null;
  buy_again: number; saved: number; group_orders: number; unread_messages: number;
};

/** The top of the account page: points, the EAZY+ offer, and one tidy list of the things people come here for. */
function AccountHome() {
  const toast = useToast();
  const sum = useApi<Summary>('/me/summary');
  const [busy, setBusy] = useState(false);
  const s = sum.data; if (!s) return null;
  const redeem = async () => { setBusy(true); try { await post('/rewards/redeem', { points: s.rewards!.step }); toast(`Done: ${money(s.rewards!.step_value_cents)} added to your store credit.`); sum.reload(); } catch (e: any) { toast(e.message ?? 'Could not redeem.', 'error'); } finally { setBusy(false); } };
  const trial = async () => { setBusy(true); try { await post('/membership/trial'); toast('Welcome to EAZY+! Your free trial has started.'); sum.reload(); } catch (e: any) { toast(e.message ?? 'Could not start it.', 'error'); } finally { setBusy(false); } };
  const r = s.rewards, m = s.membership;
  return (
    <div className="acct-home">
      {r && (
        <section className="rw-card" aria-label="EAZY Rewards">
          <small>EAZY Rewards</small>
          <b>{r.points.toLocaleString()} pts</b>
          <span>= {money(r.value_cents)} in store credit · {r.to_next.toLocaleString()} pts to your next {money(r.next_reward_cents)} reward</span>
          <i role="progressbar" aria-valuenow={r.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to your next reward"><em style={{ width: `${r.progress}%` }} /></i>
          {r.can_redeem && <button className="rw-redeem" onClick={redeem} disabled={busy}>Redeem {r.step} pts for {money(r.step_value_cents)}</button>}
        </section>)}
      {m && (
        <section className="plus-card" aria-label="EAZY+">
          {m.member?.active
            ? <div><b>EAZY+ member</b><small>Free delivery over {money(m.free_delivery_min_cents)} · {m.points_multiplier}× points · until {fmtDate(m.member.ends_at)}</small></div>
            : <><div><b>EAZY+ · free for {m.trial_days} days</b><small>Free delivery over {money(m.free_delivery_min_cents)} · {m.points_multiplier}× points{m.member ? ' · your trial has ended' : ''}</small></div>
              {m.can_try && <button onClick={trial} disabled={busy}>Try free</button>}</>}
        </section>)}
      <nav className="acct-list" aria-label="Your things">
        <Link to="/buy-again">🧺 Buy again <small>{s.buy_again} item{s.buy_again === 1 ? '' : 's'} ›</small></Link>
        <Link to="/saved">♡ Saved items <small>{s.saved} ›</small></Link>
        <Link to="/cart">👥 Group orders <small>{s.group_orders ? `${s.group_orders} open ›` : 'Start one ›'}</small></Link>
        <Link to="/orders">💬 Messages <small>{s.unread_messages ? `${s.unread_messages} new ›` : '›'}</small></Link>
      </nav>
    </div>
  );
}

export function AccountPage() {
  const on = useFeatures();
  const [tab, setTab] = useState('profile');
  const { me, logout, isVendor, has, isStaff } = useAuth();
  return (
    <>
      <h1>Your account</h1>
      <p className="muted">{me?.email}</p>
      <AccountHome />
      <div className="row wrap">{isVendor && <Link to="/vendor" className="btn secondary sm">Vendor portal</Link>}{has('driver') && <Link to="/driver" className="btn secondary sm">Driver portal</Link>}{isStaff && <Link to="/admin" className="btn secondary sm">Admin</Link>}</div>
      <div className="row wrap">{on('shop.lists') && <Link to="/lists" className="btn secondary sm">Shopping lists</Link>}{on('shop.alerts') && <Link to="/alerts" className="btn secondary sm">Alerts</Link>}{on('shop.store_credit') && <Link to="/credit" className="btn secondary sm">Store credit</Link>}</div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'profile', label: 'Profile' }, { id: 'addresses', label: 'Addresses' }, { id: 'favourites', label: 'Saved' }, { id: 'support', label: 'Help requests' }, { id: 'privacy', label: 'Privacy & security' }]} />
      {tab === 'profile' && <Profile />}{tab === 'addresses' && <Addresses />}{tab === 'favourites' && <Favourites />}{tab === 'support' && <Tickets />}{tab === 'privacy' && <Privacy />}
      <hr /><Button variant="ghost" onClick={logout}>Sign out</Button>
    </>
  );
}

function Profile() {
  const p = useApi<{ full_name: string; phone: string | null; email_verified_at: string | null; notify_email: boolean; marketing_opt_in_at: string | null; sms_opt_in_at: string | null }>('/account/profile');
  const smsOn = useFeature('shop.sms');
  const toast = useToast();
  const save = useAction(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await put('/account/profile', { full_name: f.get('full_name'), phone: f.get('phone') || null, notify_email: f.get('notify') === 'on', marketing_opt_in: f.get('marketing') === 'on', ...(smsOn ? { sms_opt_in: f.get('sms') === 'on' } : {}) });
    toast('Saved'); p.reload();
  });
  const verify = useAction(async () => { await post('/auth/verify/request'); toast('Verification email sent'); });
  if (p.loading) return <Loading />;
  if (!p.data) return <ErrorBox message={p.error ?? 'Could not load profile'} />;
  return (
    <form onSubmit={save.run} className="panel" key={JSON.stringify(p.data)}>
      {save.error && <ErrorBox message={save.error} />}
      <Field label="Full name"><Input name="full_name" required defaultValue={p.data.full_name} /></Field>
      <Field label="Phone"><Input name="phone" type="tel" defaultValue={p.data.phone ?? ''} /></Field>
      <p>{p.data.email_verified_at ? <Badge tone="ok">Email verified</Badge> : <>Email not verified yet. <button type="button" className="link" onClick={() => verify.run()}>Send verification email</button></>}</p>
      <label className="check"><input type="checkbox" name="notify" defaultChecked={p.data.notify_email} /> Email me order progress updates (payment and order confirmations are always sent)</label>
      <label className="check"><input type="checkbox" name="marketing" defaultChecked={!!p.data.marketing_opt_in_at} /> Email me offers and news{p.data.marketing_opt_in_at ? ` (opted in ${fmtDate(p.data.marketing_opt_in_at, { dateStyle: 'medium' })})` : ''}</label>
      {smsOn && <label className="check"><input type="checkbox" name="sms" defaultChecked={!!p.data.sms_opt_in_at} /> Text me when my order is out for delivery or ready for pickup (uses the phone number above; message and data rates may apply; reply STOP to stop)</label>}
      <Button type="submit" busy={save.busy}>Save changes</Button>
    </form>
  );
}

function Addresses() {
  const a = useApi<any[]>('/addresses'); const [adding, setAdding] = useState(false); const toast = useToast();
  if (a.loading) return <SkelRows n={2} />;
  return (
    <>
      {!a.data?.length && !adding && <Empty title="No saved addresses" />}
      {a.data?.map((x) => (
        <div key={x.id} className="panel row between wrap">
          <div><strong>{x.label ?? x.recipient_name}</strong> {x.is_default && <Badge>Default</Badge>} {x.serviceable ? <Badge tone="ok">We deliver here</Badge> : <Badge tone="danger">Outside our area</Badge>}
            <div className="small muted">{x.line1}{x.line2 ? `, ${x.line2}` : ''}, {x.city} {x.postal_code} · {x.phone}</div></div>
          <Confirm size="sm" variant="secondary" message="Delete this address?" onConfirm={async () => { await del(`/addresses/${x.id}`); toast('Address removed'); a.reload(); }}>Delete</Confirm>
        </div>
      ))}
      {adding ? <div className="panel"><AddressForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); a.reload(); }} /></div> : <Button variant="secondary" onClick={() => setAdding(true)}>Add an address</Button>}
    </>
  );
}

/** The items you tapped the heart on, as their own page (also under Account > Saved). */
export function SavedPage() {
  return <><h1>Saved items</h1><p className="muted">Everything you tapped the heart on.</p><Favourites /></>;
}

function Favourites() {
  const f = useApi<any[]>('/favourites');
  if (f.loading) return <SkelGrid n={4} />;
  if (!f.data?.length) return <Empty title="Nothing saved yet"><p>Tap the heart on any product to keep it here.</p></Empty>;
  return <ProductGrid products={f.data} />;
}

function Tickets() {
  const t = useApi<{ id: string; subject: string; status: string; created_at: string }[]>('/support/tickets');
  const [open, setOpen] = useState<string | null>(null);
  if (t.loading) return <SkelRows n={3} />;
  if (!t.data?.length) return <Empty title="No help requests"><p>To report a problem, open an order and choose “Report a problem”.</p></Empty>;
  return <>{t.data.map((x) => <div key={x.id} className="panel"><div className="row between"><strong>{x.subject}</strong><StatusBadge status={x.status} /></div><div className="small muted">{fmtDate(x.created_at)}</div>
    <button className="link" onClick={() => setOpen(open === x.id ? null : x.id)}>{open === x.id ? 'Hide conversation' : 'View conversation'}</button>{open === x.id && <Thread id={x.id} />}</div>)}</>;
}
function Thread({ id }: { id: string }) {
  const t = useApi<{ messages: { body: string; mine: boolean; created_at: string }[] }>(`/support/tickets/${id}`);
  const send = useAction(async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = e.currentTarget; await post(`/support/tickets/${id}/messages`, { body: new FormData(f).get('body') }); f.reset(); t.reload(); });
  if (t.loading) return <Loading />;
  return <div className="stack" style={{ marginTop: 8 }}>{t.data?.messages.map((m, i) => <div key={i} className={`notice ${m.mine ? '' : 'ok'}`}><strong>{m.mine ? 'You' : 'EAZyfoods'}</strong> · <span className="small muted">{fmtDate(m.created_at)}</span><br />{m.body}</div>)}
    <form onSubmit={send.run} className="row"><Input name="body" required placeholder="Write a reply…" aria-label="Reply" /><Button type="submit" busy={send.busy}>Send</Button></form></div>;
}

function Privacy() {
  const nav = useNavigate(); const { reload } = useAuth(); const toast = useToast();
  const pw = useAction(async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); await post('/account/password', { current_password: f.get('current'), new_password: f.get('next') }); toast('Password changed. Please sign in again.'); await reload(); nav('/signin'); });
  const exp = async () => {
    const data = await api('/account/export'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'my-eazyfoods-data.json'; a.click(); URL.revokeObjectURL(url);
  };
  const delAcct = useAction(async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); await post('/account/delete', { password: new FormData(e.currentTarget).get('password') }); await reload(); toast('Your account was deleted'); nav('/'); });
  return (
    <>
      <section className="panel"><h2>Change password</h2>
        <form onSubmit={pw.run}>{pw.error && <ErrorBox message={pw.error} />}<Field label="Current password"><Input name="current" type="password" required autoComplete="current-password" /></Field><Field label="New password" hint="At least 10 characters."><Input name="next" type="password" minLength={10} required autoComplete="new-password" /></Field><Button type="submit" busy={pw.busy}>Change password</Button></form></section>
      <section className="panel"><h2>Your data</h2><p>Download a copy of the personal information we hold about you.</p><Button variant="secondary" onClick={exp}>Download my data</Button></section>
      <section className="panel"><h2>Delete my account</h2>
        <Notice tone="warn">This removes your name, contact details, addresses and saved items. We must keep anonymised order and payment records for accounting and tax purposes. You cannot delete while an order is in progress.</Notice>
        <form onSubmit={delAcct.run}>{delAcct.error && <ErrorBox message={delAcct.error} />}<Field label="Confirm with your password"><Input name="password" type="password" required autoComplete="current-password" /></Field><Button type="submit" variant="danger" busy={delAcct.busy}>Delete my account</Button></form></section>
    </>
  );
}
