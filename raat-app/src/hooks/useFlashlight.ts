'use client';
import { useEffect, useRef, type RefObject } from 'react';

export interface Beam {
  /** beam centre in px, relative to the element */
  x: number; y: number;
  /** beam radius in px */
  r: number;
  /** element size */
  w: number; h: number;
  /** a finger or the mouse is on the element */
  active: boolean;
  kind: 'mouse' | 'touch' | 'pen';
}

/**
 * One flashlight for every input: Pointer Events cover mouse, finger and pen with the same code.
 * - Mouse: the beam follows the cursor (lightly smoothed).
 * - Touch: the beam jumps to the finger and follows it with no smoothing (no visible lag).
 * The element gets touch-action: none while mounted, so dragging moves the light, not the page.
 * Writes --fx, --fy, --fr (px) on the element every frame for CSS masks.
 */
export function useFlashlight(root: RefObject<HTMLElement | null>, opts: { radius?: number; onTap?: (b: Beam) => void } = {}) {
  const beam = useRef<Beam>({ x: 0, y: 0, r: 120, w: 1, h: 1, active: false, kind: 'mouse' });
  const target = useRef({ x: 0, y: 0 });
  const onTap = useRef(opts.onTap); onTap.current = opts.onTap;

  useEffect(() => {
    const el = root.current; if (!el) return;
    el.style.touchAction = 'none';
    const size = () => {
      const r = el.getBoundingClientRect(); const b = beam.current;
      b.w = r.width; b.h = r.height; b.r = Math.min(r.width, r.height) * (opts.radius ?? .2);
      if (!b.active && b.x === 0 && b.y === 0) { b.x = target.current.x = r.width / 2; b.y = target.current.y = r.height * .55; }
    };
    size();
    const local = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return { x: Math.min(r.width, Math.max(0, e.clientX - r.left)), y: Math.min(r.height, Math.max(0, e.clientY - r.top)) }; };
    let downAt = { x: 0, y: 0, t: 0 };
    const move = (e: PointerEvent) => {
      const p = local(e); target.current = p;
      const b = beam.current; b.kind = e.pointerType as Beam['kind'];
      if (e.pointerType !== 'mouse') { b.x = p.x; b.y = p.y; } // fingers: no lag at all
      b.active = true;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') { try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ } }
      move(e); downAt = { ...local(e), t: performance.now() };
    };
    const up = (e: PointerEvent) => {
      const p = local(e);
      if (Math.hypot(p.x - downAt.x, p.y - downAt.y) < 14 && performance.now() - downAt.t < 450) onTap.current?.(beam.current);
      if (e.pointerType !== 'mouse') { /* keep the light where the finger lifted */ }
    };
    const leave = (e: PointerEvent) => { if (e.pointerType === 'mouse') beam.current.active = false; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    addEventListener('resize', size);

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const b = beam.current, t = target.current;
      if (b.kind === 'mouse') { const k = 1 - Math.exp(-dt * 22); b.x += (t.x - b.x) * k; b.y += (t.y - b.y) * k; }
      el.style.setProperty('--fx', `${b.x.toFixed(1)}px`); el.style.setProperty('--fy', `${b.y.toFixed(1)}px`); el.style.setProperty('--fr', `${b.r.toFixed(1)}px`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up); el.removeEventListener('pointerleave', leave); removeEventListener('resize', size);
    };
  }, [root, opts.radius]);

  return beam;
}

/** Keyboard support for the same beam: arrow keys move it. */
export function nudgeBeam(b: Beam, key: string): boolean {
  const s = Math.max(24, b.r * .4);
  if (key === 'ArrowLeft') b.x = Math.max(0, b.x - s); else if (key === 'ArrowRight') b.x = Math.min(b.w, b.x + s);
  else if (key === 'ArrowUp') b.y = Math.max(0, b.y - s); else if (key === 'ArrowDown') b.y = Math.min(b.h, b.y + s);
  else return false;
  b.active = true; b.kind = 'pen'; // pen = no smoothing, so the mouse target doesn't pull it back
  return true;
}
