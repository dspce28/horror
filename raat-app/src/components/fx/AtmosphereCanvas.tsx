'use client';
import { useEffect, useRef } from 'react';

/** 2D particles, sideways fog and a far-off red light. Cheap enough to run on the landing screen. */
export default function AtmosphereCanvas({ red = true, density = 1 }: { red?: boolean; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const g = c.getContext('2d'); if (!g) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => { w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const small = window.innerWidth < 700;
    const parts = Array.from({ length: Math.round((small ? 70 : 160) * density) }, () => ({ x: Math.random(), y: Math.random(), z: .2 + Math.random() * .8, v: .2 + Math.random() }));
    const fog = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: .45 + i * .08, r: .35 + Math.random() * .3, v: .004 + Math.random() * .006 }));
    let t0 = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
      g.clearRect(0, 0, w, h);
      if (red) {
        const pulse = .55 + Math.sin(now / 1400) * .2 + (Math.random() > .985 ? -.4 : 0);
        const rg = g.createRadialGradient(w * .5, h * .62, 0, w * .5, h * .62, Math.max(w, h) * .45);
        rg.addColorStop(0, `rgba(114,25,31,${.22 * pulse})`); rg.addColorStop(.25, `rgba(53,19,22,${.12 * pulse})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(0, 0, w, h);
        g.fillStyle = `rgba(255,120,90,${.5 * pulse})`; g.beginPath(); g.arc(w * .5, h * .62, 1.6, 0, Math.PI * 2); g.fill();
      }
      fog.forEach((f) => {
        if (!reduced) f.x += f.v * dt * 6; if (f.x > 1.5) f.x = -.5;
        const r = f.r * w, gr = g.createRadialGradient(f.x * w, f.y * h, 0, f.x * w, f.y * h, r);
        gr.addColorStop(0, 'rgba(182,169,154,.06)'); gr.addColorStop(1, 'rgba(182,169,154,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      parts.forEach((p) => {
        if (!reduced) { p.y -= p.v * p.z * dt * .02; p.x += Math.sin(now / 2000 + p.v * 9) * dt * .004; }
        if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        g.fillStyle = `rgba(212,200,181,${.12 + p.z * .35})`; g.fillRect(p.x * w, p.y * h, p.z * 1.6, p.z * 1.6);
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [red, density]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
