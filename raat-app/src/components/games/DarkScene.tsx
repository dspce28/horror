'use client';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { Beam } from '@/hooks/useFlashlight';

/**
 * A dark photograph lit only by the flashlight. Children are placed in the photo's own coordinates
 * (percentages), so hotspots stay on the right object at any screen size. On screens narrower than the
 * photo, the light pans the photo (see below) so every corner can be reached.
 */
export default function DarkScene({ src, beam, children, dark = .965 }: { src: string; beam: RefObject<Beam>; children?: ReactNode; dark?: number }) {
  const view = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // the finger's place across the screen picks the same place across the photo: finger at 70% of the
    // width → the light lands on 70% of the bus. The pan eases toward that, so it reads as a camera move.
    let raf = 0, k = -1, last = performance.now();
    const loop = (now: number) => {
      const v = view.current, b = beam.current;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (v && b && b.w > 1) {
        const over = v.offsetWidth - b.w;
        const want = Math.min(1, Math.max(0, b.x / b.w));
        k = k < 0 ? want : k + (want - k) * (1 - Math.exp(-dt * 9));
        v.style.transform = `translate(${(-over * k).toFixed(1)}px, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [beam]);
  return (
    <>
      <div ref={view} className="dark-view">
        <img src={src} alt="" draggable={false} className="h-full w-full select-none" />
        {children}
      </div>
      <div className="beam-dark" style={{ background: `rgba(0,0,0,${dark})` }} aria-hidden />
      <div className="beam-warm" aria-hidden />
    </>
  );
}

/** distance from the beam to an element's centre, in px of the game root, and whether it's lit */
export function litBy(el: Element | null, root: Element | null, b: Beam, reach = .55): { lit: boolean; d: number; cx: number; cy: number } {
  if (!el || !root) return { lit: false, d: 1e9, cx: 0, cy: 0 };
  const r = el.getBoundingClientRect(), R = root.getBoundingClientRect();
  const cx = r.left + r.width / 2 - R.left, cy = r.top + r.height / 2 - R.top;
  const d = Math.hypot(cx - b.x, cy - b.y);
  return { lit: d < b.r * reach + Math.min(r.width, r.height) * .25, d, cx, cy };
}
