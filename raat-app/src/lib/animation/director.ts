// Pure functions that turn story progress into what the 3D world should look like.
// No Three.js here, so the timing can be read and tuned in one place.
import type { SceneId, Speaker } from '@/data/stories/last-passenger';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* ---------- layout (metres). The road runs along -z; the bus faces +z when it stops. ---------- */
export const BUS = { x: 1.6, w: 2.5, l: 11, h: 3.1, floor: .75, front: -12, aisle: 1.7 };
export const DOOR_Z = -13.0;
export const DRIVER = { x: .95, z: -12.9, head: 2.0 };
export const HERO_SEAT = { x: 2.25, z: -14.3, eye: 1.95 };
export const LAST_SEAT = { x: 2.35, z: -22.2 };
export const BEHIND_SEAT = { x: 1.0, z: -15.9 };

export type V3 = [number, number, number];
type Key = [number, V3, V3, number];

const SHOTS: Partial<Record<SceneId, Key[]>> = {
  open: [[0, [3, 1.65, 14], [2.8, 1.5, -40], 55], [1, [3, 1.65, 10], [2.8, 1.5, -40], 55]],
  highway: [
    [0, [3, 1.65, 10], [2.8, 1.5, -40], 55], [.45, [3.6, 1.6, 0], [4.6, .6, -8], 52], [.62, [3.9, 1.6, -4.5], [4.8, .6, -8.5], 50],
    [.76, [3.9, 1.62, -5], [2.0, 1.5, -60], 50], [1, [3.9, 1.62, -5], [1.8, 1.6, -80], 48],
  ],
  bus: [
    [0, [3.9, 1.62, -5], [1.6, 1.6, -80], 48], [.38, [3.9, 1.62, -5], [2.0, 1.8, -14], 50], [.5, [4.0, 1.65, -10.2], [2.85, 1.9, -13], 50],
    [.85, [3.7, 1.65, -12.4], [2.6, 2.0, -13], 50], [.95, [2.6, 2.3, -13], [1.7, 2.2, -14], 55], [1, [1.75, 2.35, -13.2], [1.7, 2.0, -23], 55],
  ],
  inside: [
    [0, [1.75, 2.35, -13.3], [1.9, 1.8, -23], 55], [.2, [1.75, 2.35, -13.5], [2.3, 1.7, -22.2], 45], [.27, [2.25, 1.95, -14.3], [1.6, 1.9, -4], 55],
    [.58, [2.25, 1.95, -14.3], [1.6, 1.9, -4], 55], [.66, [2.2, 1.95, -14.3], [1.0, 1.75, -15.9], 48], [.7, [2.25, 1.95, -14.3], [1.2, 1.9, -10], 55],
    [.745, [2.25, 1.95, -14.3], [1.2, 1.9, -10], 55], [.79, [2.2, 1.95, -14.3], [1.0, 1.85, -15.9], 40], [.89, [2.2, 1.95, -14.3], [1.0, 1.8, -15.9], 44],
    [.94, [2.2, 1.95, -14.3], [3.0, 1.9, -14.8], 55], [1, [2.2, 1.95, -14.3], [3.0, 1.9, -14.8], 55],
  ],
  driver: [
    [0, [2.0, 2.35, -13.9], [.95, 2.0, -12.9], 50], [.2, [1.6, 2.35, -13.6], [.95, 2.0, -12.9], 46], [.3, [1.5, 2.3, -13.4], [.95, 2.0, -12.9], 42],
    [.6, [1.5, 2.3, -13.4], [.95, 2.0, -12.9], 42], [.75, [1.25, 2.12, -13.25], [.95, 2.0, -12.9], 34], [.82, [1.25, 2.12, -13.25], [.95, 2.0, -12.9], 34],
    [.9, [1.6, 2.3, -13.4], [1.7, 1.9, -17.5], 48], [1, [1.6, 2.3, -13.4], [1.7, 1.9, -17.5], 48],
  ],
  encounter: [
    [0, [1.7, 2.3, -13.4], [1.7, 2.0, -17.5], 50], [.6, [1.7, 2.25, -12.6], [1.7, 2.1, -14.4], 56], [1, [1.7, 2.3, -12.8], [1.7, 2.1, -14.6], 52],
  ],
};

const TWIST_LOOK: Record<string, V3> = {
  kokila: [1.7, 2.15, -14.8], her: [1.7, 2.15, -14.8], driver: [.95, 2.0, -12.9], you: [1.3, 2.1, -14.2], nar: [1.3, 2.1, -14.2], big: [1.3, 2.1, -14.2], phone: [1.3, 2.1, -14.2],
};

function sample(keys: Key[], t: number): { pos: V3; tgt: V3; fov: number } {
  if (t <= keys[0][0]) return { pos: keys[0][1], tgt: keys[0][2], fov: keys[0][3] };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const k = smooth(range(t, a[0], b[0]));
      return {
        pos: [lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k), lerp(a[1][2], b[1][2], k)],
        tgt: [lerp(a[2][0], b[2][0], k), lerp(a[2][1], b[2][1], k), lerp(a[2][2], b[2][2], k)],
        fov: lerp(a[3], b[3], k),
      };
    }
  }
  const z = keys[keys.length - 1];
  return { pos: z[1], tgt: z[2], fov: z[3] };
}

export function cameraShot(scene: SceneId, t: number, speaker: Speaker | null) {
  if (scene === 'twist') {
    const door = t > .77 && t < .84;
    return { pos: [1.75, 2.3, -13.3] as V3, tgt: door ? ([2.9, 1.8, -13.0] as V3) : TWIST_LOOK[speaker ?? 'nar'], fov: 48, snap: true };
  }
  const keys = SHOTS[scene] ?? SHOTS.encounter!;
  return { ...sample(keys, t), snap: false };
}

export interface WorldState {
  busFront: number;
  busSpeed: number;
  door: number;
  roadSpeed: number;
  interior: number;
  outsideVisible: boolean;
  fog: number;
  engine: number;
  rpm: number;
  ghost: { visible: boolean; x: number; y: number; z: number; seated: boolean; look: boolean; headRot: number; sway: number };
  driverTurn: number;
  dread: number;
  shake: number;
  warm: number;
}

export function world(scene: SceneId, t: number, lookBacks: number): WorldState {
  const s: WorldState = {
    busFront: -400, busSpeed: 0, door: 0, roadSpeed: 0, interior: 1, outsideVisible: true, fog: .05, engine: 0, rpm: .2,
    ghost: { visible: false, x: LAST_SEAT.x, y: 0, z: LAST_SEAT.z, seated: true, look: false, headRot: 0, sway: .2 },
    driverTurn: 0, dread: .2, shake: 0, warm: 0,
  };
  switch (scene) {
    case 'open': s.fog = .06; s.dread = .25; break;
    case 'highway': {
      if (t > .78) { s.busFront = lerp(-330, -230, range(t, .78, 1)); s.engine = range(t, .78, 1) * .4; s.rpm = .5; s.busSpeed = 14; }
      s.dread = .2 + t * .2; break;
    }
    case 'bus': {
      const k = range(t, 0, .38); s.busFront = lerp(-230, BUS.front, easeOut(k)); s.busSpeed = (1 - k) * 18;
      s.engine = .45 + (1 - k) * .4; s.rpm = .25 + (1 - k) * .45; s.door = range(t, .42, .5); s.ghost.visible = true; s.dread = .35;
      if (t > .38) s.shake = Math.max(0, 1 - range(t, .38, .44)) * .6;
      break;
    }
    case 'inside': {
      s.busFront = BUS.front; s.door = 1 - range(t, .28, .33); const go = range(t, .31, .45); s.roadSpeed = go * 14; s.engine = .35 + go * .2; s.rpm = .25 + go * .3;
      s.ghost.visible = t < .85; s.dread = .4 + t * .35;
      if (t >= .6) {
        const closer = Math.min(lookBacks, 1) * .8;
        s.ghost.x = BEHIND_SEAT.x; s.ghost.z = BEHIND_SEAT.z + closer;
      }
      s.ghost.look = t >= .77;
      break;
    }
    case 'driver': {
      s.busFront = BUS.front; s.roadSpeed = 14; s.engine = .5; s.rpm = .5; s.driverTurn = smooth(range(t, .23, .3));
      s.interior = t > .59 && t < .85 ? .08 : 1; s.dread = .6 + t * .2;
      if (t > .86) { s.ghost = { visible: true, x: BUS.aisle, y: .3, z: -17.5, seated: false, look: false, headRot: 0, sway: .5 }; }
      break;
    }
    case 'encounter': {
      s.busFront = BUS.front; s.roadSpeed = 14; s.engine = .55; s.rpm = .55; s.driverTurn = 1; s.dread = 1;
      const steps = [-17.5, -16.6, -15.7, -15.0, -14.4];
      const idx = t < .15 ? 0 : t < .3 ? 1 : t < .47 ? 2 : t < .6 ? 3 : 4;
      s.ghost = { visible: true, x: BUS.aisle, y: .3, z: steps[idx], seated: false, look: t > .62, headRot: t < .62 ? smooth(range(t, .15, .58)) * 2.7 : 0, sway: 1.2 };
      s.shake = t < .66 ? .25 + range(t, 0, .6) * .35 : t < .93 ? .12 : 0;
      if (t > .93) s.engine = .3;
      break;
    }
    case 'twist': {
      s.busFront = BUS.front; s.driverTurn = 1; s.dread = 0; s.warm = 1;
      const stop = range(t, .7, .77); s.roadSpeed = (1 - stop) * 10; s.engine = .3 - stop * .2; s.rpm = .3 - stop * .2;
      s.door = range(t, .77, .8); s.outsideVisible = t < .77; s.fog = t < .77 ? .03 : .3;
      s.ghost = { visible: true, x: BUS.aisle, y: .12, z: -14.8, seated: false, look: true, headRot: 0, sway: .25 };
      break;
    }
    default: {
      s.busFront = BUS.front; s.outsideVisible = false; s.fog = .3; s.interior = 0; s.dread = 0; break;
    }
  }
  return s;
}
