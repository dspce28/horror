'use client';
import { useEffect, useState } from 'react';
import { events, store } from '@/lib/store';

/**
 * Her face for two or three frames at a calm moment. Not quite seen; not quite not seen.
 * Never in no-jump-scare mode or with reduced motion.
 */
export default function SubliminalFlash() {
  const [on, setOn] = useState(0);
  useEffect(() => events.on((id) => {
    if (id !== 'subliminal') return;
    const s = store.get(); if (s.safe || s.reduced) return;
    setOn(Date.now());
    window.setTimeout(() => setOn(0), 70);
  }), []);
  if (!on) return null;
  return <div className="subliminal" aria-hidden />;
}
