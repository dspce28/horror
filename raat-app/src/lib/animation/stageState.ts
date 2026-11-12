'use client';
// Per-frame stage state shared by the 3D world and the DOM overlays (rain, fallback image).
// tick() is called once per frame by whichever renderer owns the stage.
import { SCENES, cueAt } from '@/data/stories/last-passenger';
import { frameAt, imageFor, type Frame } from './director';
import { events, live, store } from '@/lib/store';

export const sceneUrl = (name: string, small: boolean, kind: '' | 'depth' = '') =>
  kind === 'depth' ? `/raat/scenes/${name}-d.webp` : `/raat/scenes/${name}${small ? '-m' : ''}.webp`;

const GLITCHY = new Set(['teleport', 'flicker-out', 'jumpscare', 'crack', 'shriek', 'blackout', 'driver-turn', 'stare', 'her-look']);

export interface StageOut {
  frame: Frame;
  cur: string | null; prev: string | null;
  mix: number; flicker: number; light: number; glitch: number; speed: number;
  shakeX: number; shakeY: number;
}

let cur: string | null = null, prev: string | null = null, cutAt = 0;
let dipUntil = 0, nextDip = 0, nextRandom = 0, glitch = 0, speed = 0;
let wired = false;

export const stage: { out: StageOut | null; small: boolean } = { out: null, small: false };

export function tick(now: number, dt: number): StageOut {
  if (!wired) { wired = true; events.on((id) => { if (GLITCHY.has(id)) glitch = 1; }); }
  const s = store.get();
  const sc = SCENES[live.sceneIndex];
  const cue = cueAt(sc, live.local);
  const f = frameAt(sc.id, live.local, cue ? cue.who : null);
  const name = imageFor(f.img, s.gender);
  if (name !== cur) { prev = cur; cur = name; cutAt = now; glitch = Math.max(glitch, f.flicker ? .9 : .45); }
  const mix = Math.min(1, (now - cutAt) / 520);

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
    frame: f, cur, prev, mix, flicker: fl, light: f.light * fl,
    glitch: s.reduced || s.safe ? glitch * .3 : glitch, speed: s.reduced ? speed * .3 : speed,
    shakeX: (Math.random() - .5) * sh, shakeY: (Math.random() - .5) * sh,
  };
  stage.out = out;
  return out;
}
