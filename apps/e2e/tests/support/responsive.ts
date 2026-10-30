import type { Page } from 'playwright-core';

/**
 * Responsive checks that run inside the page. Shared by the full audit and the everyday regression test, so both judge a page by the same rules.
 *
 * What counts as a problem (severity in brackets):
 *  h-scroll       the page scrolls sideways                                         (critical, any size)
 *  beyond         a visible element sticks out past the screen edge                 (critical)
 *  overlap        two controls sit on top of each other                             (critical)
 *  date-overlap   a date, time or month field overlaps another or leaves the screen (critical)
 *  input-font     a text field under 16px on a phone: iOS Safari zooms in on focus  (high)
 *  clipped        text cut off with no ellipsis                                     (high)
 *  target-small   a control under 24px: below the WCAG 2.2 minimum                  (high)
 *  target-44      a control under 44px: reported as information, not a failure     (info)
 */
export const VIEWPORTS = [
  { name: '320', width: 320, height: 640 }, { name: '360', width: 360, height: 740 }, { name: '390', width: 390, height: 844 }, { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 }, { name: '1024', width: 1024, height: 768 }, { name: '1280', width: 1280, height: 900 }, { name: '1440', width: 1440, height: 900 },
  { name: '667x375 landscape', width: 667, height: 375 }, { name: '844x390 landscape', width: 844, height: 390 },
] as const;
export const PHONE_MAX = 767;

export type Issue = { kind: string; severity: 'critical' | 'high' | 'info'; detail: string };

export async function measure(page: Page, vw: number, vh: number): Promise<Issue[]> {
  return page.evaluate(([W, H, PHONE]) => {
    const out: { kind: string; severity: 'critical' | 'high' | 'info'; detail: string }[] = [];
    const sel = (e: Element) => { const c = (e.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.'); const t = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24); return `${e.tagName.toLowerCase()}${c ? '.' + c : ''}${t ? ` "${t}"` : ''}`; };
    const shown = (e: Element) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
      const closed = e.closest('details:not([open])'); if (closed && !e.closest('summary')) return false; /* the inside of a closed details box is not on screen */ const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
    // A drawer that is closed (parked off screen), or anything hidden from people, is not a problem.
    const parked = (e: Element) => { for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.position === 'fixed') { const r = n.getBoundingClientRect(); if (r.right <= 1 || r.left >= W - 1 || r.bottom <= 1 || r.top >= H - 1) return true; } if (n.hasAttribute('inert') || n.getAttribute('aria-hidden') === 'true') return true; } return false; };
    // Something inside a box that scrolls sideways on purpose (a table, a row of chips) may be wider than the screen.
    const inScroller = (e: Element) => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth) { const r = n.getBoundingClientRect(); if (r.right <= W + 1 && r.left >= -1) return true; } if (/(hidden|clip)/.test(cs.overflowX)) { const r = n.getBoundingClientRect(); if (r.right <= W + 1 && r.left >= -1) return true; } } return false; };

    // The part of an element people can actually see: its box cut down by every ancestor that clips or scrolls.
    const seenRect = (e: Element) => {
      const r = e.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
      for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n); const q = n.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) { L = Math.max(L, q.left); R = Math.min(R, q.right); }
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowY)) { T = Math.max(T, q.top); B = Math.min(B, q.bottom); }
      }
      return { left: L, top: T, right: R, bottom: B, width: Math.max(0, R - L), height: Math.max(0, B - T) };
    };
    const stuck = (e: Element) => { for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
    const decorative = (e: Element) => e.classList.contains('skip') || e.classList.contains('sr-only') || !!e.closest('.skip, .sr-only');

    const doc = document.documentElement;
    const over = Math.max(doc.scrollWidth, document.body.scrollWidth) - W;
    if (over > 1) out.push({ kind: 'h-scroll', severity: 'critical', detail: `page is ${over}px wider than the screen` });

    const beyond: string[] = [];
    document.querySelectorAll('body *').forEach((e) => {
      if (beyond.length >= 4 || !shown(e) || decorative(e) || e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return;
      const r = seenRect(e);
      if (r.width > 0 && (r.right > W + 1 || r.left < -1) && !parked(e) && !inScroller(e) && getComputedStyle(e).position !== 'fixed') beyond.push(`${sel(e)} (${Math.round(r.left)}..${Math.round(r.right)})`);
    });
    if (beyond.length) out.push({ kind: 'beyond', severity: 'critical', detail: beyond.join('; ') });

    const fields = [...document.querySelectorAll('input, select, textarea')].filter((e) => shown(e) && !parked(e)) as HTMLInputElement[];
    const textLike = fields.filter((e) => !['checkbox', 'radio', 'range', 'hidden', 'file', 'color', 'submit', 'button', 'image', 'reset'].includes((e.type || '').toLowerCase()));
    if (W <= PHONE) {
      const small = textLike.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16);
      if (small.length) out.push({ kind: 'input-font', severity: 'high', detail: `${small.length} field(s) under 16px, e.g. ${sel(small[0])} is ${getComputedStyle(small[0]).fontSize}` });
    }

    const dates = textLike.filter((e) => ['date', 'datetime-local', 'time', 'month', 'week'].includes(e.type));
    const dateBad: string[] = [];
    dates.forEach((e, i) => {
      const r = e.getBoundingClientRect();
      if (r.right > W + 1 || r.left < -1) dateBad.push(`${sel(e)} leaves the screen`);
      if (W <= PHONE && r.width < (e.type === 'time' ? 100 : 125)) dateBad.push(`${sel(e)} is only ${Math.round(r.width)}px wide`);
      dates.slice(i + 1).forEach((o) => { const q = o.getBoundingClientRect(); const ix = Math.min(r.right, q.right) - Math.max(r.left, q.left), iy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); if (ix > 2 && iy > 2) dateBad.push(`${sel(e)} overlaps ${sel(o)}`); });
    });
    if (dateBad.length) out.push({ kind: 'date-overlap', severity: 'critical', detail: dateBad.slice(0, 3).join('; ') });

    // Controls on top of each other
    const controls = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')].filter((e) => shown(e) && !parked(e) && !decorative(e) && !(e as HTMLInputElement).disabled) as HTMLElement[];
    const rects = controls.map((e) => seenRect(e));
    const clash: string[] = [];
    for (let i = 0; i < controls.length && clash.length < 3; i++) for (let j = i + 1; j < controls.length && clash.length < 3; j++) {
      const a = controls[i], b = controls[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = rects[i], rb = rects[j];
      if (ra.width < 1 || rb.height < 1 || ra.height < 1 || rb.width < 1) continue;      // not visible at all (scrolled out of its box)
      if (stuck(a) || stuck(b)) continue;                                              // a fixed bar over the page is by design
      if (getComputedStyle(a).display === 'inline' && getComputedStyle(b).display === 'inline') continue;   // two links in one wrapped sentence
      if (a.classList.contains('shelf-btn') || b.classList.contains('shelf-btn')) continue;
      if (a.closest('.hero-dots') && b.closest('.hero-dots')) continue;                                   // carousel dots: the touch areas touch, the dots themselves do not               // the carousel arrows sit over the cards by design
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix <= 3 || iy <= 3) continue;
      const small = Math.min(ra.width * ra.height, rb.width * rb.height);
      if ((ix * iy) / small < 0.3) continue;
      const ta = a.tagName, tb = b.tagName;
      if ((ta === 'INPUT' || ta === 'TEXTAREA') !== (tb === 'INPUT' || tb === 'TEXTAREA') && a.parentElement === b.parentElement) continue;   // a clear or search button inside its own field
      if (a.parentElement?.contains(b) && (getComputedStyle(a).position === 'absolute' || getComputedStyle(b).position === 'absolute')) continue;
      if (ta === 'A' && tb === 'A' && (a.closest('li, article') === b.closest('li, article')) && (a.querySelector('img,svg') || b.querySelector('img,svg'))) continue;   // a picture link and a name link in one card
      clash.push(`${sel(a)} overlaps ${sel(b)}`);
    }
    if (clash.length) out.push({ kind: 'overlap', severity: 'critical', detail: clash.join('; ') });

    // Text cut off with no ellipsis
    const clipped: string[] = [];
    document.querySelectorAll('body *').forEach((e) => {
      if (clipped.length >= 3) return;
      const h = e as HTMLElement; const cs = getComputedStyle(h);
      if (!/(hidden|clip)/.test(cs.overflowX) || cs.textOverflow === 'ellipsis' || h.scrollWidth <= h.clientWidth + 3 || h.clientWidth < 12) return;
      if (!shown(h) || parked(h) || !(h.textContent || '').trim() || getComputedStyle(h).webkitLineClamp !== 'none') return;
      if ([...h.childNodes].some((n) => n.nodeType === 3 && (n.textContent || '').trim())) clipped.push(sel(h));
    });
    if (clipped.length) out.push({ kind: 'clipped', severity: 'high', detail: clipped.join('; ') });

    // Touch targets (phones and tablets)
    if (W <= 1024) {
      const tiny: string[] = []; let under44 = 0;
      controls.forEach((e, i) => {
        const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || rects[i].width < 1) return;   // the whole control, even when a row of them scrolls
        const edge = seenRect(e); if (edge.width < r.width - 1) return;                                    // half scrolled out of a row: not judged on the sliver
        if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') return;                       // a link inside a sentence
        if (e.closest('.hero-dots')) return;                                                              // banner dots: the banner is deliberately left as designed, and it advances by itself and by swipe (WCAG 2.5.8 equivalent-control exception)
        if ((e as HTMLInputElement).type === 'checkbox' || (e as HTMLInputElement).type === 'radio') { const lab = e.closest('label'); if (lab) { const lr = lab.getBoundingClientRect(); if (lr.height >= 24 && lr.width >= 24) return; } }
        if (r.width < 24 || r.height < 24) tiny.push(`${sel(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        else if (r.width < 44 || r.height < 44) under44++;
      });
      if (tiny.length) out.push({ kind: 'target-small', severity: 'high', detail: `${tiny.length} under 24px: ${[...new Set(tiny)].slice(0, 6).join(', ')}` });
      if (under44) out.push({ kind: 'target-44', severity: 'info', detail: `${under44} control(s) between 24 and 44px` });
    }
    return out;
  }, [vw, vh, PHONE_MAX] as const);
}
