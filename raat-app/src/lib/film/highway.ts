// Milestone 1 film: the highway, the visitor, the bus. Pure timing and geometry, in seconds and metres.
// The road runs along -z. The camera starts in the middle of it and drifts towards the left verge.
import type { Key } from '@/data/translations';
import { clamp, easeOut, lerp, range, smooth } from '@/lib/animation/director';

export const LENGTH = 44;

/** where things stand in the world */
export const WORLD = {
  roadWidth: 8,
  hero: { x: 4.7, z: -64, h: 1.85 },           // the visitor, on the verge the oncoming bus keeps to (traffic keeps left)
  busLane: 1.9,                                 // the bus comes down the near lane and stops by the visitor
  busStopZ: -78,
  busFarZ: -430,
  busHeight: 3.4,
  lampEvery: 42,
};

export type V3 = [number, number, number];

/** camera position and the point it looks at, per second */
export function cameraAt(t: number, portrait: boolean): { pos: V3; look: V3; fov: number } {
  const h = WORLD.hero;
  const fov = portrait ? 64 : 44;
  // 5–20 s: a long, slowing dolly down the road
  const d = easeOut(range(t, 4.5, 21));
  const z = lerp(8, h.z + 16, d);
  const x = lerp(-.6, 1.6, smooth(range(t, 9, 21)));
  const sway = Math.sin(t * .7) * .05;
  let pos: V3 = [x + sway, 1.55 + Math.sin(t * 1.3) * .02, z];
  let look: V3 = [lerp(0, 1.2, range(t, 6, 18)), 1.3, z - 40];
  // 20–28 s: turn to the visitor and walk closer
  const turn = smooth(range(t, 19, 23.5));
  const close = smooth(range(t, 21, 27.5));
  const heroLook: V3 = [h.x - .15, 1.15, h.z];
  pos = [lerp(pos[0], h.x - 1.9, close), lerp(pos[1], 1.45, close), lerp(pos[2], h.z + 3.3, close)];
  look = [lerp(look[0], heroLook[0], turn), lerp(look[1], heroLook[1], turn), lerp(look[2], heroLook[2], turn)];
  // 28–37 s: look back down the road as the headlights appear, then at the bus
  const back = smooth(range(t, 28, 31));
  const roadLook: V3 = [WORLD.busLane, 1.6, h.z - 120];
  look = [lerp(look[0], roadLook[0], back), lerp(look[1], roadLook[1], back), lerp(look[2], roadLook[2], back)];
  const toBus = smooth(range(t, 34, 37.5));
  const busZ = busAt(t).z;
  look = [lerp(look[0], WORLD.busLane, toBus), lerp(look[1], 1.9, toBus), lerp(look[2], busZ, toBus)];
  pos = [lerp(pos[0], h.x - 1.6, toBus), pos[1], lerp(pos[2], h.z + 1.5, toBus)];
  return { pos, look, fov };
}

/** the bus: far away until 28 s, slows, stops at 36 s */
export function busAt(t: number): { z: number; lights: number; visible: boolean; braking: number } {
  const k = range(t, 27.5, 36);
  const z = lerp(WORLD.busFarZ, WORLD.busStopZ, 1 - Math.pow(1 - k, 2.6));
  return { z, lights: clamp(range(t, 26.5, 30) * 1.1), visible: t > 26.5, braking: range(t, 34.4, 36.2) };
}

/** the last shot: a cut to the bus's door */
export const DOOR_SHOT = { from: 38.6, to: 45 };

export interface Line { from: number; to: number; k: Key; kind: 'title' | 'intro' | 'nar' | 'you' | 'driver' | 'time' }
export const LINES: Line[] = [
  { from: .8, to: 4.9, k: 'w2', kind: 'title' },
  { from: 9.0, to: 12.0, k: 'h2', kind: 'time' },
  { from: 22.6, to: 26.8, k: 'h1', kind: 'intro' },
  { from: 29.4, to: 32.6, k: 'h9', kind: 'nar' },
  { from: 36.6, to: 38.4, k: 'b2', kind: 'you' },
  { from: 39.8, to: 43.4, k: 'b3', kind: 'driver' },
];

/** the phone in the visitor's hand lights up and becomes a message on screen */
export const PHONE = { from: 25.2, to: 28.6 };

export type CueId = 'breath' | 'wind' | 'bark' | 'ping' | 'engine' | 'brake' | 'stop' | 'door' | 'steps';
export const CUES: [number, CueId][] = [
  [.3, 'breath'], [5, 'wind'], [14.5, 'bark'], [25.3, 'ping'], [27, 'engine'], [34.4, 'brake'], [36, 'stop'], [38.8, 'door'], [41.6, 'steps'],
];

/* ================= Part 2 on the same road (film time 100+) ================= */
export const P2 = { start: 100, call: [100, 112] as [number, number], ret: [120, 135] as [number, number], pump: [135, 150] as [number, number] };
/** the petrol pump: just past the place the bike stopped, on the same verge, hidden in Part 1's fog */
export const PUMP = { x: 10.6, z: -82, w: 7, d: 9, h: 5.2 };
export const BIKE = { x: WORLD.hero.x, z: WORLD.hero.z };
/** the attendant walks from the dispenser to the bike */
export function attendantAt(t: number): { x: number; z: number; visible: boolean } {
  const k = smooth(range(t, 143.4, 146.2));
  return { x: lerp(PUMP.x - 1.6, BIKE.x + .9, k), z: lerp(PUMP.z + 1.5, BIKE.z - .6, k), visible: t > 136 };
}
/** Part 2's camera: first person, at eye height, walking (a gentle bob) */
export function cameraP2(t: number, portrait: boolean): { pos: V3; look: V3; fov: number } {
  const h = WORLD.hero, fov = portrait ? 64 : 46;
  const bob = (moving: number) => Math.sin(t * 6.2) * .035 * moving;
  if (t < 116) {
    // where the bus vanished: hold on the empty road (the call), then walk away down it
    const walk = smooth(range(t, 103.5, 112)), z = lerp(h.z + 1, h.z - 34, walk);
    const x = lerp(h.x - 1.6, 1.4, smooth(range(t, 103.5, 108)));
    return { pos: [x, 1.6 + bob(walk > 0 && walk < 1 ? 1 : 0), z], look: [lerp(WORLD.busLane, x * .6, walk), 1.55, z - 60], fov };
  }
  if (t < 135) {
    // coming back towards it from far down the road: the same lamps; a dim light ahead
    const k = range(t, 120, 135), z = lerp(-340, -150, smooth(k));
    return { pos: [2.6, 1.6 + bob(1), z], look: [3.4, 1.5, z + 60], fov };
  }
  // the pump: walk in under the canopy, look around, then at the bike
  const inK = smooth(range(t, 135, 139.5));
  // stop at the edge of the forecourt, between the pillars, under the light
  const z = lerp(-150, PUMP.z - 7.5, inK), x = lerp(2.6, PUMP.x - 4.2, inK);
  let look: V3 = [lerp(3.4, PUMP.x, inK), lerp(1.5, 2.2, inK), z + 30];
  const around = smooth(range(t, 139, 141.2));
  look = [lerp(look[0], PUMP.x + 2, around), lerp(look[1], 1.6, around), lerp(look[2], PUMP.z + 4, around)];
  const toBike = smooth(range(t, 141.2, 143.2));
  look = [lerp(look[0], BIKE.x, toBike), lerp(look[1], .9, toBike), lerp(look[2], BIKE.z, toBike)];
  // closer: the tank
  const near = smooth(range(t, 143.4, 148.5));
  const pos: V3 = [lerp(x, BIKE.x - 1.2, near), lerp(1.6, 1.25, near), lerp(z, BIKE.z - 3.2, near)];
  return { pos, look, fov: lerp(fov, portrait ? 50 : 34, near) };
}
