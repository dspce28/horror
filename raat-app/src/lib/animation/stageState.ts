'use client';
// Per-frame stage state shared by the 3D world and the DOM overlays (rain, fallback image).
// tick() is called once per frame by whichever renderer owns the stage.
import { SCENES, cueAt } from '@/data/stories/last-passenger';
import { frameAt, imageFor, type Frame } from './director';
import { events, live, store } from '@/lib/store';
import { visualGender } from '@/lib/gender';

/** Part 2 photographs live in /assets/part2/<place>/ */
const P2_DIR: Record<string, string> = {
  'p2-highway-after-bus': 'highway', 'p2-highway-distant-light': 'highway', 'p2-crossroads-wide': 'crossroads', 'p2-black-doll-closeup': 'doll',
  'p2-haveli-entrance': 'haveli', 'p2-banyan-courtyard': 'banyan', 'p2-construction-building': 'construction', 'p2-ritual-house': 'abandoned-house',
  'p2-lane-run': 'transitions', 'p2-lane-run-2': 'transitions',
};
const base = (name: string) => (P2_DIR[name] ? `/assets/part2/${P2_DIR[name]}/${name}` : `/raat/scenes/${name}`);
export const sceneUrl = (name: string, small: boolean, kind: '' | 'depth' = '') =>
  kind === 'depth' ? `${base(name)}-d.webp` : `${base(name)}${small ? '-m' : ''}.webp`;

const GLITCHY = new Set(['teleport', 'flicker-out', 'jumpscare', 'lights-die', 'shriek', 'blackout', 'driver-turn', 'stare', 'her-look']);

export interface StageOut {
  frame: Frame;
  cur: string | null; prev: string | null;
  mix: number; flicker: number; light: number; glitch: number; speed: number;
  shakeX: number; shakeY: number;
}

let cur: string | null = null, prev: string | null = null, cutAt = 0;
let dipUntil = 0, nextDip = 0, glitch = 0, speed = 0;
let wired = false;
// the camera eases toward each frame's framing and focus; a cut snaps it
const cam = { x: .5, y: .5, zoom: 1, fx: .5, fy: .5, shot: '' };

export const stage: { out: StageOut | null; small: boolean } = { out: null, small: false };

/** where {N}'s name sits on screen (CSS pixels), projected from the doll each frame; the name itself is real text */
export const anchors = { name: { x: 0, y: 0, px: 0, rot: 0, amt: 0 } };

export function tick(realNow: number, dt: number): StageOut {
  const now = live.override?.clock ?? realNow; // the prototype can drive its own clock (frame-exact capture)
  if (!wired) { wired = true; events.on((id) => { if (GLITCHY.has(id)) glitch = 1; }); }
  const s = store.get();
  const sc = SCENES[live.sceneIndex];
  const cue = cueAt(sc, live.local);
  const f = live.override ? frameAt(live.override.scene, live.override.t, null) : frameAt(sc.id, live.local, cue ? cue.who : null);
  const name = imageFor(f.img, visualGender(s.gender, s.name));
  if (name !== cur) { prev = cur; cur = name; cutAt = now; if (f.flicker === 2) glitch = Math.max(glitch, .3); } // cuts are clean; only failing lights dip
  const snap = !cam.shot || (f.shot !== cam.shot && !f.glide) || s.reduced;
  const k = snap ? 1 : 1 - Math.exp(-dt * (f.glide ? 1.6 : 4));
  cam.x += (f.x - cam.x) * k; cam.y += (f.y - cam.y) * k; cam.zoom += (f.zoom - cam.zoom) * k;
  cam.fx += (f.fx - cam.fx) * (snap ? 1 : 1 - Math.exp(-dt * 1.6)); cam.fy += (f.fy - cam.fy) * (snap ? 1 : 1 - Math.exp(-dt * 1.6));
  cam.shot = f.shot;
  const fr = { ...f, x: cam.x, y: cam.y, zoom: cam.zoom, fx: cam.fx, fy: cam.fy };
  const mix = Math.min(1, Math.max(0, (now - cutAt) / 520));

  let fl = 1;
  if (f.flicker) {
    // real tube lights: mostly steady; now and then a stutter (two or three quick dips); dying lights stutter often
    if (now > nextDip) {
      const burst = f.flicker === 2 ? 1 : (Math.random() < .5 ? 2 : 3);
      dipUntil = now + 50 + Math.random() * 90 + (burst - 1) * 140;
      nextDip = now + (f.flicker === 2 ? 600 + Math.random() * 1600 : 7000 + Math.random() * 9000);
    }
    if (now < dipUntil) fl = (Math.floor((dipUntil - now) / 70) % 2 === 0) ? (f.flicker === 2 ? .15 + Math.random() * .2 : .45 + Math.random() * .2) : .92;
  }
  if (s.reduced) fl = Math.max(.7, fl);
  live.flicker = fl;

  const v = Math.min(1, Math.abs(live.velocity) / 2600);
  speed += (v - speed) * Math.min(1, dt * (v > speed ? 10 : 3));
  live.velocity *= .9;
  glitch = Math.max(0, glitch - dt * 2.6);
  live.shake = Math.max(0, live.shake - dt * 1.4);
  const stride = f.run && !s.reduced ? Math.abs(Math.sin(now / 170)) * .5 : 0; // footfalls while running
  const sh = s.reduced ? 0 : f.shake * (.6 + Math.random() * .4) + live.shake + stride;

  const out: StageOut = {
    frame: fr, cur, prev, mix, flicker: fl, light: f.light * fl,
    glitch: s.reduced || s.safe ? glitch * .3 : glitch, speed: s.reduced ? speed * .3 : speed,
    shakeX: (Math.random() - .5) * sh, shakeY: (Math.random() - .5) * sh,
  };
  stage.out = out;
  return out;
}
