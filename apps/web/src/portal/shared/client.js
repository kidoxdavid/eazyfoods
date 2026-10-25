import { makeHttp } from '../http'

/** One place the shared pages and kit ask the API from. Each staff app sets its own window once, before it renders. */
let area = 'vendor'
let http = makeHttp(area)
export const setArea = (a) => { area = a; http = makeHttp(a) }
export const getArea = () => area
export const call = (method, path, body, opts) => http.raw(method, path, body, opts)
export const get = (p) => call('GET', p)
export const post = (p, b = {}) => call('POST', p, b)
export const put = (p, b = {}) => call('PUT', p, b)
export const patch = (p, b = {}) => call('PATCH', p, b)
export const del = (p) => call('DELETE', p)
export const upload = (path, file) => { const fd = new FormData(); fd.append('file', file); return call('POST', path, fd, { isForm: true }) }
export const errText = (e) => e?.response?.data?.detail || e?.message || 'Something went wrong'

export const money = (c) => `$${((c ?? 0) / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const dollarsToCents = (v) => Math.round(Number(v || 0) * 100)
export const centsToDollars = (c) => (c == null ? '' : (c / 100).toFixed(2))
export const fmtDate = (d, o = { year: 'numeric', month: 'short', day: 'numeric' }) => (d ? new Date(d).toLocaleDateString('en-CA', o) : '—')
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—')
