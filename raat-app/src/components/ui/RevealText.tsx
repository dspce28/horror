'use client';
import { useEffect, useMemo, useState } from 'react';

/**
 * The real text, revealed letter by letter with opacity and a soft blur. No random characters.
 * Waits for the web fonts so Hindi and Gujarati never flash in a fallback face, and splits by
 * grapheme so conjuncts and vowel signs stay whole.
 */
export default function RevealText({ text, ms = 900, className }: { text: string; ms?: number; className?: string }) {
  const [ready, setReady] = useState(false);
  const parts = useMemo(() => {
    try { return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment); } catch { return [...text]; }
  }, [text]);
  useEffect(() => {
    let alive = true;
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts) void fonts.ready.then(() => { if (alive) requestAnimationFrame(() => alive && setReady(true)); }); else setReady(true);
    return () => { alive = false; };
  }, [text]);
  const step = parts.length > 1 ? ms / parts.length : 0;
  return (
    <span className={className} aria-label={text}>
      {parts.map((p, i) => (
        <span key={i} aria-hidden className={`reveal-ch ${ready ? 'on' : ''}`} style={{ transitionDelay: `${Math.round(i * step)}ms` }}>
          {p === ' ' ? ' ' : p}
        </span>
      ))}
    </span>
  );
}
