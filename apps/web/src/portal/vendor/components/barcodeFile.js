import JsBarcode from 'jsbarcode'

/** EAN-13 / UPC-A / EAN-8 when the digits fit one (so the picture is a standard shop barcode), otherwise Code 128. */
export const FORMAT = { 13: 'EAN13', 12: 'UPC', 8: 'EAN8' }

/** Draw a barcode into an element; a number with a wrong check digit falls back to Code 128, which takes any text. */
export function drawBarcode(target, code, opts = {}) {
  try { JsBarcode(target, code, { format: FORMAT[code.length] || 'CODE128', ...opts }) }
  catch { JsBarcode(target, code, { ...opts, format: 'CODE128' }) }
}

const safe = (s) => String(s || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const save = (blob, file) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }

/** Save the barcode as a PNG photo (white background, large enough to print or send to a printer shop). */
export function downloadBarcodePng(code, name) {
  const canvas = document.createElement('canvas')
  drawBarcode(canvas, code, { width: 4, height: 160, margin: 24, fontSize: 28, background: '#ffffff', lineColor: '#000000' })
  return new Promise((resolve) => canvas.toBlob((b) => { save(b, `barcode-${safe(name)}-${code}.png`); resolve() }, 'image/png'))
}

/** Save the barcode as an SVG (scales to any size without going blurry). */
export function downloadBarcodeSvg(code, name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  drawBarcode(svg, code, { width: 3, height: 120, margin: 20, fontSize: 22, background: '#ffffff' })
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  save(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), `barcode-${safe(name)}-${code}.svg`)
}
