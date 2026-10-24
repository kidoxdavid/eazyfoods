import { useSearchParams } from 'react-router-dom';
import { fmtDate, money, post } from '../../api';
import { useAuth } from '../../auth';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, DataTable, ErrorBox, Loading, Notice, PageHeader, Stat, StatusBadge } from '../../ui';

type D = {
  account: { connected: boolean; status: 'none' | 'pending' | 'enabled' | 'restricted'; requirements: string[]; can_connect: boolean; provider: string };
  balance: { owed_cents: number; payable_now_cents: number; in_hold_cents: number; in_progress_cents: number; next_eligible_at: string | null; hold_days: number };
  history: { id: string; amount_cents: number; status: string; trigger: string; note: string | null; created_at: string; paid_at: string | null }[];
};
const LABEL = { none: ['Not connected', 'warn'], pending: ['Setup not finished', 'warn'], restricted: ['More details needed', 'danger'], enabled: ['Connected', 'ok'] } as const;
const REQ: Record<string, string> = { external_account: 'bank account', 'individual.verification.document': 'identity document', 'business_profile.url': 'website or social page', tos_acceptance: 'terms acceptance' };

export default function Payouts() {
  const { has } = useAuth(); const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const d = useApi<D>('/vendor/payouts');
  const owner = has('vendor_owner');
  const mock = sp.get('mock_connect');
  const connect = useAction(async () => { const r = await post<{ url: string }>('/vendor/payout-account/start'); window.location.href = r.url; });
  const finishMock = useAction(async () => { await post(`/dev/connect/${mock}/complete`); await post('/vendor/payout-account/refresh'); setSp({}); toast('Test payout account connected.'); d.reload(); });
  const refresh = useAction(async () => { await post('/vendor/payout-account/refresh'); d.reload(); });
  if (d.loading && !d.data) return <Loading />;
  if (d.error) return <ErrorBox message={d.error} retry={d.reload} />;
  if (!d.data) return null;
  const { account: a, balance: b, history } = d.data;
  const [label, tone] = LABEL[a.status];
  return (
    <>
      <PageHeader title="Payouts" sub="How and when you get paid." />
      {a.provider === 'mock' && <div className="test-only" role="note">TEST MODE. Payouts here are simulated: no real money moves.</div>}
      {mock && <Notice tone="warn"><strong>Test onboarding.</strong> You are on the simulated onboarding page. <Button size="sm" busy={finishMock.busy} onClick={() => finishMock.run()}>Finish test onboarding</Button></Notice>}
      {(connect.error || finishMock.error || refresh.error) && <Notice tone="error">{connect.error || finishMock.error || refresh.error}</Notice>}
      <Card>
        <div className="row between wrap"><h2 style={{ margin: 0 }}>Payout account</h2><Badge tone={tone}>{label}</Badge></div>
        {a.status === 'enabled' && <p>Your account is connected. We send money here after each delivered order has passed the hold period.</p>}
        {a.status === 'none' && <p>Connect a payout account to be paid automatically. Setup is done on our payment provider’s secure page: we never see or store your bank details or ID.</p>}
        {a.status === 'pending' && <p>You started setup but have not finished. Pick up where you left off.</p>}
        {a.status === 'restricted' && <p>The payment provider needs more from you before it can send money{a.requirements.length ? `: ${a.requirements.map((r) => REQ[r] ?? r.replace(/[._]/g, ' ')).join(', ')}` : ''}.</p>}
        {!a.can_connect && <Notice>Online payout setup is not switched on. Finance pays you by bank transfer; contact us to arrange it.</Notice>}
        {owner ? (a.can_connect && a.status !== 'enabled' && <Button busy={connect.busy} onClick={() => connect.run()}>{a.status === 'none' ? 'Connect payout account' : 'Continue setup'}</Button>)
          : <p className="muted small">Only the store owner can change the payout account.</p>}
        {a.connected && a.status !== 'enabled' && <Button variant="ghost" size="sm" busy={refresh.busy} onClick={() => refresh.run()}>Check status</Button>}
        {a.status === 'enabled' && owner && <Button variant="secondary" size="sm" busy={connect.busy} onClick={() => connect.run()}>Update account details</Button>}
      </Card>
      <div className="grid cols-4">
        <Stat label="Payable now" value={money(b.payable_now_cents)} sub="Delivered and past the hold" />
        <Stat label="In the hold period" value={money(b.in_hold_cents)} sub={b.next_eligible_at ? `Next becomes payable ${fmtDate(b.next_eligible_at)}` : `Held ${b.hold_days} day${b.hold_days === 1 ? '' : 's'} after delivery`} />
        <Stat label="Orders in progress" value={money(b.in_progress_cents)} sub="Counts once delivered" />
        <Stat label="Owed in total" value={money(b.owed_cents)} sub="Earnings not yet paid out" />
      </div>
      <Notice>Amounts are what you earn after commission and refunds charged to you. You are paid {b.hold_days} day{b.hold_days === 1 ? '' : 's'} after delivery. Payouts are bundled by finance or sent automatically when that is switched on.</Notice>
      <Card>
        <h2>Payout history</h2>
        <DataTable rows={history} rowKey={(r) => r.id} empty="No payouts yet." columns={[
          { key: 'd', header: 'Created', render: (r) => fmtDate(r.created_at) }, { key: 'a', header: 'Amount', render: (r) => <strong>{money(r.amount_cents)}</strong> },
          { key: 's', header: 'Status', render: (r) => <><StatusBadge status={r.status} />{r.status === 'failed' && <div className="small muted">We will try again. {r.note ?? ''}</div>}</> },
          { key: 'p', header: 'Paid', render: (r) => (r.paid_at ? fmtDate(r.paid_at) : '—') }, { key: 't', header: 'How', render: (r) => (r.trigger === 'auto' ? 'Automatic' : 'By finance') }]} />
      </Card>
    </>
  );
}
