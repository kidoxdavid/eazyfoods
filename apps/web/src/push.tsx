import { useEffect, useState } from 'react';
import { api } from './api';

/** Notifications on a phone or computer, even when the app is closed (web push). Works in the browser and in apps saved to the home screen. */
const AREAS = ['vendor', 'kitchen', 'driver', 'admin', 'marketing', 'finance'];
export const currentArea = () => { const a = window.location.pathname.split('/')[1]; return AREAS.includes(a) ? a : 'shop'; };
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const hdr = () => { const a = currentArea(); return a === 'shop' ? undefined : { 'x-area': a === 'kitchen' ? 'vendor' : a }; };
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

const key = (s: string) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

async function registration() {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); return sub && Notification.permission === 'granted' ? 'on' : 'off'; } catch { return 'off'; }
}

/** Must be called from a tap: phones only allow the permission question after a deliberate action. */
export async function enablePush(): Promise<PushState> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  const { key: vapid } = await api<{ key: string }>('/push/key');
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(vapid) });
  await api('/push/subscribe', { method: 'POST', json: { subscription: sub.toJSON(), area: currentArea() }, headers: hdr() });
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await api('/push/unsubscribe', { method: 'POST', json: { endpoint: sub.endpoint }, headers: hdr() }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
  return 'off';
}

/** The "Turn on notifications" control. `portal` styles it for the staff apps, the default for the shop. */
export function PushToggle({ variant = 'shop' }: { variant?: 'shop' | 'portal' }) {
  const [st, setSt] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => { pushState().then(setSt); }, []);
  if (!st || st === 'unsupported') return null;
  const portal = variant === 'portal';
  const btn = portal ? 'w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-lg' : 'btn secondary sm';
  const run = async (f: () => Promise<PushState>) => { setBusy(true); setNote(''); try { setSt(await f()); } catch (e: any) { setNote(e?.message || 'Could not change notifications.'); } finally { setBusy(false); } };
  const test = async () => { setBusy(true); setNote(''); try { const r = await api<{ sent: number }>('/push/test', { method: 'POST', json: { area: currentArea() }, headers: hdr() }); setNote(r.sent ? 'Test sent. Check your notifications.' : 'No device is registered here yet.'); } catch (e: any) { setNote(e?.message || 'Could not send a test.'); } finally { setBusy(false); } };
  const hint = portal ? 'px-3 sm:px-4 pb-1 text-[11px] text-gray-500' : 'small muted';
  return (
    <div className={portal ? '' : 'push-toggle'} data-testid="push-toggle">
      {st === 'needs-install' && <p className={hint}>To get notifications on iPhone, add this app to your Home Screen (Share, then Add to Home Screen) and open it from there.</p>}
      {st === 'denied' && <p className={hint}>Notifications are blocked. Turn them on for this app in your phone’s Settings.</p>}
      {st === 'off' && <button type="button" className={btn} disabled={busy} onClick={() => run(enablePush)}>{busy ? 'Turning on…' : 'Turn on notifications'}</button>}
      {st === 'on' && <>
        <button type="button" className={btn} disabled={busy} onClick={test}>Notifications on · Send a test</button>
        <button type="button" className={btn} disabled={busy} onClick={() => run(disablePush)}>Turn off notifications</button>
      </>}
      {note && <p className={hint} role="status">{note}</p>}
    </div>
  );
}
