import { useEffect, useState } from 'react';

/** Register the service worker on the real site only (it would get in the way of the dev server). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/** "Install the app": uses the browser's own prompt where there is one, and explains Add to Home Screen on iPhones. Hidden once installed. */
export function InstallApp() {
  const [evt, setEvt] = useState<Prompt | null>(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(isStandalone());
    const on = (e: Event) => { e.preventDefault(); setEvt(e as Prompt); };
    const done = () => { setInstalled(true); setEvt(null); };
    window.addEventListener('beforeinstallprompt', on); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done); };
  }, []);
  if (installed || (!evt && !isIos())) return null;
  return (
    <div className="install">
      <button type="button" className="link" onClick={async () => { if (evt) { await evt.prompt(); await evt.userChoice.catch(() => {}); setEvt(null); } else setHelp((h) => !h); }}>Install the EAZyfoods app</button>
      {help && <p className="small muted">On iPhone: tap the Share button, then “Add to Home Screen”.</p>}
    </div>
  );
}
