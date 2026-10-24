import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Notice } from '../../ui';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global { interface Window { BarcodeDetector?: new (o?: { formats: string[] }) => Detector } }

export const canScan = () => typeof window !== 'undefined' && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia;

/** Camera barcode scanner (phones/Chrome). Only offered when the browser supports it; typing the code always works. */
export function ScanButton({ onCode }: { onCode: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!canScan()) return null;
  return (<>
    <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Scan barcode</Button>
    {open && <Scanner onClose={() => setOpen(false)} onCode={(c) => { setOpen(false); onCode(c); }} />}
  </>);
}

function Scanner({ onClose, onCode }: { onClose: () => void; onCode: (c: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  const cb = useRef(onCode); cb.current = onCode;
  useEffect(() => {
    let stream: MediaStream | undefined; let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stop || !video.current) return;
        video.current.srcObject = stream; await video.current.play();
        const det = new window.BarcodeDetector!({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        const tick = async () => {
          if (stop || !video.current) return;
          try { const r = await det.detect(video.current); if (r[0]?.rawValue) return cb.current(r[0].rawValue); } catch { /* keep trying */ }
          setTimeout(tick, 250);
        };
        tick();
      } catch { setErr('The camera is not available. Allow camera access, or type the barcode instead.'); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return (
    <Modal open onClose={onClose} title="Scan a barcode">
      {err ? <Notice tone="warn">{err}</Notice> : <p className="muted small">Point the camera at the barcode on the pack.</p>}
      <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000', minHeight: 180 }} aria-label="Camera view" />
      <div className="row end"><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
    </Modal>
  );
}
