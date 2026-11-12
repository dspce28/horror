'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { events, live, store, useStore } from '@/lib/store';
import { assetUrl } from '@/lib/assets';
import { ghostFaceDataUrl, photoFront } from '@/lib/three/textures';

let faceUrl: string | null = null;
export function ghostFace(): string {
  if (!faceUrl) faceUrl = assetUrl('ghostFace') ?? ghostFaceDataUrl();
  return faceUrl;
}

let photoUrl: string | null = null;
export function oldPhoto(): string {
  if (!photoUrl) photoUrl = assetUrl('photoFront') ?? photoFront();
  return photoUrl;
}

/** Film grain, vignette, flashes, blackouts, cracked glass and the one real jump scare. */
export default function Overlays() {
  const scene = useStore((s) => s.sceneIndex);
  const safe = useStore((s) => s.safe);
  const reduced = useStore((s) => s.reduced);
  const flash = useRef<HTMLDivElement>(null);
  const [black, setBlack] = useState(false);
  const [scare, setScare] = useState(false);
  const [crack, setCrack] = useState(false);
  const face = useMemo(() => (typeof window === 'undefined' ? '' : ghostFace()), []);

  useEffect(() => {
    const off = events.on((id) => {
      if (id === 'blackout') { setBlack(true); window.setTimeout(() => setBlack(false), 1000); }
      if (id === 'crack') setCrack(true);
      if (id === 'jumpscare' && !store.get().safe && !store.get().reduced) { setScare(true); window.setTimeout(() => setScare(false), 520); }
    });
    // film grain: a small noise tile drawn once, then shifted with CSS
    const n = document.createElement('canvas'); n.width = n.height = 128; const ng = n.getContext('2d');
    if (ng) { const img = ng.createImageData(128, 128); for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } ng.putImageData(img, 0, 0); document.documentElement.style.setProperty('--grain', `url(${n.toDataURL()})`); }
    let raf = 0;
    const loop = () => {
      if (flash.current) {
        live.flash = Math.max(0, live.flash - .04);
        flash.current.style.opacity = String(reduced ? Math.min(.3, live.flash) : live.flash);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { off(); cancelAnimationFrame(raf); };
  }, [reduced]);

  useEffect(() => { if (scene < 5 || scene > 5) setCrack(false); }, [scene]);

  return (
    <>
      <div className="fx-vignette" aria-hidden />
      <div className={`fx-grain ${reduced ? 'still' : ''}`} aria-hidden />
      <div ref={flash} className="fx-flash" aria-hidden />
      {crack && (
        <svg className="fx-crack" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden>
          <g stroke="rgba(230,226,215,.55)" strokeWidth="1.2" fill="none">
            <path d="M0 80 L140 120 L210 90 L330 160 L420 140" /><path d="M140 120 L120 220 L160 300" /><path d="M210 90 L240 10" />
            <path d="M1000 420 L860 380 L800 440 L690 400 L610 470" /><path d="M860 380 L880 260 L840 200" /><path d="M800 440 L790 560" />
          </g>
        </svg>
      )}
      <div className={`fx-black ${black ? 'on' : ''}`} aria-hidden />
      {scare && !safe && (
        <div className="fx-scare" aria-hidden>
          <img src={face} alt="" />
        </div>
      )}
    </>
  );
}
