import { useCallback, useEffect, useRef, useState } from 'react'
import { get, errText } from './client'

/** Loads a path and reloads on demand. `data` is null until the first answer. */
export function useApi(path, { skip = false } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!skip)
  const seq = useRef(0)
  const reload = useCallback(async () => {
    if (skip || !path) return
    const my = ++seq.current
    setLoading(true)
    try { const d = await get(path); if (my === seq.current) { setData(d); setError('') } } catch (e) { if (my === seq.current) setError(errText(e)) } finally { if (my === seq.current) setLoading(false) }
  }, [path, skip])
  useEffect(() => { reload() }, [reload])
  return { data, error, loading, reload, setData }
}

/** Runs an async action with busy and error state: `const save = useAction(async (x) => {...}); save.run(x)`. */
export function useAction(fn) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = useCallback(async (...args) => {
    setBusy(true); setError('')
    try { return await fn(...args) } catch (e) { setError(errText(e)); return undefined } finally { setBusy(false) }
  }, [fn]) // eslint-disable-line react-hooks/exhaustive-deps
  return { run, busy, error, setError }
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

/** A small toast: `const toast = useToast(); toast('Saved')`. Render <Toasts /> once in the shell. */
const listeners = new Set()
export const toast = (text, tone = 'ok') => listeners.forEach((l) => l({ id: Math.random(), text, tone }))
export function useToasts() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const l = (t) => { setItems((p) => [...p, t]); setTimeout(() => setItems((p) => p.filter((x) => x.id !== t.id)), 4000) }
    listeners.add(l); return () => listeners.delete(l)
  }, [])
  return items
}
