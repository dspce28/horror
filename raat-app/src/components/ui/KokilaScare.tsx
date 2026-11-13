'use client';
import { useEffect } from 'react';
import { audio } from '@/lib/audio/engine';

/**
 * Kokila, suddenly right in front of the lens: dark first, a sharp sound, her face too close, hair
 * moving, a short shake. In no-jump-scare mode she rises slowly out of the dark instead, in silence.
 */
export default function KokilaScare({ safe, line }: { safe: boolean; line?: string }) {
  useEffect(() => {
    if (safe) { audio.whisper(0, .6); return; }
    audio.silence();
    const id = window.setTimeout(() => { audio.hit(); audio.shriek(.75); try { if (navigator.vibrate) navigator.vibrate([350]); } catch { /* unsupported */ } }, 900); // black and silence first, then her
    return () => { window.clearTimeout(id); audio.restoreMusic(); };
  }, [safe]);
  return (
    <div className={`kokila-scare ${safe ? 'soft' : ''}`} role="img" aria-label={line ?? ''}>
      <div className="ks-face" />
      <div className="ks-hair" />
      {line && <p className="ks-line">{line}</p>}
    </div>
  );
}
