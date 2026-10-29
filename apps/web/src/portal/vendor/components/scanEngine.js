import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

/**
 * Barcode reading for product packs.
 *
 * Packaging barcodes are small, curved, glossy and often slightly blurred, and phone cameras differ a lot. Two readers are used together:
 *  1. The phone's own barcode detector when it has one (Android Chrome): fast and tuned by the maker.
 *  2. ZXing (C++ compiled to WebAssembly, served from this site): much stronger than the old JavaScript reader, especially on iPhones.
 * Each picture is tried several ways (full size, shrunk, contrast-stretched, enlarged) because a blurred or noisy picture often reads once it is shrunk.
 */
const FORMATS = ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'Code128', 'Code39', 'ITF', 'Codabar']
const NATIVE = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar']

let ready = null
const warm = () => (ready ??= prepareZXingModule({ overrides: { locateFile: (p, prefix) => (p.endsWith('.wasm') ? wasmUrl : prefix + p) }, fireImmediately: true }))

let nativeDetector
async function native() {
  if (nativeDetector !== undefined) return nativeDetector
  try {
    if (!('BarcodeDetector' in window)) return (nativeDetector = null)
    const have = await window.BarcodeDetector.getSupportedFormats()
    const formats = NATIVE.filter((f) => have.includes(f))
    nativeDetector = formats.length ? new window.BarcodeDetector({ formats }) : null
  } catch { nativeDetector = null }
  return nativeDetector
}

const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c }

/** A copy of the picture at `scale`, optionally greyscaled with the contrast stretched to the full range and lightly sharpened. */
function variant(source, sw, sh, scale, enhance) {
  const c = canvasOf(sw * scale, sh * scale)
  const g = c.getContext('2d', { willReadFrequently: true })
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
  g.drawImage(source, 0, 0, c.width, c.height)
  if (!enhance) return c
  const img = g.getImageData(0, 0, c.width, c.height); const d = img.data
  let lo = 255, hi = 0
  for (let i = 0; i < d.length; i += 4) { const y = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8; d[i] = y; if (y < lo) lo = y; if (y > hi) hi = y }
  const span = Math.max(40, hi - lo)
  for (let i = 0; i < d.length; i += 4) { const y = Math.min(255, Math.max(0, ((d[i] - lo) * 255) / span)); d[i] = d[i + 1] = d[i + 2] = y }
  g.putImageData(img, 0, 0)
  return c
}

const PASSES = [
  { scale: 1, enhance: false }, { scale: 0.5, enhance: false }, { scale: 1, enhance: true }, { scale: 0.5, enhance: true },
  { scale: 0.33, enhance: true }, { scale: 1.6, enhance: true }, { scale: 0.7, enhance: true },
]

async function zxing(canvas) {
  await warm()
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height)
  const r = await readBarcodes(data, { formats: FORMATS, tryHarder: true, tryRotate: true, tryInvert: false, maxNumberOfSymbols: 1 })
  return r.find((x) => x.isValid !== false && x.text)?.text ?? null
}

/** Try one picture with every method. `pass` picks a single method (for live video, where the next frame gets the next method). */
export async function decodeSource(source, sw, sh, pass = null) {
  const det = await native()
  if (det) { try { const f = await det.detect(source); if (f[0]?.rawValue) return f[0].rawValue } catch { /* fall through to ZXing */ } }
  const list = pass == null ? PASSES : [PASSES[pass % PASSES.length]]
  for (const p of list) {
    const text = await zxing(variant(source, sw, sh, p.scale, p.enhance)).catch(() => null)
    if (text) return text
  }
  return null
}

/** A photo someone took or chose. */
export async function decodeFile(file) {
  const bmp = await createImageBitmap(file)
  const long = Math.max(bmp.width, bmp.height)
  const k = long > 1800 ? 1800 / long : 1   // very large photos are shrunk first: the same barcode, far less to search
  const c = canvasOf(bmp.width * k, bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const text = await decodeSource(c, c.width, c.height)
  bmp.close?.()
  return text
}

export const warmUp = () => { warm().catch(() => {}) }
export const PASS_COUNT = PASSES.length
