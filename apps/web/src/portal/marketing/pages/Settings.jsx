import { useEffect, useState } from 'react'
import { useApi, useAction, toast } from '../../shared/hooks'
import { put } from '../../shared/client'
import { Alert, Button, Card, Field, Input, PageHeader, Spinner, Textarea } from '../../shared/ui'

export default function Settings() {
  const d = useApi('/marketing/settings')
  const [f, setF] = useState(null)
  useEffect(() => { if (d.data) setF(d.data) }, [d.data])
  const save = useAction(async () => { await put('/marketing/settings', { ...f, max_send_per_campaign: Number(f.max_send_per_campaign) }); toast('Saved'); d.reload() })
  if (d.loading && !f) return <Spinner />
  if (d.error) return <Alert>{d.error}</Alert>
  if (!f) return null
  return (
    <>
      <PageHeader title="Settings" sub="Who emails say they are from, and the limits." />
      <Alert>{save.error}</Alert>
      <Card>
        <div className="space-y-4 max-w-2xl">
          <Field label="Sender name" htmlFor="sn"><Input id="sn" value={f.sender_name} onChange={(e) => setF({ ...f, sender_name: e.target.value })} maxLength={80} /></Field>
          <Field label="Postal address (shown in every marketing email)" htmlFor="pa" hint="Canadian anti-spam law (CASL) requires a mailing address that works for at least 60 days."><Textarea id="pa" rows={3} value={f.postal_address} onChange={(e) => setF({ ...f, postal_address: e.target.value })} maxLength={300} /></Field>
          <Field label="Most people one campaign may go to" htmlFor="mx" hint="A safety limit against sending to the wrong audience."><Input id="mx" type="number" min={1} value={f.max_send_per_campaign} onChange={(e) => setF({ ...f, max_send_per_campaign: e.target.value })} /></Field>
          <Button busy={save.busy} onClick={() => save.run()}>Save</Button>
        </div>
      </Card>
      <Alert tone="warn"><strong>How consent works here.</strong> Customers opt in to marketing email from their account page, and each change is logged with the date and source. Every marketing email has your name, address and a one-click unsubscribe link; unsubscribing takes effect immediately and cancels anything queued. Consent is checked again the moment an email is sent. This is a technical safeguard, not legal advice: have a professional check your CASL obligations (including proof of consent for any list you import, which this system does not support) before sending to real customers.</Alert>
    </>
  )
}
