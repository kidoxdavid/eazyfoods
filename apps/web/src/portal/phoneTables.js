/**
 * On a phone no table scrolls sideways: each row becomes a small card, with the column name beside every value.
 * The look is in responsive.css (.ez-cards); this only copies each column heading onto its cells, and keeps doing it as pages change.
 */
const skip = (t) => t.closest('#packing-slip-content, [data-keep-table]')

function enhance(t) {
  if (skip(t)) return
  const heads = [...t.querySelectorAll(':scope > thead th')].map((th) => th.textContent.trim())
  if (!heads.length) return
  t.classList.add('ez-cards')
  t.querySelectorAll(':scope > tbody > tr').forEach((tr) => {
    ;[...tr.children].forEach((td, i) => { if (td.colSpan > 1) return; if (heads[i] && td.dataset.label !== heads[i]) td.dataset.label = heads[i] })
  })
}

export function watchTables() {
  let queued = false
  const run = () => { queued = false; document.querySelectorAll('table').forEach(enhance) }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(run) } }
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true })
  queue()
}
