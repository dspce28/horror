'use client';
import { useEffect, useRef } from 'react';
import { SCENES, cueAt } from '@/data/stories/last-passenger';
import { frameAt, imageFor } from '@/lib/animation/director';
import { events, live, store, useStore } from '@/lib/store';
import { GLStage } from '@/lib/gl/stage';

const src = (name: string, small: boolean) => `/raat/scenes/${name}${small ? '-m' : ''}.webp`;
const GLITCHY = new Set(['teleport', 'flicker-out', 'jumpscare', 'crack', 'shriek', 'blackout', 'driver-turn', 'stare', 'her-look']);

/**
 * The film: real photographs moved by the scroll like a camera, seen through a lens that
 * bends and splits colour when you scroll fast, glitches on cuts, flickers and shakes.
 */
export default function PhotoStage() {
  const gender = useStore((s) => s.gender);
  const scene = useStore((s) => s.sceneIndex);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLImageElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const rain = useRef<HTMLCanvasElement>(null);
  const stage = useRef<GLStage | null>(null);

  // warm the cache for this scene and the next
  useEffect(() => {
    const small = window.innerWidth < 900;
    [scene, scene + 1].forEach((i) => {
      const s = SCENES[i]; if (!s) return;
      for (let t = 0; t <= 1; t += .02) {
        const n = imageFor(frameAt(s.id, t, null).img, gender); if (!n) continue;
        if (stage.current) stage.current.preload(src(n, small)); else { const im = new Image(); im.src = src(n, small); }
      }
    });
  }, [scene, gender]);

  useEffect(() => {
    const small = window.innerWidth < 900;
    const gls = canvas.current ? GLStage.create(canvas.current) : null;
    stage.current = gls;
    if (!gls && canvas.current) canvas.current.style.display = 'none';
    let glitch = 0, speed = 0;
    const off = events.on((id) => { if (GLITCHY.has(id)) glitch = 1; });

    let raf = 0, cur: string | null = null, prev: string | null = null, cutAt = 0;
    let dipUntil = 0, nextDip = 0, nextRandom = 0;
    const drops = Array.from({ length: small ? 90 : 180 }, () => ({ x: Math.random(), y: Math.random(), l: .02 + Math.random() * .04, v: .9 + Math.random() * .8 }));
    const rc = rain.current!, rg = rc.getContext('2d')!;
    const dpr = Math.min(small ? 1.5 : 1.75, devicePixelRatio || 1);
    const size = () => { rc.width = innerWidth * Math.min(1.5, dpr); rc.height = innerHeight * Math.min(1.5, dpr); };
    size(); addEventListener('resize', size);
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const s = store.get();
      const sc = SCENES[live.sceneIndex];
      const cue = cueAt(sc, live.local);
      const f = frameAt(sc.id, live.local, cue ? cue.who : null);
      const name = imageFor(f.img, s.gender);
      const url = name ? src(name, small) : null;
      if (url !== cur) { prev = cur; cur = url; cutAt = now; glitch = Math.max(glitch, f.flicker ? .9 : .45); }
      const mix = Math.min(1, (now - cutAt) / 520);

      // flicker
      let fl = 1;
      if (f.flicker) {
        if (now > nextDip) { dipUntil = now + 40 + Math.random() * (f.flicker === 2 ? 220 : 120); nextDip = now + (f.flicker === 2 ? 150 + Math.random() * 600 : 1500 + Math.random() * 3500); }
        if (now < dipUntil) fl = f.flicker === 2 ? Math.random() * .35 : .35 + Math.random() * .25;
        if (now > nextRandom) { nextRandom = now + 4000 + Math.random() * 7000; if (Math.random() < (f.flicker === 2 ? .8 : .35)) glitch = Math.max(glitch, .5); }
      }
      if (s.reduced) fl = Math.max(.7, fl);
      live.flicker = fl;

      // scroll speed bends the lens
      const v = Math.min(1, Math.abs(live.velocity) / 2600);
      speed += (v - speed) * Math.min(1, dt * (v > speed ? 10 : 3));
      live.velocity *= .9;
      glitch = Math.max(0, glitch - dt * 2.6);

      // camera: cover-fit the 16:9 photo and frame the focus point; phones pan to it
      const par = s.reduced ? 0 : 1;
      live.shake = Math.max(0, live.shake - dt * 1.4);
      const sh = s.reduced ? 0 : (f.shake * (.6 + Math.random() * .4) + live.shake) * 6;
      const px = Math.max(-28, Math.min(28, -live.pointer.x * 14 * par + (Math.random() - .5) * sh));
      const py = Math.max(-20, Math.min(20, -live.pointer.y * 9 * par + (Math.random() - .5) * sh));
      const W = innerWidth, H = innerHeight, A = 1672 / 941;
      let ih = Math.max(H, W / A) * f.zoom, iw = ih * A;
      const m = Math.max(1, (W + 60) / iw, (H + 44) / ih); iw *= m; ih *= m;
      let left = W / 2 - f.x * iw, top = H / 2 - f.y * ih;
      left = Math.min(-30, Math.max(W - iw + 30, left)) + px; top = Math.min(-22, Math.max(H - ih + 22, top)) + py;

      const light = f.light * fl;
      if (gls) {
        const k = dpr;
        const rect: [number, number, number, number] = [left * k, top * k, iw * k, ih * k];
        gls.draw({ a: cur, b: prev, mix, rectA: rect, rectB: rect, speed: s.reduced ? speed * .3 : speed, glitch: s.reduced || s.safe ? glitch * .3 : glitch, light, warm: f.warm ? 1 : 0, lens: 1, reduced: s.reduced, time: now / 1000 }, Math.round(W * k), Math.round(H * k));
      } else if (fallback.current) {
        const im = fallback.current;
        if (url && im.getAttribute('src') !== url) im.src = url;
        im.style.visibility = url ? 'visible' : 'hidden';
        im.style.width = `${iw}px`; im.style.height = `${ih}px`; im.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        im.style.filter = `brightness(${light.toFixed(3)})${f.warm ? ' sepia(.18)' : ''}`;
      }

      // headlights through the fog, placed in image space
      if (glow.current) {
        if (f.glow) {
          const r = 4 + f.glowAmt * 26;
          glow.current.style.left = `${left + f.glow[0] * iw}px`; glow.current.style.top = `${top + f.glow[1] * ih}px`;
          glow.current.style.width = glow.current.style.height = `${r}vmax`;
          glow.current.style.opacity = String(.25 + f.glowAmt * .6 + Math.sin(now / 90) * .03);
        } else glow.current.style.opacity = '0';
      }

      // rain streaks, slanting more as you scroll
      rg.clearRect(0, 0, rc.width, rc.height);
      const amt = s.reduced ? f.rain * .4 : f.rain;
      if (amt > 0) {
        rg.strokeStyle = 'rgba(210,215,220,.22)'; rg.lineWidth = 1; rg.beginPath();
        const n = Math.round(drops.length * amt), slant = .12 + speed * .5;
        for (let i = 0; i < n; i++) {
          const d = drops[i]; d.y += d.v * dt * (1.6 + speed * 2); d.x += dt * .05; if (d.y > 1.05) { d.y = -.05; d.x = Math.random(); }
          const x = d.x * rc.width, y = d.y * rc.height; rg.moveTo(x, y); rg.lineTo(x - rc.height * d.l * slant, y + rc.height * d.l * (1 + speed));
        }
        rg.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); off(); gls?.dispose(); stage.current = null; };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" aria-hidden>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <img ref={fallback} alt="" className="absolute left-0 top-0 max-w-none" decoding="async" />
      <div ref={glow} className="stage-glow" />
      <canvas ref={rain} className="absolute inset-0 h-full w-full" />
      <div className="stage-fog" />
    </div>
  );
}
