// Names every control for screen readers without touching the cloned pages: ties each label to the field beside it and names icon-only buttons and links.
const ICON_NAMES = [[/trash/, 'Delete'], [/pencil|edit|square-pen/, 'Edit'], [/copy/, 'Duplicate'], [/^x$|lucide-x\b/, 'Close'], [/eye-off/, 'Hide'], [/eye/, 'Show'], [/plus/, 'Add'], [/download/, 'Download'], [/send/, 'Send']]
let n = 0

function tidy(root) {
  root.querySelectorAll('label:not([for])').forEach((l) => {
    if (l.querySelector('input,select,textarea')) return
    const field = l.parentElement?.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')
    if (field && !field.id && !field.getAttribute('aria-label')) { field.id = field.id || `f-${++n}`; l.htmlFor = field.id }
    else if (field?.id) l.htmlFor = field.id
  })
  root.querySelectorAll('input:not([type=hidden]),select,textarea').forEach((f) => {
    if (f.id && document.querySelector(`label[for="${f.id}"]`)) return
    if (f.closest('label') || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby')) return
    f.setAttribute('aria-label', f.getAttribute('placeholder') || f.getAttribute('title') || (f.type === 'date' ? 'Date' : f.tagName === 'SELECT' ? 'Choose an option' : f.type === 'file' ? 'Choose a file' : 'Field'))
  })
  root.querySelectorAll('button,a').forEach((b) => {
    if (b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title')) return
    const svg = b.querySelector('svg'); const cls = svg?.getAttribute('class') || ''
    const hit = ICON_NAMES.find(([re]) => re.test(cls))
    b.setAttribute('aria-label', hit ? hit[1] : 'Action')
  })
}

export function watchAccessibility() {
  let queued = false
  new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; tidy(document.body) }) }).observe(document.body, { childList: true, subtree: true })
}
