'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { SCENES } from '@/data/stories/last-passenger';
import { frameAt, imageFor } from '@/lib/animation/director';
import { sceneUrl, stage, tick } from '@/lib/animation/stageState';
import { live, store, useStore } from '@/lib/store';

const StoryCanvas = dynamic(() => import('./StoryCanvas'), { ssr: false });

function webglOk(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

/**
 * The film. With WebGL: the photographs become surfaces in depth, filmed by a moving camera
 * through a lens (StoryCanvas). Without: the same shots as plain images. Rain sits on top.
 */
export default function PhotoStage() {
  const gender = useStore((s) => s.gender);
  const scene = useStore((s) => s.sceneIndex);
  const [gl, setGl] = useState<boolean | null>(null);
  const [small, setSmall] = useState(false);
  const fallback = useRef<HTMLImageElement>(null);
  const rain = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setGl(webglOk()); setSmall(window.innerWidth < 900); stage.small = window.innerWidth < 900; }, []);

  // warm the browser cache for this scene and the next
  useEffect(() => {
    const sm = window.innerWidth < 900;
    [scene, scene + 1].forEach((i) => {
      const s = SCENES[i]; if (!s) return;
      for (let t = 0; t <= 1; t += .02) {
        const n = imageFor(frameAt(s.id, t, null).img, gender); if (!n) continue;
        new Image().src = sceneUrl(n, sm); new Image().src = sceneUrl(n, false, 'depth');
      }
    });
  }, [scene, gender]);

  useEffect(() => {
    if (gl === null) return;
    const sm = window.innerWidth < 900;
    const drops = Array.from({ length: sm ? 90 : 180 }, () => ({ x: Math.random(), y: Math.random(), l: .02 + Math.random() * .04, v: .9 + Math.random() * .8 }));
    const rc = rain.current!, rg = rc.getContext('2d')!;
    const size = () => { const d = Math.min(1.5, devicePixelRatio || 1); rc.width = innerWidth * d; rc.height = innerHeight * d; };
    size(); addEventListener('resize', size);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      // without WebGL this loop owns the stage
      const o = gl ? stage.out : tick(now, dt);
      if (o) {
        if (!gl && fallback.current) {
          const f = o.frame, im = fallback.current, W = innerWidth, H = innerHeight, A = 1672 / 941;
          const url = o.cur ? sceneUrl(o.cur, sm) : null;
          if (url && im.getAttribute('src') !== url) im.src = url;
          im.style.visibility = url ? 'visible' : 'hidden';
          let ih = Math.max(H, W / A) * f.zoom, iw = ih * A;
          const m = Math.max(1, (W + 60) / iw, (H + 44) / ih); iw *= m; ih *= m;
          const px = store.get().reduced ? 0 : -live.pointer.x * 14, py = store.get().reduced ? 0 : -live.pointer.y * 9;
          const left = Math.min(-30, Math.max(W - iw + 30, W / 2 - f.x * iw)) + px + o.shakeX * 6;
          const top = Math.min(-22, Math.max(H - ih + 22, H / 2 - f.y * ih)) + py + o.shakeY * 6;
          im.style.width = `${iw}px`; im.style.height = `${ih}px`; im.style.transform = `translate3d(${left}px, ${top}px, 0)`;
          im.style.filter = `brightness(${o.light.toFixed(3)})${f.warm ? ' sepia(.18)' : ''}`;
        }
        // rain streaks, slanting more as you scroll
        rg.clearRect(0, 0, rc.width, rc.height);
        const amt = (store.get().reduced ? .4 : 1) * o.frame.rain;
        if (amt > 0) {
          rg.strokeStyle = 'rgba(210,215,220,.2)'; rg.lineWidth = 1; rg.beginPath();
          const n = Math.round(drops.length * amt), slant = .12 + o.speed * .5;
          for (let i = 0; i < n; i++) {
            const d = drops[i]; d.y += d.v * dt * (1.6 + o.speed * 2); d.x += dt * .05; if (d.y > 1.05) { d.y = -.05; d.x = Math.random(); }
            const x = d.x * rc.width, y = d.y * rc.height; rg.moveTo(x, y); rg.lineTo(x - rc.height * d.l * slant, y + rc.height * d.l * (1 + o.speed));
          }
          rg.stroke();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, [gl]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" aria-hidden>
      {gl && <StoryCanvas small={small} />}
      {gl === false && <img ref={fallback} alt="" className="absolute left-0 top-0 max-w-none" decoding="async" />}
      <canvas ref={rain} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="stage-fog" />
    </div>
  );
}
