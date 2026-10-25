import { useState } from 'react'
import { useUser } from '../shared/StaffShell'
import { useApi } from '../shared/hooks'
import { del } from '../shared/client'
import { Alert, Button, Field, Input, Modal, Spinner } from '../shared/ui'
import { canDo } from './perms'

export const useCan = () => { const u = useUser(); return (...need) => canDo(u?.roles ?? [], ...need) }

export const NoAccess = ({ what }) => <Alert tone="warn">Your role does not allow {what ?? 'this'}. Ask an admin if you need access.</Alert>

/** Renders children only when the role has one of the permissions. */
export function Need({ perm, what, children }) {
  const can = useCan()
  return can(...perm) ? <>{children}</> : <NoAccess what={what} />
}

/** Loads a path and renders children with the data. 403s become a plain notice, never a crash. */
export function Fetch({ path, children }) {
  const { data, error, loading, reload } = useApi(path)
  if (loading && !data) return <Spinner className="h-40" />
  if (error) return /allow|forbidden|permission/i.test(error) ? <NoAccess /> : <Alert>{error} <button type="button" onClick={reload} className="underline ml-2">Try again</button></Alert>
  if (data == null) return null
  return <>{children(data, reload)}</>
}

export const cents = (c) => (c == null ? '' : `$${(c / 100).toFixed(2)}`)
export const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
export const lines = (s) => s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean)

/** A label/value list. */
export function Kv({ rows }) {
  return <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd className="text-gray-900 break-words">{v ?? '—'}</dd></div>)}</dl>
}

export function Why({ children }) {
  return <details className="text-sm"><summary className="cursor-pointer text-primary-700">What is this?</summary><p className="text-xs text-gray-600 mt-1">{children}</p></details>
}

export function CheckList({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((o) => <label key={o.value} className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2"><input type="checkbox" checked={value.includes(o.value)} onChange={() => onChange(toggleIn(value, o.value))} />{o.label}</label>)}
    </div>
  )
}

/**
 * Delete with a typed confirmation. The server removes the record if nothing depends on it, or closes it and scrubs personal details when it has
 * order or money history; the answer says which, so the admin always knows what happened.
 */
export function DeleteButton({ what, name, path, onDone, children = 'Delete' }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ok = typed.trim().toLowerCase() === String(name).trim().toLowerCase()
  return (
    <>
      <Button variant="danger" size="sm" onClick={() => { setTyped(''); setErr(''); setOpen(true) }}>{children}</Button>
      {open && (
        <Modal title={`Delete ${what}`} onClose={() => setOpen(false)}>
          <div className="space-y-3 text-sm">
            <p>This removes <strong>{name}</strong> for good if nothing depends on it. If it has orders or payments, it is <strong>closed</strong> instead (sign-in off, personal details removed) so the books stay correct.</p>
            <Field label={`Type ${name} to confirm`} htmlFor="del-confirm"><Input id="del-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></Field>
            <Alert>{err}</Alert>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" busy={busy} disabled={!ok} onClick={async () => { setBusy(true); setErr(''); try { const r = await del(path); setOpen(false); onDone(r) } catch (e) { setErr(e.response?.data?.detail || e.message) } finally { setBusy(false) } }}>Delete</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}
