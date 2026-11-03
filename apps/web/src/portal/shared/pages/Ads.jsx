import { useState } from 'react'
import { useAction } from '../hooks'
import { patch, fmtDate } from '../client'
import { toast } from '../hooks'
import { Alert, Badge, Button, DataTable, Field, Modal, PageHeader, StatusBadge, Textarea } from '../ui'
import { Fetch, Need, cents } from '../../admin/common'

/** Advertising review: used by both the admin and marketing portals (anyone with the ads.manage permission). */
export default function Ads() {
  const [rejecting, setRejecting] = useState(null)
  const [note, setNote] = useState('')
  const act = useAction(async (id, status, n, reload) => { await patch(`/admin/ads/${id}`, { status, note: n }); toast(`Campaign ${status}`); reload() })
  return (
    <Need perm={['ads.manage']} what="managing advertising">
      <PageHeader title="Advertising" sub="Review creative before it goes live. Impressions, clicks and spend are counted by EAZyfoods. We make no claim about effect on sales." />
      <Alert>{act.error}</Alert>
      <Fetch path="/admin/ads">{(rows, reload) => (
        <>
          <DataTable rows={rows} empty="No campaigns yet." columns={[
            { key: 't', header: 'Campaign', nowrap: false, render: (r) => <div><strong>{r.title}</strong><div className="text-xs text-gray-500">{r.vendor_name}{r.product_name ? ` · ${r.product_name}` : ''}</div>{r.body && <div className="text-xs">{r.body}</div>}{r.image_url && <img src={r.image_url} alt="" className="w-24 rounded mt-1" />}{r.video_url && <video src={r.video_url} controls muted playsInline preload="metadata" className="w-40 rounded mt-1" aria-label={`Video for ${r.title}`} />}</div> },
            { key: 'p', header: 'Placement', render: (r) => <Badge tone="blue">{r.placement.replace(/_/g, ' ')}</Badge> },
            { key: 'd', header: 'Dates', render: (r) => `${fmtDate(r.starts_at)} to ${fmtDate(r.ends_at)}` },
            { key: 'b', header: 'Budget', render: (r) => <div>{cents(r.budget_cents)}<div className="text-xs text-gray-500">{cents(r.cpc_cents)} per click</div></div> },
            { key: 'm', header: 'Measured', render: (r) => <span className="text-xs">{r.impressions} impressions · {r.clicks} clicks · {cents(r.spent_cents)} spent</span> },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'a', header: '', render: (r) => (
              <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {r.status !== 'approved' && r.status !== 'expired' && <Button size="sm" onClick={() => act.run(r.id, 'approved', undefined, reload)}>Approve</Button>}
                {r.status === 'approved' && <Button size="sm" variant="secondary" onClick={() => act.run(r.id, 'paused', undefined, reload)}>Pause</Button>}
                {r.status !== 'rejected' && r.status !== 'expired' && <Button size="sm" variant="danger" onClick={() => { setRejecting(r.id); setNote('') }}>Reject</Button>}
              </div>) },
          ]} />
          {rejecting && (
            <Modal title="Reject campaign" onClose={() => setRejecting(null)}>
              <Field label="Tell the vendor why (required)" htmlFor="rej"><Textarea id="rej" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="flex justify-end gap-2 mt-3"><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
                <Button variant="danger" disabled={note.length < 3} onClick={async () => { await act.run(rejecting, 'rejected', note, reload); setRejecting(null) }}>Reject</Button></div>
            </Modal>
          )}
        </>
      )}</Fetch>
    </Need>
  )
}
