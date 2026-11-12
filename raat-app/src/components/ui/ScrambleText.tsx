'use client';
import { useEffect, useRef } from 'react';

const GLYPHS = '#%&*+/<>=?▒░▓█01ABCDEFGHJKMNPRSTUVWXYZ';

/** Letters settle out of noise. Latin text scrambles; Hindi and Gujarati reveal letter by letter. */
export default function ScrambleText({ text, latin, ms = 900 }: { text: string; latin: boolean; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const parts: string[] = (() => {
      try { return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment); } catch { return [...text]; }
    })();
    if (reduced) { el.textContent = text; return; }
    const t0 = performance.now(); let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const done = Math.floor(k * parts.length);
      let out = '';
      for (let i = 0; i < parts.length; i++) {
        if (i < done || parts[i] === ' ') out += parts[i];
        else if (latin) out += i < done + 6 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : ' ';
        else out += ' ';
      }
      el.textContent = out;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, latin, ms]);
  return <span ref={ref} aria-label={text}>{text}</span>;
}
