'use client';
import { useEffect, useRef } from 'react';
import { SCENES, cueAt } from '@/data/stories/last-passenger';
import { frameAt, imageFor, type ImgId } from '@/lib/animation/director';
import { live, store, useStore } from '@/lib/store';

const src = (name: string, small: boolean) => `/raat/scenes/${name}${small ? '-m' : ''}.webp`;

/**
 * The film itself: real photographs moved by the scroll like a camera
 * (push-ins, drifts, cuts), with parallax, rain, flicker and shake on top.
 */
export default function PhotoStage() {
  const gender = useStore((s) => s.gender);
  const scene = useStore((s) => s.sceneIndex);
  const box = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLImageElement>(null);
  const b = useRef<HTMLImageElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const rain = useRef<HTMLCanvasElement>(null);

  // warm the cache for this scene and the next
  useEffect(() => {
    const small = window.innerWidth < 900;
    [scene, scene + 1].forEach((i) => {
      const s = SCENES[i]; if (!s) return;
      for (let t = 0; t <= 1; t += .02) { const f = frameAt(s.id, t, null); const n = imageFor(f.img, gender); if (n) { const im = new Image(); im.src = src(n, small); } }
    });
  }, [scene, gender]);

  useEffect(() => {
    const small = window.innerWidth < 900;
    let raf = 0, cur: ImgId | null = null, front = a.current!, back = b.current!;
    let dipUntil = 0, nextDip = 0;
    const drops = Array.from({ length: small ? 90 : 180 }, () => ({ x: Math.random(), y: Math.random(), l: .02 + Math.random() * .04, v: .9 + Math.random() * .8 }));
    const rc = rain.current!, rg = rc.getContext('2d')!;
    const size = () => { const d = Math.min(1.5, devicePixelRatio || 1); rc.width = innerWidth * d; rc.height = innerHeight * d; };
    size(); addEventListener('resize', size);
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const s = store.get();
      const sc = SCENES[live.sceneIndex];
      const cue = cueAt(sc, live.local);
      const f = frameAt(sc.id, live.local, cue ? cue.who : null);

      // cut or cross-fade when the shot's image changes
      if (f.img !== cur) {
        const name = imageFor(f.img, s.gender);
        [front, back] = [back, front];
        if (name) front.src = src(name, small); else front.removeAttribute('src');
        front.style.visibility = name ? 'visible' : 'hidden';
        cur = f.img;
      }
      front.style.opacity = String(f.mix);
      back.style.opacity = String(f.prev ? 1 - f.mix : 0);
      front.style.zIndex = '2'; back.style.zIndex = '1';

      // tube-light flicker
      let fl = 1;
      if (f.flicker) {
        if (now > nextDip) { dipUntil = now + 40 + Math.random() * (f.flicker === 2 ? 220 : 120); nextDip = now + (f.flicker === 2 ? 150 + Math.random() * 600 : 1500 + Math.random() * 3500); }
        if (now < dipUntil) fl = f.flicker === 2 ? Math.random() * .35 : .35 + Math.random() * .25;
      }
      if (s.reduced) fl = Math.max(.7, fl);
      live.flicker = fl;

      // camera: drift to the focus point, follow the pointer, shake on impacts
      const par = s.reduced ? 0 : 1;
      live.shake = Math.max(0, live.shake - dt * 1.4);
      const sh = s.reduced ? 0 : (f.shake * (.6 + Math.random() * .4) + live.shake) * 6;
      const px = Math.max(-28, Math.min(28, -live.pointer.x * 14 * par + (Math.random() - .5) * sh));
      const py = Math.max(-20, Math.min(20, -live.pointer.y * 9 * par + (Math.random() - .5) * sh));
      // fit the 16:9 photo to cover the screen, then frame the focus point (phones pan to it)
      const el = box.current!, W = innerWidth, H = innerHeight, A = 1672 / 941;
      let ih = Math.max(H, W / A) * f.zoom, iw = ih * A;
      const m = Math.max(1, (W + 60) / iw, (H + 44) / ih); iw *= m; ih *= m; // spare edge for parallax and shake
      let left = W / 2 - f.x * iw, top = H / 2 - f.y * ih;
      left = Math.min(-30, Math.max(W - iw + 30, left)); top = Math.min(-22, Math.max(H - ih + 22, top));
      el.style.width = `${iw}px`; el.style.height = `${ih}px`;
      el.style.transform = `translate3d(${(left + px).toFixed(1)}px, ${(top + py).toFixed(1)}px, 0)`;
      const light = f.light * fl;
      el.style.filter = `brightness(${light.toFixed(3)})${f.warm ? ' sepia(.18) saturate(1.1)' : ''}`;

      // headlights through the fog
      if (glow.current) {
        if (f.glow) {
          const r = 4 + f.glowAmt * 26;
          glow.current.style.left = `${f.glow[0] * 100}%`; glow.current.style.top = `${f.glow[1] * 100}%`;
          glow.current.style.width = glow.current.style.height = `${r}vmax`;
          glow.current.style.opacity = String(.25 + f.glowAmt * .6 + Math.sin(now / 90) * .03);
        } else glow.current.style.opacity = '0';
      }

      // rain streaks
      rg.clearRect(0, 0, rc.width, rc.height);
      const amt = s.reduced ? f.rain * .4 : f.rain;
      if (amt > 0) {
        rg.strokeStyle = 'rgba(210,215,220,.22)'; rg.lineWidth = 1; rg.beginPath();
        const n = Math.round(drops.length * amt);
        for (let i = 0; i < n; i++) {
          const d = drops[i]; d.y += d.v * dt * 1.6; d.x += dt * .05; if (d.y > 1.05) { d.y = -.05; d.x = Math.random(); }
          const x = d.x * rc.width, y = d.y * rc.height; rg.moveTo(x, y); rg.lineTo(x - rc.height * d.l * .12, y + rc.height * d.l);
        }
        rg.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" aria-hidden>
      <div ref={box} className="stage-box absolute left-0 top-0 will-change-transform">
        <img ref={a} alt="" className="stage-img" decoding="async" />
        <img ref={b} alt="" className="stage-img" decoding="async" />
        <div ref={glow} className="stage-glow" />
      </div>
      <canvas ref={rain} className="absolute inset-0 h-full w-full" />
      <div className="stage-fog" />
    </div>
  );
}
