/** Tiny fetch wrapper shared by the portals. Each portal is its own sign-in (x-area), and errors look like axios errors so the original pages work unchanged. */
export function makeHttp(area) {
  async function raw(method, path, body, { isForm = false } = {}) {
    const headers = { 'x-area': area }
    if (body !== undefined && !isForm) headers['content-type'] = 'application/json'
    const res = await fetch(`/api${path}`, { method, credentials: 'include', headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) })
    let data = null
    const text = await res.text()
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    if (!res.ok) {
      const err = new Error((data && (data.message || data.error)) || `Request failed (${res.status})`)
      err.response = { status: res.status, data: { detail: (data && (data.message || data.error)) || 'Request failed', ...(typeof data === 'object' && data ? data : {}) } }
      throw err
    }
    return data
  }
  return { raw }
}

export const notFound = (what) => { const e = new Error(`${what} is not available`); e.response = { status: 404, data: { detail: `${what} is not available yet` } }; return e }
