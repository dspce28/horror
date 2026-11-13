'use client';
// Per-frame stage state shared by the 3D world and the DOM overlays (rain, fallback image).
// tick() is called once per frame by whichever renderer owns the stage.
import { SCENES, cueAt } from '@/data/stories/last-passenger';
import { frameAt, imageFor, type Frame } from './director';
import { events, live, store } from '@/lib/store';

export const sceneUrl = (name: string, small: boolean, kind: '' | 'depth' = '') =>
  kind === 'depth' ? `/raat/scenes/${name}-d.webp` : `/raat/scenes/${name}${small ? '-m' : ''}.webp`;

const GLITCHY = new Set(['teleport', 'flicker-out', 'jumpscare', 'lights-die', 'shriek', 'blackout', 'driver-turn', 'stare', 'her-look']);

export interface StageOut {
  frame: Frame;
  cur: string | null; prev: string | null;
  mix: number; flicker: number; light: number; glitch: number; speed: number;
  shakeX: number; shakeY: number;
}

let cur: string | null = null, prev: string | null = null, cutAt = 0;
let dipUntil = 0, nextDip = 0, nextRandom = 0, glitch = 0, speed = 0;
let wired = false;
// the camera eases toward each frame's framing and focus; a cut snaps it
const cam = { x: .5, y: .5, zoom: 1, fx: .5, fy: .5, shot: '' };

export const stage: { out: StageOut | null; small: boolean } = { out: null, small: false };

export function tick(realNow: number, dt: number): StageOut {
  const now = live.override?.clock ?? realNow; // the prototype can drive its own clock (frame-exact capture)
  if (!wired) { wired = true; events.on((id) => { if (GLITCHY.has(id)) glitch = 1; }); }
  const s = store.get();
  const sc = SCENES[live.sceneIndex];
  const cue = cueAt(sc, live.local);
  const f = live.override ? frameAt(live.override.scene, live.override.t, null) : frameAt(sc.id, live.local, cue ? cue.who : null);
  const name = imageFor(f.img, s.gender);
  if (name !== cur) { prev = cur; cur = name; cutAt = now; glitch = Math.max(glitch, f.flicker ? .9 : .45); }
  const snap = !cam.shot || (f.shot !== cam.shot && !f.glide) || s.reduced;
  const k = snap ? 1 : 1 - Math.exp(-dt * (f.glide ? 1.6 : 4));
  cam.x += (f.x - cam.x) * k; cam.y += (f.y - cam.y) * k; cam.zoom += (f.zoom - cam.zoom) * k;
  cam.fx += (f.fx - cam.fx) * (snap ? 1 : 1 - Math.exp(-dt * 1.6)); cam.fy += (f.fy - cam.fy) * (snap ? 1 : 1 - Math.exp(-dt * 1.6));
  cam.shot = f.shot;
  const fr = { ...f, x: cam.x, y: cam.y, zoom: cam.zoom, fx: cam.fx, fy: cam.fy };
  const mix = Math.min(1, Math.max(0, (now - cutAt) / 520));

  let fl = 1;
  if (f.flicker) {
    if (now > nextDip) { dipUntil = now + 40 + Math.random() * (f.flicker === 2 ? 220 : 120); nextDip = now + (f.flicker === 2 ? 150 + Math.random() * 600 : 1500 + Math.random() * 3500); }
    if (now < dipUntil) fl = f.flicker === 2 ? Math.random() * .35 : .35 + Math.random() * .25;
    if (now > nextRandom) { nextRandom = now + 4000 + Math.random() * 7000; if (Math.random() < (f.flicker === 2 ? .8 : .35)) glitch = Math.max(glitch, .5); }
  }
  if (s.reduced) fl = Math.max(.7, fl);
  live.flicker = fl;

  const v = Math.min(1, Math.abs(live.velocity) / 2600);
  speed += (v - speed) * Math.min(1, dt * (v > speed ? 10 : 3));
  live.velocity *= .9;
  glitch = Math.max(0, glitch - dt * 2.6);
  live.shake = Math.max(0, live.shake - dt * 1.4);
  const sh = s.reduced ? 0 : f.shake * (.6 + Math.random() * .4) + live.shake;

  const out: StageOut = {
    frame: fr, cur, prev, mix, flicker: fl, light: f.light * fl,
    glitch: s.reduced || s.safe ? glitch * .3 : glitch, speed: s.reduced ? speed * .3 : speed,
    shakeX: (Math.random() - .5) * sh, shakeY: (Math.random() - .5) * sh,
  };
  stage.out = out;
  return out;
}
