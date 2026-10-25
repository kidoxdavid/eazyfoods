import { useEffect, useState } from 'react';
import { PortalLayout } from '../backoffice';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth';
import { api, fmtDate, money, post, put } from '../../api';
import { useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, DataTable, Empty, ErrorBox, Field, Input, Loading, Modal, Notice, PageHeader, Stat, Textarea, formValues, Switch } from '../../ui';
import './driver.css';

type Addr = { line1?: string; line2?: string; city?: string; postal_code?: string; first_name?: string; phone?: string };
type Job = {
  id: string; status: 'assigned' | 'picked_up' | 'delivered' | 'failed'; instructions: string | null; earning_cents: number; tip_cents?: number;
  pickup: { store_name: string; address_line: string | null; city: string | null; postal_code: string | null; phone: string | null };
  dropoff: Addr; order_number: string; promised_at: string | null; delivered_at: string | null; assigned_at: string | null;
};
type Me = { status: 'none' | 'applied' | 'approved' | 'suspended' | 'rejected'; is_available?: boolean; phone?: string; vehicle?: string | null; nav_app?: string; share_location?: boolean; licence_verified?: boolean; background_check_verified?: boolean };

/** Local copy of useAction: the shared one stops reporting errors under React StrictMode (its alive-ref is never restored after the dev double-mount). */
function useAction<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = async (...a: A) => {
    setBusy(true); setError(undefined);
    try { return await fn(...a); } catch (e: any) { setError(e.message ?? 'Something went wrong'); return undefined; } finally { setBusy(false); }
  };
  return { run, busy, error };
}

const NAV = [
  { to: '/driver', label: 'Dashboard', end: true, group: 'Deliveries' },
  { to: '/driver/available', label: 'Available deliveries', group: 'Deliveries' },
  { to: '/driver/jobs', label: 'My deliveries', group: 'Deliveries' },
  { to: '/driver/history', label: 'Delivery history', group: 'Deliveries' },
  { to: '/driver/earnings', label: 'Earnings', group: 'Money' },
  { to: '/driver/performance', label: 'Performance', group: 'Money' },
  { to: '/driver/ratings', label: 'Ratings & reviews', group: 'Money' },
  { to: '/driver/support', label: 'Support', group: 'Account' },
  { to: '/driver/profile', label: 'Profile & settings', group: 'Account' },
  { to: '/driver/help', label: 'Documentation', group: 'Account' },
];
type NavApp = 'google' | 'apple' | 'waze';
const isLate = (j: Job) => !!j.promised_at && new Date(j.promised_at).getTime() < Date.now() && ['assigned', 'picked_up'].includes(j.status);
const dropAddr = (d: Addr) => [d.line1, d.line2, d.city, d.postal_code].filter(Boolean).join(', ');
const pickAddr = (p: Job['pickup']) => [p.address_line, p.city, p.postal_code].filter(Boolean).join(', ');
/** Turn-by-turn navigation opens in the driver's chosen app. */
const navUrl = (app: NavApp, q: string) => {
  const e = encodeURIComponent(q);
  if (app === 'apple') return `https://maps.apple.com/?daddr=${e}&dirflg=d`;
  if (app === 'waze') return `https://waze.com/ul?q=${e}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving`;
};
const embedUrl = (to: string, from?: string) => `https://maps.google.com/maps?${from ? `saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}` : `q=${encodeURIComponent(to)}`}&output=embed`;

export default function DriverPortal() {
  const me = useApi<Me>('/driver/me'); const { has } = useAuth();
  return (
    <PortalLayout tone="driver" title="Driver" subtitle="Deliveries, navigation and earnings" nav={NAV}>
      {me.loading ? <Loading /> : me.error ? <ErrorBox message={me.error} retry={me.reload} /> : me.data?.status === 'none' ? (has('admin') ? <Notice>You are signed in as an admin. Drivers are managed in <Link to="/admin/drivers">Admin → Drivers</Link> and <Link to="/admin/dispatch">Dispatch</Link>.</Notice> : <Apply onDone={me.reload} />)
        : me.data?.status !== 'approved' ? <Status status={me.data!.status} />
        : (
          <Routes>
            <Route index element={<Dashboard me={me.data} />} />
            <Route path="available" element={<Available />} />
            <Route path="jobs" element={<Jobs me={me.data} />} />
            <Route path="jobs/:id" element={<JobDetail me={me.data} />} />
            <Route path="history" element={<History />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="performance" element={<Performance />} />
            <Route path="ratings" element={<Ratings />} />
            <Route path="support" element={<Support />} />
            <Route path="profile" element={<Profile me={me.data} reload={me.reload} />} />
            <Route path="help" element={<Docs />} />
            <Route path="*" element={<Navigate to="/driver" replace />} />
          </Routes>
        )}
    </PortalLayout>
  );
}

function AvailabilityCard({ initial }: { initial: boolean }) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const toggle = useAction(async () => { const r = await put('/driver/availability', { available: !on }); setOn(r.is_available); toast(r.is_available ? 'You are available' : 'You are offline'); });
  return (
    <>
      <Card className="row between">
        <div><strong>{on ? 'Available' : 'Offline'}</strong><div className="muted small">{on ? 'You can take deliveries and dispatch can assign you.' : 'Turn on to receive deliveries.'}</div></div>
        <Button size="lg" variant={on ? 'secondary' : 'primary'} busy={toggle.busy} onClick={() => toggle.run()} aria-pressed={on}>{on ? 'Go offline' : 'Go online'}</Button>
      </Card>
      {toggle.error && <Notice tone="error">{toggle.error}</Notice>}
    </>
  );
}

function Dashboard({ me }: { me: Me }) {
  const { data, error, loading, reload } = useApi<any>('/driver/dashboard');
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, [reload]);
  return (
    <>
      <PageHeader title="Dashboard" />
      <AvailabilityCard initial={!!me.is_available} />
      {loading && !data && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && <>
        <div className="grid cols-4">
          <Stat label="Delivered today" value={String(data.today.delivered)} />
          <Stat label="Earned today" value={money(data.today.earned)} />
          <Stat label="Last 7 days" value={`${data.week.delivered} · ${money(data.week.earned)}`} />
          <Stat label="Not yet paid out" value={money(data.unpaid_cents)} />
          <Stat label="Rating" value={data.rating.avg ? `${data.rating.avg} ★ (${data.rating.n})` : data.rating.n ? 'Needs 3 ratings' : 'No ratings yet'} />
          <Stat label="Open deliveries" value={data.self_assign ? String(data.available_count) : 'Dispatch assigns'} />
        </div>
        <h2>Active deliveries</h2>
        {!data.active.length && <Empty title="Nothing in progress">{data.self_assign ? <>Browse <Link to="/driver/available">available deliveries</Link>, or wait for dispatch to assign you one.</> : 'New jobs appear here when dispatch assigns them.'}</Empty>}
        {data.active.map((j: Job) => <JobCard key={j.id} j={j} navApp={(me.nav_app ?? 'google') as NavApp} />)}
      </>}
    </>
  );
}

function Available() {
  const { data, error, loading, reload } = useApi<{ enabled: boolean; available: boolean; jobs: any[] }>('/driver/available');
  const nav = useNavigate(); const toast = useToast();
  useEffect(() => { const t = setInterval(reload, 20000); return () => clearInterval(t); }, [reload]);
  const accept = useAction(async (id: string) => { try { await post(`/driver/jobs/${id}/accept`); toast('Delivery accepted'); nav(`/driver/jobs/${id}`); } catch (e) { reload(); throw e; } });
  return (
    <>
      <PageHeader title="Available deliveries" />
      <Notice>Orders that are ready and not yet claimed. You see only the area of the drop-off until you accept. You can hold up to 3 deliveries at a time.</Notice>
      {accept.error && <Notice tone="error">{accept.error}</Notice>}
      {loading && !data && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && !data.enabled && <Empty title="Dispatch assigns deliveries">Self-service pickup is switched off right now. Deliveries are assigned to you by dispatch.</Empty>}
      {data && data.enabled && !data.available && <Empty title="You are offline">Go online from the dashboard to see open deliveries.</Empty>}
      {data?.enabled && data.available && !data.jobs.length && <Empty title="No open deliveries">New ones appear here as stores get orders ready. This page refreshes every 20 seconds.</Empty>}
      {data?.jobs.map((j) => (
        <Card key={j.id} className="job">
          <div className="row between wrap"><strong className="display">#{j.order_number}</strong><Badge tone="ok">{money(j.earning_cents + j.tip_cents)}{j.tip_cents > 0 ? ` incl. ${money(j.tip_cents)} tip` : ''}</Badge></div>
          <div className="stack">
            <div><span className="eyebrow">Pick up</span><div><strong>{j.store_name}</strong></div><div className="muted">{[j.pickup_address, j.pickup_city].filter(Boolean).join(', ')}</div></div>
            <div><span className="eyebrow">Drop off area</span><div>{j.dropoff_city} {j.dropoff_area}</div></div>
            {j.promised_at && <div className="muted small">Promised by {fmtDate(j.promised_at, { timeStyle: 'short' })}</div>}
            <Button size="lg" busy={accept.busy} onClick={() => accept.run(j.id)}>Accept delivery</Button>
          </div>
        </Card>
      ))}
    </>
  );
}

function Jobs({ me }: { me: Me }) {
  const { data, error, loading, reload } = useApi<Job[]>('/driver/jobs?scope=active');
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, [reload]);
  return (
    <>
      <PageHeader title="My deliveries" />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} retry={reload} />}
      {data && !data.length && <Empty title="No deliveries in progress">Accepted or assigned deliveries show here. This page refreshes every 30 seconds.</Empty>}
      {data?.map((j) => <JobCard key={j.id} j={j} navApp={(me.nav_app ?? 'google') as NavApp} />)}
    </>
  );
}

function JobCard({ j, navApp }: { j: Job; navApp: NavApp }) {
  const late = isLate(j);
  const toStore = j.status === 'assigned';
  return (
    <Card className={`job ${late ? 'late' : ''}`}>
      <div className="row between wrap"><strong className="display">#{j.order_number}</strong><div className="row">{late && <Badge tone="danger">Late</Badge>}<Badge tone={toStore ? 'warn' : 'info'}>{toStore ? 'Go to store' : 'Deliver now'}</Badge></div></div>
      <div className="stack">
        <div><span className="eyebrow">Pick up</span><div><strong>{j.pickup.store_name}</strong></div><div className="muted">{pickAddr(j.pickup)}</div></div>
        <div><span className="eyebrow">Drop off</span><div><strong>{j.dropoff.first_name}</strong> · {dropAddr(j.dropoff)}</div></div>
        <div className="row wrap small muted">{j.promised_at && <span>Promised by {fmtDate(j.promised_at, { timeStyle: 'short' })}</span>}<span>Earning {money(j.earning_cents)}{(j.tip_cents ?? 0) > 0 && ` + ${money(j.tip_cents!)} tip`}</span></div>
        {j.instructions && <Notice tone="warn"><strong>Instructions:</strong> {j.instructions}</Notice>}
        <div className="driver-actions">
          <a className="btn secondary" href={navUrl(navApp, toStore ? `${j.pickup.store_name} ${pickAddr(j.pickup)}` : dropAddr(j.dropoff))} target="_blank" rel="noreferrer">Navigate</a>
          {j.dropoff.phone && <a className="btn secondary" href={`tel:${j.dropoff.phone}`}>Call customer</a>}
        </div>
        <Link className="btn primary lg" to={`/driver/jobs/${j.id}`}>{toStore ? 'Open job' : 'Continue delivery'}</Link>
      </div>
    </Card>
  );
}

/** While a delivery is active and the driver opted in, send the device position about every 15 seconds. */
function useShareLocation(jobId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<'off' | 'waiting' | 'sharing' | 'denied'>('off');
  useEffect(() => {
    if (!enabled || !jobId || !('geolocation' in navigator)) { setState('off'); return; }
    setState('waiting');
    let last = 0;
    const id = navigator.geolocation.watchPosition((p) => {
      setState('sharing');
      if (Date.now() - last < 15000) return;
      last = Date.now();
      post(`/driver/jobs/${jobId}/location`, { lat: p.coords.latitude, lng: p.coords.longitude, accuracy_m: Math.round(p.coords.accuracy) }).catch(() => {});
    }, (err) => setState(err.code === 1 ? 'denied' : 'waiting'), { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [jobId, enabled]);
  return state;
}

function MapPanel({ to, from, label, navApp }: { to: string; from?: string; label: string; navApp: NavApp }) {
  const [show, setShow] = useState(false);
  return (
    <div className="map-panel">
      <div className="driver-actions">
        <a className="btn primary" href={navUrl(navApp, to)} target="_blank" rel="noreferrer">Start navigation ({navApp === 'apple' ? 'Apple Maps' : navApp === 'waze' ? 'Waze' : 'Google Maps'})</a>
        <Button variant="secondary" onClick={() => setShow((v) => !v)} aria-expanded={show}>{show ? 'Hide map' : 'Show map'}</Button>
      </div>
      {show && <iframe className="map-frame" title={`Map to ${label}`} loading="lazy" referrerPolicy="no-referrer" src={embedUrl(to, from)} />}
    </div>
  );
}

function JobDetail({ me }: { me: Me }) {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<Job[]>('/driver/jobs?scope=active');
  const [modal, setModal] = useState<null | 'bypass' | 'issue' | 'fail' | 'release'>(null);
  const [code, setCode] = useState('');
  const j = data?.find((x) => x.id === id);
  const navApp = (me.nav_app ?? 'google') as NavApp;
  const sharing = useShareLocation(j?.id, !!me.share_location && !!j);

  const pickup = useAction(async () => { await post(`/driver/jobs/${id}/pickup`); toast('Marked as picked up'); reload(); });
  const deliver = useAction(async (body: { code?: string; bypass_reason?: string }) => {
    try { await post(`/driver/jobs/${id}/deliver`, body); toast('Delivered. Thank you!'); nav('/driver'); }
    catch (e: any) { throw new Error(e.code === 'wrong_code' ? 'That code does not match. Ask the customer to open their order page and read it again.' : e.message); }
  });
  const issue = useAction(async (note: string) => { await post(`/driver/jobs/${id}/issue`, { note }); toast('Dispatch has been told'); setModal(null); });
  const fail = useAction(async (reason: string) => { await post(`/driver/jobs/${id}/fail`, { reason }); toast('Marked as not delivered'); nav('/driver'); });
  const release = useAction(async () => { await post(`/driver/jobs/${id}/release`); toast('Handed back'); nav('/driver'); });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!j) return <><Notice>This job is no longer active.</Notice><Link className="btn primary" to="/driver">Back to dashboard</Link></>;
  const step1 = j.status === 'assigned';
  const pick = `${j.pickup.store_name} ${pickAddr(j.pickup)}`;
  return (
    <>
      <PageHeader title={`Order #${j.order_number}`} actions={<Link to="/driver/jobs" className="btn ghost">← My deliveries</Link>} />
      <div className="steps" aria-label="Progress"><span className={step1 ? 'on' : 'done'}>1 · Pick up</span><span className={step1 ? '' : 'on'}>2 · Deliver</span></div>
      {isLate(j) && <Notice tone="error">This delivery is past its promised time.</Notice>}
      {me.share_location && <Notice tone={sharing === 'denied' ? 'warn' : 'info'}>{sharing === 'sharing' ? 'Sharing your live location with the customer for this delivery.' : sharing === 'denied' ? 'Location is blocked in your browser, so the customer cannot see your progress. You can still deliver.' : 'Waiting for your phone’s location…'}</Notice>}
      {step1 ? (
        <Card className="job">
          <span className="eyebrow">Step 1 · Go to the store</span>
          <h2 className="display">{j.pickup.store_name}</h2>
          <p>{pickAddr(j.pickup)}</p>
          <MapPanel to={pick} label={j.pickup.store_name} navApp={navApp} />
          <div className="driver-actions">{j.pickup.phone && <a className="btn secondary" href={`tel:${j.pickup.phone}`}>Call store</a>}</div>
          {pickup.error && <Notice tone="error">{pickup.error}</Notice>}
          <div className="big-actions"><Button busy={pickup.busy} onClick={() => pickup.run()}>I’ve picked up the order</Button></div>
          <button className="link" onClick={() => setModal('release')}>Hand this delivery back</button>
        </Card>
      ) : (
        <Card className="job">
          <span className="eyebrow">Step 2 · Deliver to</span>
          <h2 className="display">{j.dropoff.first_name}</h2>
          <p>{dropAddr(j.dropoff)}</p>
          {j.instructions && <Notice tone="warn"><strong>Instructions:</strong> {j.instructions}</Notice>}
          <MapPanel to={dropAddr(j.dropoff)} from={pick} label="the customer" navApp={navApp} />
          <div className="driver-actions">{j.dropoff.phone && <a className="btn secondary" href={`tel:${j.dropoff.phone}`}>Call customer</a>}</div>
          <form onSubmit={(e) => { e.preventDefault(); deliver.run({ code }); }}>
            <Field label="4-digit code from the customer" hint="The customer sees it on their order page. Ask them to read it to you.">
              <Input className="code-input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoComplete="off" placeholder="0000" />
            </Field>
            {deliver.error && <Notice tone="error">{deliver.error}</Notice>}
            <div className="big-actions"><Button type="submit" busy={deliver.busy} disabled={code.length !== 4}>Confirm delivery</Button></div>
          </form>
          <button className="link" onClick={() => setModal('bypass')}>Customer can’t give the code</button>
        </Card>
      )}
      <div className="driver-actions">
        <Button variant="secondary" onClick={() => setModal('issue')}>Report a problem</Button>
        <Button variant="danger" onClick={() => setModal('fail')}>I couldn’t deliver</Button>
      </div>

      <Modal open={modal === 'release'} onClose={() => setModal(null)} title="Hand this delivery back">
        <p>Another driver or dispatch can take it. Do this only before you have picked up the order.</p>
        {release.error && <Notice tone="error">{release.error}</Notice>}
        <div className="big-actions"><Button variant="danger" busy={release.busy} onClick={() => release.run()}>Yes, hand it back</Button></div>
      </Modal>
      <Modal open={modal === 'bypass'} onClose={() => setModal(null)} title="Deliver without the code">
        <Notice tone="warn">This is flagged for EAZyfoods to review. Only use it if the customer truly cannot give the code.</Notice>
        <ReasonForm label="Why can’t you use the code?" min={5} busy={deliver.busy} error={deliver.error} cta="Confirm delivery without code" onSubmit={(r) => deliver.run({ bypass_reason: r })} />
      </Modal>
      <Modal open={modal === 'issue'} onClose={() => setModal(null)} title="Report a problem">
        <ReasonForm label="What happened?" min={3} busy={issue.busy} error={issue.error} cta="Send to dispatch" onSubmit={(r) => issue.run(r)} />
      </Modal>
      <Modal open={modal === 'fail'} onClose={() => setModal(null)} title="I couldn’t deliver">
        <Notice tone="warn">The delivery will be marked as failed and dispatch will decide what happens next. Do this only after you have tried to reach the customer.</Notice>
        <ReasonForm label="Reason" min={3} busy={fail.busy} error={fail.error} cta="Yes, mark as not delivered" danger onSubmit={(r) => fail.run(r)} />
      </Modal>
    </>
  );
}

function Apply({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const { run, busy, error } = useAction(async (f: Record<string, string>) => { await post('/driver/apply', { phone: f.phone, vehicle: f.vehicle || undefined }); toast('Application sent'); onDone(); });
  return (
    <>
      <PageHeader title="Drive with EAZyfoods" />
      <Notice>Before you can take deliveries, EAZyfoods must verify your driver’s licence and complete a background check. We do not promise any amount of work or earnings. Applying does not guarantee approval.</Notice>
      <Card>
        <form onSubmit={(e) => run(formValues(e))}>
          <Field label="Mobile phone"><Input name="phone" type="tel" required minLength={7} autoComplete="tel" /></Field>
          <Field label="Vehicle (optional)" hint="For example: car, bike, van."><Input name="vehicle" maxLength={80} /></Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button size="lg" busy={busy} type="submit">Send application</Button>
        </form>
      </Card>
    </>
  );
}

function Status({ status }: { status: string }) {
  const text: Record<string, string> = {
    applied: 'Your application is under review. We will verify your licence and background check, then approve your account. You cannot see deliveries until you are approved.',
    suspended: 'Your driver account is suspended. Please contact EAZyfoods support.', rejected: 'Your application was not approved.',
  };
  return <><PageHeader title={status === 'applied' ? 'Under review' : 'Account not active'} /><Notice tone={status === 'applied' ? 'info' : 'warn'}>{text[status] ?? 'Your account is not active.'}</Notice></>;
}

function ReasonForm({ label, min, busy, error, cta, onSubmit, danger }: { label: string; min: number; busy: boolean; error?: string; cta: string; onSubmit: (r: string) => void; danger?: boolean }) {
  const [v, setV] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(v.trim()); }}>
      <Field label={label}><Textarea value={v} onChange={(e) => setV(e.target.value)} maxLength={300} required /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="big-actions"><Button type="submit" variant={danger ? 'danger' : 'primary'} busy={busy} disabled={v.trim().length < min}>{cta}</Button></div>
    </form>
  );
}

function History() {
  const { data, error, loading, reload } = useApi<Job[]>('/driver/jobs?scope=history');
  return (
    <>
      <PageHeader title="History" />
      {loading && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && <DataTable rows={data} rowKey={(j) => j.id} empty="No finished deliveries yet." columns={[
        { key: 'o', header: 'Order', render: (j) => `#${j.order_number}` },
        { key: 's', header: 'Result', render: (j) => <Badge tone={j.status === 'delivered' ? 'ok' : 'danger'}>{j.status === 'delivered' ? 'Delivered' : 'Not delivered'}</Badge> },
        { key: 'st', header: 'Store', render: (j) => j.pickup.store_name },
        { key: 'a', header: 'Drop-off', render: (j) => dropAddr(j.dropoff) },
        { key: 'd', header: 'When', render: (j) => fmtDate(j.delivered_at ?? j.assigned_at) },
        { key: 'e', header: 'Earning', render: (j) => (j.status === 'delivered' ? money(j.earning_cents) : '—') },
      ]} />}
    </>
  );
}

function Earnings() {
  const { data, error, loading, reload } = useApi<{ earnings: { amount_cents: number; tip_cents: number; created_at: string; order_number: string; paid_out: boolean; payout_status: string | null }[]; unpaid_cents: number; paid_cents: number }>('/driver/earnings');
  return (
    <>
      <PageHeader title="Earnings" />
      <Notice>Earnings are recorded when you complete a delivery. EAZyfoods pays them out after review; we do not guarantee when a payout will be made.</Notice>
      {loading && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && <>
        <div className="grid cols-2"><Stat label="Not yet paid out" value={money(data.unpaid_cents)} /><Stat label="Paid out" value={money(data.paid_cents)} /></div>
        <h2>Deliveries</h2>
        <DataTable rows={data.earnings} rowKey={(e) => e.order_number + e.created_at} empty="No earnings yet." columns={[
          { key: 'o', header: 'Order', render: (e) => `#${e.order_number}` }, { key: 'd', header: 'Date', render: (e) => fmtDate(e.created_at) },
          { key: 'a', header: 'Amount', render: (e) => <>{money(e.amount_cents)}{e.tip_cents > 0 && <span className="muted small"> (incl. {money(e.tip_cents)} tip)</span>}</> },
          { key: 'p', header: 'Payout', render: (e) => (e.paid_out ? <Badge tone={e.payout_status === 'paid' ? 'ok' : 'warn'}>{e.payout_status === 'paid' ? 'Paid' : 'Pending'}</Badge> : <Badge>Not yet</Badge>) },
        ]} />
      </>}
    </>
  );
}

function Performance() {
  const { data, error, loading, reload } = useApi<any>('/driver/performance');
  return (
    <>
      <PageHeader title="Performance" />
      {loading && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && <>
        <p className="muted">Your last {data.days} days.</p>
        <div className="grid cols-4">
          <Stat label="Delivered" value={String(data.delivered)} />
          <Stat label="Not delivered" value={String(data.failed)} />
          <Stat label="On time" value={data.on_time_pct == null ? '—' : `${data.on_time_pct}%`} />
          <Stat label="Avg. trip (pickup → door)" value={data.avg_minutes == null ? '—' : `${data.avg_minutes} min`} />
        </div>
        {data.bypassed > 0 && <Notice tone="warn">{data.bypassed} {data.bypassed === 1 ? 'delivery was' : 'deliveries were'} completed without the customer’s code. Please use the code whenever you can.</Notice>}
      </>}
    </>
  );
}

function Ratings() {
  const { data, error, loading, reload } = useApi<{ count: number; average: number | null; ratings: { rating: number; comment: string | null; created_at: string; first_name: string }[] }>('/driver/ratings');
  return (
    <>
      <PageHeader title="Ratings & reviews" />
      {loading && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && <>
        <div className="grid cols-2"><Stat label="Average rating" value={data.average ? `${data.average} ★` : 'Needs 3 ratings'} /><Stat label="Ratings received" value={String(data.count)} /></div>
        {!data.count && <Empty title="No ratings yet">Customers can rate you after a delivery.</Empty>}
        {data.ratings.map((r, i) => (
          <Card key={i}><div className="row between"><strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong><span className="muted small">{fmtDate(r.created_at)} · {r.first_name}</span></div>{r.comment && <p>{r.comment}</p>}</Card>
        ))}
      </>}
    </>
  );
}

function Support() {
  const { data, error, loading, reload } = useApi<{ id: string; subject: string; status: string; created_at: string; last_message: string }[]>('/driver/support');
  const toast = useToast();
  const send = useAction(async (f: Record<string, string>) => { await post('/driver/support', { subject: f.subject, message: f.message }); toast('Sent to the EAZyfoods team'); reload(); });
  return (
    <>
      <PageHeader title="Support" />
      <Card>
        <form onSubmit={async (e) => { const f = formValues(e); const form = e.currentTarget; if (await send.run(f) !== undefined) form.reset(); }}>
          <Field label="Subject"><Input name="subject" required minLength={3} maxLength={120} /></Field>
          <Field label="How can we help?"><Textarea name="message" required minLength={10} maxLength={2000} /></Field>
          {send.error && <Notice tone="error">{send.error}</Notice>}
          <Button type="submit" busy={send.busy}>Send</Button>
        </form>
      </Card>
      <h2>Your requests</h2>
      {loading && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && <DataTable rows={data} rowKey={(t) => t.id} empty="No requests yet." columns={[
        { key: 's', header: 'Subject', render: (t) => t.subject }, { key: 'st', header: 'Status', render: (t) => <Badge>{t.status}</Badge> }, { key: 'd', header: 'Sent', render: (t) => fmtDate(t.created_at) },
      ]} />}
    </>
  );
}

function Profile({ me, reload }: { me: Me; reload: () => void }) {
  const toast = useToast();
  const [nav, setNav] = useState<NavApp>((me.nav_app ?? 'google') as NavApp);
  const [share, setShare] = useState(!!me.share_location);
  const save = useAction(async (f: Record<string, string>) => { await put('/driver/profile', { phone: f.phone, vehicle: f.vehicle || null, nav_app: nav, share_location: share }); toast('Saved'); reload(); });
  return (
    <>
      <PageHeader title="Profile & settings" />
      <Card>
        <form onSubmit={(e) => save.run(formValues(e))}>
          <Field label="Mobile phone"><Input name="phone" type="tel" required minLength={7} defaultValue={me.phone ?? ''} autoComplete="tel" /></Field>
          <Field label="Vehicle"><Input name="vehicle" maxLength={80} defaultValue={me.vehicle ?? ''} /></Field>
          <Field label="Navigation app" hint="Your Navigate buttons open this app.">
            <select className="input" value={nav} onChange={(e) => setNav(e.target.value as NavApp)}><option value="google">Google Maps</option><option value="apple">Apple Maps</option><option value="waze">Waze</option></select>
          </Field>
          <Switch checked={share} onChange={setShare} label="Share my live location" hint="With the customer, only while I’m delivering their order." />
          <p className="muted small">Optional. Only the latest point is kept, only while a delivery is active, and it is deleted when the delivery ends. Your browser will ask for permission.</p>
          <p className="muted small">Licence verified: {me.licence_verified ? 'yes' : 'pending'} · Background check: {me.background_check_verified ? 'yes' : 'pending'}</p>
          {save.error && <Notice tone="error">{save.error}</Notice>}
          <Button type="submit" busy={save.busy}>Save</Button>
        </form>
      </Card>
    </>
  );
}

function Docs() {
  return (
    <>
      <PageHeader title="Documentation" />
      <Card><h2>Doing a delivery</h2><ol>
        <li>Go online, then take an open delivery or wait for dispatch to assign one (up to 3 at a time).</li>
        <li>Tap <strong>Start navigation</strong> to open turn-by-turn directions in your chosen app, or <strong>Show map</strong> for a quick look.</li>
        <li>At the store, check the order and tap <em>I’ve picked up the order</em>.</li>
        <li>At the door, ask the customer for their 4-digit code and enter it to complete the delivery.</li>
        <li>If something goes wrong, use <em>Report a problem</em> or <em>I couldn’t deliver</em>.</li></ol></Card>
      <Card><h2>Earnings & tips</h2><p>Your delivery fee and the customer’s tip are recorded when you deliver. EAZyfoods pays out after review; we do not guarantee when. Tips are never reduced.</p></Card>
      <Card><h2>Your privacy</h2><p>You see only the customer’s first name, address and phone for deliveries you hold. Live location is optional and only shared during an active delivery.</p></Card>
    </>
  );
}
