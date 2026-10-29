import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Live pages. The API streams a short "something you can see changed" message whenever data changes (anyone, any device, any background job).
 * When one arrives the current page is reloaded in place: at once when it is safe, or when the person pauses if they are typing or have a window open,
 * so nothing they are doing is lost. If they stay busy for a while a small "Updates available" button offers the refresh.
 */
const AREAS = ['admin', 'finance', 'marketing', 'vendor', 'driver'];
const Version = createContext(0);
/** Changes whenever the page should reload its data. Providers that hold their own copy (the basket, the signed-in person) depend on it. */
export const useLiveVersion = () => useContext(Version);

/** Wrap the page area. When the version changes everything inside starts over and loads fresh data; the scroll position is kept. */
export function LiveBoundary({ children }: { children: ReactNode }) {
  const v = useContext(Version);
  return <Fragment key={v}>{children}</Fragment>;
}

const areaNow = () => { const a = window.location.pathname.split('/')[1]; return AREAS.includes(a) ? a : 'shop'; };

/** Is the person in the middle of something? Then wait. */
function busy(lastTouch: number) {
  if (/\/(checkout|new|edit)(\/|$)|\/edit$/.test(window.location.pathname)) return true;     // forms and payment: never reload under someone
  const a = document.activeElement as HTMLElement | null;
  if (a?.tagName === 'IFRAME') return true;                                                     // a card form
  if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable || (a.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'range'].includes((a as HTMLInputElement).type)))) return true;
  if (document.querySelector('[role="dialog"], dialog[open]')) return true;
  // A search or filter box with something in it: reloading would clear it.
  if ([...document.querySelectorAll<HTMLInputElement>('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=range])')].some((i) => i.value && i.offsetParent !== null)) return true;
  return Date.now() - lastTouch < 2500;
}

function restoreScroll(y: number) {
  let tries = 0;
  const go = () => { window.scrollTo(0, y); if (tries++ < 20 && Math.abs(window.scrollY - y) > 4) requestAnimationFrame(go); };
  requestAnimationFrame(go);
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const dirty = useRef(false);
  const lastTouch = useRef(0);
  const timer = useRef<number | null>(null);
  const deferredSince = useRef(0);

  useEffect(() => {
    // Automated browsers (the test suite) wait for the network to go quiet, which a stream that stays open never does; tests that need live pages opt in.
    if (navigator.webdriver && localStorage.getItem('ez_live') !== '1') return;
    let stop = false; let ctrl: AbortController | null = null; let retry: number | null = null; let everConnected = false;
    const apply = () => {
      if (!dirty.current) return;
      if (document.hidden) { setWaiting(true); return; }                       // applied when the tab is looked at again
      if (busy(lastTouch.current)) {
        deferredSince.current ||= Date.now();
        if (Date.now() - deferredSince.current > 6000) setWaiting(true);
        timer.current = window.setTimeout(apply, 1500);
        return;
      }
      dirty.current = false; deferredSince.current = 0; setWaiting(false);
      const y = window.scrollY;
      setVersion((n) => n + 1);
      restoreScroll(y);
    };
    const mark = () => { dirty.current = true; if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(apply, 900); };

    const connect = async () => {
      if (stop) return;
      ctrl = new AbortController();
      try {
        const res = await fetch('/api/live', { credentials: 'include', headers: { 'x-area': areaNow(), accept: 'text/event-stream' }, signal: ctrl.signal });
        if (res.status === 401) { retry = window.setTimeout(connect, 90_000); return; }       // not signed in here (yet): look again later
        if (!res.ok || !res.body) throw new Error('live unavailable');
        if (everConnected) mark();                                                // we may have missed something while disconnected
        everConnected = true;
        const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); if (/^data:/m.test(chunk)) mark(); }
        }
      } catch { /* dropped or aborted */ }
      if (!stop) retry = window.setTimeout(connect, 3000);
    };
    void connect();

    const touch = () => { lastTouch.current = Date.now(); };
    const visible = () => { if (!document.hidden && dirty.current) apply(); };
    const online = () => { if (ctrl) ctrl.abort(); };                           // reconnect straight away after the network comes back
    window.addEventListener('pointerdown', touch, true); window.addEventListener('keydown', touch, true);
    document.addEventListener('visibilitychange', visible); window.addEventListener('online', online);
    return () => {
      stop = true; ctrl?.abort(); if (retry) window.clearTimeout(retry); if (timer.current) window.clearTimeout(timer.current);
      window.removeEventListener('pointerdown', touch, true); window.removeEventListener('keydown', touch, true);
      document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', online);
    };
  }, []);

  const refreshNow = () => { dirty.current = false; deferredSince.current = 0; setWaiting(false); const y = window.scrollY; setVersion((n) => n + 1); restoreScroll(y); };
  return (
    <Version.Provider value={version}>
      {children}
      {waiting && (
        <button type="button" onClick={refreshNow} role="status" aria-live="polite"
          style={{ position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 2147483000, background: '#14532d', color: '#fff', border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, padding: '10px 18px', font: '600 14px system-ui, sans-serif', boxShadow: '0 4px 16px rgba(0,0,0,.35)', cursor: 'pointer' }}>
          Updates available. Tap to refresh
        </button>
      )}
    </Version.Provider>
  );
}
