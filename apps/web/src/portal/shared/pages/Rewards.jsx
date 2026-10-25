import { useEffect, useState } from 'react'
import { useApi, useAction, toast } from '../hooks'
import { post, put, money, fmtDate } from '../client'
import { Alert, Button, Card, DataTable, Field, Input, PageHeader, Spinner } from '../ui'

/** Rewards, referrals, gift codes and goodwill credit. All of it is money the company gives away, so every programme starts OFF. */
export default function Rewards() {
  const d = useApi('/marketing/rewards'); const codes = useApi('/marketing/gift-codes')
  const [f, setF] = useState(null); const [fresh, setFresh] = useState([])
  useEffect(() => { if (d.data) setF({ cashback: String(d.data.cashback_bps / 100), reward: String(d.data.referral_reward_cents / 100), min: String(d.data.referral_min_order_cents / 100), max: String(d.data.referral_max_per_user) }) }, [d.data])
  const save = useAction(async () => { await put('/marketing/rewards', { cashback_bps: Math.round(Number(f.cashback) * 100), referral_reward_cents: Math.round(Number(f.reward) * 100), referral_min_order_cents: Math.round(Number(f.min) * 100), referral_max_per_user: Number(f.max) }); toast('Saved'); d.reload() })
  const make = useAction(async (e) => {
    e.preventDefault(); const v = new FormData(e.currentTarget)
    const r = await post('/marketing/gift-codes', { amount_cents: Math.round(Number(v.get('amount')) * 100), count: Number(v.get('count') || 1), note: String(v.get('note') || '') || undefined })
    setFresh(r.codes); codes.reload()
  })
  const grant = useAction(async (e) => {
    e.preventDefault(); const form = e.currentTarget; const v = new FormData(form)
    await post('/marketing/credit/grant', { email: String(v.get('email')), amount_cents: Math.round(Number(v.get('amount')) * 100), note: String(v.get('note')) }); toast('Credit added.'); form.reset()
  })
  if (d.loading && !f) return <Spinner />
  if (d.error) return <Alert>{d.error}</Alert>
  if (!f || !d.data) return null
  return (
    <>
      <PageHeader title="Rewards & Credit" sub="Cashback, invite rewards, gift codes and goodwill credit. Everything is off until you turn it on." />
      <Alert tone="info">Store credit is a promise to customers: <strong>{money(d.data.liability_cents)}</strong> is owed right now, and <strong>{money(d.data.given_30d_cents)}</strong> was given in the last 30 days. Ask your accountant how to treat gift codes and rewards (including any expiry rules) before launching widely.</Alert>
      <Card title="Programmes">
        <Alert>{save.error}</Alert>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 max-w-3xl">
          <Field label="Cashback on delivered orders (%)" htmlFor="r1" hint="0 turns it off. Paid as store credit after delivery, on what was actually delivered after refunds."><Input id="r1" type="number" min="0" max="10" step="0.1" value={f.cashback} onChange={(e) => setF({ ...f, cashback: e.target.value })} /></Field>
          <Field label="Invite reward, each (CA$)" htmlFor="r2" hint="0 turns invites off. Inviter and friend both get this after the friend's first completed order and verified email."><Input id="r2" type="number" min="0" max="50" step="0.5" value={f.reward} onChange={(e) => setF({ ...f, reward: e.target.value })} /></Field>
          <Field label="Friend's first order must be at least (CA$)" htmlFor="r3"><Input id="r3" type="number" min="0" step="1" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></Field>
          <Field label="Most rewarded invites per person" htmlFor="r4"><Input id="r4" type="number" min="0" max="100" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></Field>
        </div>
        <div className="mt-4"><Button busy={save.busy} onClick={() => save.run()}>Save</Button></div>
      </Card>
      <Card title="Make gift codes">
        <form onSubmit={make.run} className="space-y-3 max-w-xl">
          <Alert>{make.error}</Alert>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Value each (CA$)" htmlFor="g1"><Input id="g1" name="amount" type="number" min="1" max="500" step="1" required /></Field>
            <Field label="How many (1 to 50)" htmlFor="g2"><Input id="g2" name="count" type="number" min="1" max="50" defaultValue="1" /></Field>
            <Field label="Note (for you)" htmlFor="g3"><Input id="g3" name="note" maxLength={200} /></Field>
          </div>
          <Button type="submit" busy={make.busy}>Create</Button>
        </form>
        {fresh.length > 0 && <div className="mt-3"><Alert tone="ok"><strong>New codes (copy them now):</strong><pre className="mt-1 whitespace-pre-wrap">{fresh.join('\n')}</pre></Alert></div>}
        {codes.data && <div className="mt-4"><DataTable rows={codes.data} rowKey={(r) => r.code} empty="No gift codes yet." columns={[{ key: 'code', header: 'Code' }, { key: 'v', header: 'Value', render: (r) => money(r.amount_cents) }, { key: 'note', header: 'Note', render: (r) => r.note ?? '' }, { key: 's', header: 'Status', render: (r) => (r.redeemed_at ? `Used ${fmtDate(r.redeemed_at)} by ${r.redeemed_by_email}` : 'Unused') }]} /></div>}
      </Card>
      <Card title="Goodwill credit for one customer">
        <form onSubmit={grant.run} className="space-y-3 max-w-xl">
          <Alert>{grant.error}</Alert>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Customer email" htmlFor="c1"><Input id="c1" name="email" type="email" required /></Field>
            <Field label="Amount (CA$)" htmlFor="c2"><Input id="c2" name="amount" type="number" min="1" max="200" step="1" required /></Field>
            <Field label="Reason (recorded)" htmlFor="c3"><Input id="c3" name="note" required minLength={3} maxLength={200} /></Field>
          </div>
          <Button type="submit" busy={grant.busy}>Add credit</Button>
        </form>
      </Card>
    </>
  )
}
