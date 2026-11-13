'use client';
import { useEffect, useRef, useState } from 'react';
import { events, live, store, useStore } from '@/lib/store';

/** The real photographs used outside the main stage. */
export const ghostFace = (): string => '/raat/scenes/her-face.webp';
export const oldPhoto = (): string => '/raat/scenes/photo-1999.webp';
export const weddingPhoto = (): string => '/raat/scenes/wedding-1974.webp';

/** Film grain, vignette, flashes, blackouts and the one real jump scare. */
export default function Overlays() {
  const safe = useStore((s) => s.safe);
  const reduced = useStore((s) => s.reduced);
  const flash = useRef<HTMLDivElement>(null);
  const [black, setBlack] = useState(false);
  const [scare, setScare] = useState(false);
  const face = ghostFace();

  useEffect(() => {
    const off = events.on((id) => {
      if (id === 'blackout') { setBlack(true); window.setTimeout(() => setBlack(false), 1000); }
      if (id === 'jumpscare' && !store.get().safe && !store.get().reduced) { setScare(true); window.setTimeout(() => setScare(false), 520); }
    });
    // film grain: a small noise tile drawn once, then shifted with CSS
    const n = document.createElement('canvas'); n.width = n.height = 128; const ng = n.getContext('2d');
    if (ng) { const img = ng.createImageData(128, 128); for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } ng.putImageData(img, 0, 0); document.documentElement.style.setProperty('--grain', `url(${n.toDataURL()})`); }
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (flash.current) {
        live.flash = Math.max(0, live.flash - dt * 2.4); // gone in about 0.4 s, whatever the frame rate
        flash.current.style.opacity = String(reduced ? Math.min(.3, live.flash) : live.flash);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { off(); cancelAnimationFrame(raf); };
  }, [reduced]);


  return (
    <>
      <div className="fx-vignette" aria-hidden />
      <div className={`fx-grain ${reduced ? 'still' : ''}`} aria-hidden />
      <div ref={flash} className="fx-flash" aria-hidden />
      <div className={`fx-black ${black ? 'on' : ''}`} aria-hidden />
      {scare && !safe && (
        <div className="fx-scare" aria-hidden>
          <img src={face} alt="" />
        </div>
      )}
    </>
  );
}
