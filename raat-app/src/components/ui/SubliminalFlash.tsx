'use client';
import { useEffect, useState } from 'react';
import { events, store } from '@/lib/store';

/**
 * Her face for two or three frames at a calm moment. Not quite seen; not quite not seen.
 * Never in no-jump-scare mode or with reduced motion.
 */
export default function SubliminalFlash() {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => events.on((id) => {
    // 'subliminal' = her face; 'subliminal-upside' / 'subliminal-window' = the other glimpses
    if (!id.startsWith('subliminal')) return;
    const s = store.get(); if (s.safe || s.reduced) return;
    setImg(id === 'subliminal-upside' ? 'her-upside' : id === 'subliminal-window' ? 'her-window' : 'her-face');
    window.setTimeout(() => setImg(null), 70);
  }), []);
  if (!img) return null;
  return <div className="subliminal" style={{ backgroundImage: `url(/raat/scenes/${img}.webp)` }} aria-hidden />;
}
