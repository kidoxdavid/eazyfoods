import { useEffect, useState } from 'react';
import { put } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Button, Card, ErrorBox, Field, Input, Loading, Notice, PageHeader, Textarea } from './kit';

export default function Settings() {
  const toast = useToast();
  const d = useApi<{ sender_name: string; postal_address: string; max_send_per_campaign: number }>('/marketing/settings');
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (d.data) setF(d.data); }, [d.data]);
  const save = useAction(async () => { await put('/marketing/settings', { ...f, max_send_per_campaign: Number(f.max_send_per_campaign) }); toast('Saved'); d.reload(); });
  if (d.loading && !f) return <Loading />;
  if (d.error) return <ErrorBox message={d.error} retry={d.reload} />;
  if (!f) return null;
  return (
    <>
      <PageHeader title="Marketing settings" sub="Who emails say they are from, and the limits." />
      {save.error && <Notice tone="error">{save.error}</Notice>}
      <Card>
        <Field label="Sender name"><Input value={f.sender_name} onChange={(e) => setF({ ...f, sender_name: e.target.value })} maxLength={80} /></Field>
        <Field label="Postal address (shown in every marketing email)" hint="Canadian anti-spam law (CASL) requires a mailing address that works for at least 60 days."><Textarea value={f.postal_address} onChange={(e) => setF({ ...f, postal_address: e.target.value })} maxLength={300} style={{ minHeight: 60 }} /></Field>
        <Field label="Most people one campaign may go to" hint="A safety limit against sending to the wrong audience."><Input type="number" min={1} value={f.max_send_per_campaign} onChange={(e) => setF({ ...f, max_send_per_campaign: e.target.value })} /></Field>
        <Button busy={save.busy} onClick={() => save.run()}>Save</Button>
      </Card>
      <Notice tone="warn"><strong>How consent works here.</strong> Customers opt in to marketing email from their account page, and each change is logged with the date and source. Every marketing email has your name, address and a one-click unsubscribe link; unsubscribing takes effect immediately and cancels anything queued. Consent is checked again the moment an email is sent. This is a technical safeguard, not legal advice: have a professional check your CASL obligations (including proof of consent for any list you import, which this system does not support) before sending to real customers.</Notice>
    </>
  );
}
