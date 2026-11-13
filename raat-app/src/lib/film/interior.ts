// The bus interior, driven by the 'inside' scene's scroll progress (0–1).
// The camera sits at the origin: looking down -z is the back of the bus, +z is the driver's cabin.
import { clamp, lerp, range, smooth } from '@/lib/animation/director';

export type GhostPose = 'none' | 'hair' | 'behind' | 'look' | 'aisleFar' | 'aisleNear';
export type InteriorMode = 'board' | 'inside';

export interface InteriorFrame {
  yaw: number;          // 0 = facing the back, PI = facing the cabin
  pitch: number;
  dolly: number;        // metres down the aisle
  height: number;       // eye height offset (sitting down lowers it)
  fov: number;
  ghost: GhostPose;
  ghostAlpha: number;
  flicker: 0 | 1 | 2;
  moving: number;       // 0 parked … 1 driving (passing lights)
  turnSpeed: number;    // for the lens
  flash: number;        // the doorway's light, fading as the eyes adjust
  ghostDim: number;     // 1 = seen plainly, lower = only a silhouette
  driver: boolean;      // the driver's cut-out sits in his seat
  reflect: number;      // her reflection in the side window, 0–1 (the seat itself stays empty)
}

const turn = (t: number, a: number, b: number, from: number, to: number) => lerp(from, to, smooth(range(t, a, b)));
// a whip pan: the camera holds, then the whole turn happens in the middle third (motion blur hides the in-between)
const whip = (t: number, a: number, b: number, from: number, to: number) => turn(t, a + (b - a) * .35, b - (b - a) * .35, from, to);

/**
 * The last passenger, revealed a little at a time (scene progress t 0–1):
 *   .00 walking in, facing the back: the last seat is empty, its cushion pressed down
 *   .30 sit, face the front
 *   .38 in the dark side window: her reflection, sitting at the back (the seat behind is still empty)
 *   .50 her whisper, {N}'s name, from behind · .67 "Don't look behind you…"
 *   .72 a slow turn back: at the far end of the aisle, a silhouette
 *   .84 the lights stutter; when they steady she is closer (a seat away) · .90 she lifts her head (standing)
 *   .92 a whisper behind the right ear
 */
export function interiorAt(t: number, lookBacks: number): InteriorFrame {
  let yaw = 0;
  yaw = turn(t, .3, .37, 0, Math.PI);                                  // sit down, face the front
  if (t > .72) yaw = turn(t, .72, .8, Math.PI, Math.PI * 2);           // ...and turn back, slowly
  if (t > .92) yaw = Math.PI * 2 + turn(t, .92, .935, 0, -.75);        // a whisper behind your right ear

  const sit = smooth(range(t, .3, .37));
  const dolly = t < .3 ? lerp(.6, .75, smooth(range(t, 0, .22))) : lerp(.75, 0, sit);
  const fov = t < .3 ? lerp(46, 40, smooth(range(t, .1, .24))) : t > .9 ? lerp(46, 38, smooth(range(t, .9, .98))) : 46;

  let ghost: GhostPose = 'none', ghostAlpha = 0, ghostDim = 1;
  if (t >= .79 && t < .84) { ghost = 'aisleFar'; ghostAlpha = smooth(range(t, .79, .81)); ghostDim = .85; }   // standing at the far end of the aisle
  else if (t >= .855 && t < .9) { ghost = 'aisleNear'; ghostAlpha = 1; ghostDim = .9; }                     // after the stutter: a few rows away
  else if (t >= .9) { ghost = 'look'; ghostAlpha = smooth(range(t, .9, .93)); }                      // standing, lifting her head
  void lookBacks;
  const reflect = smooth(range(t, .38, .43)) * (1 - smooth(range(t, .57, .62)));

  // mostly steady lights; the stutter that brings her closer; then failing lights
  const flicker: 0 | 1 | 2 = t > .835 && t < .86 ? 2 : t > .05 ? 1 : 0;
  const k = .003, y2 = interiorYawOnly(t + k), y1 = interiorYawOnly(t - k);
  const turnSpeed = clamp(Math.abs(y2 - y1) / (2 * k) / 140);
  return { yaw, pitch: t > .9 ? .04 : 0, dolly, height: -sit * .32, fov, ghost, ghostAlpha, flicker, moving: smooth(range(t, .31, .42)), turnSpeed, flash: 0, ghostDim, driver: true, reflect };
}

/**
 * Boarding, inside half (k 0–1): stepping in facing the driver, the door shuts behind, a turn to the
 * aisle, a walk down it, a glance back at the driver now far away, and the silhouette at the back.
 * Ends exactly where the 'inside' scene starts (facing the back, a little way down the aisle).
 */
export function boardingAt(k: number): InteriorFrame {
  // shots, in order: the door shuts behind you (facing the cab) · a quick turn to the aisle · a few steps down it ·
  // a glance back: the driver, far away now · back to the aisle · the last seat, and someone in it
  const yaw = boardYaw(k);
  const dolly = k < .45 ? 0 : k < .62 ? lerp(0, .42, smooth(range(k, .45, .62))) : k < .77 ? .42 : lerp(.42, .6, smooth(range(k, .77, .92)));
  const step = k < .2 ? Math.max(0, Math.sin(k * Math.PI * 14)) * .03 : 0;
  const ghostAlpha = 0; // nobody at the back yet: the inside scene starts with her empty seat
  const y1 = boardYaw(k + .003), y0 = boardYaw(k - .003);
  return {
    yaw, pitch: k < .2 ? -.06 : 0, dolly, height: -.12 + k * .12 + step, fov: k > .8 ? lerp(46, 38, smooth(range(k, .8, .95))) : 46,
    ghost: 'hair', ghostAlpha, flicker: k > .08 ? 1 : 0, moving: 0, turnSpeed: clamp(Math.abs(y1 - y0) / .006 / 140),
    flash: 1 - smooth(range(k, 0, .1)), ghostDim: .9, driver: true, reflect: 0,
  };
}
function boardYaw(k: number) {
  let yaw = Math.PI - .22 + turn(k, 0, .22, 0, .22);                    // up the steps, turning to the cab
  if (k > .3) yaw = whip(k, .3, .45, Math.PI, Math.PI * 2);             // whip round to the aisle
  if (k > .62) yaw = whip(k, .62, .69, Math.PI * 2, Math.PI * 3);       // glance back: the driver, far away now
  if (k > .7) yaw = whip(k, .7, .77, Math.PI * 3, Math.PI * 4);         // and back to the aisle
  return yaw;
}

function interiorYawOnly(t: number) {
  let yaw = turn(t, .3, .37, 0, Math.PI);
  if (t > .72) yaw = turn(t, .72, .8, Math.PI, Math.PI * 2);
  return yaw;
}

/** where each ghost cut-out stands, in metres from the camera (camera faces -z) */
export const GHOSTS: Record<Exclude<GhostPose, 'none'>, { url: string; aspect: number; h: number; pos: [number, number, number] }> = {
  hair: { url: 'her-hair', aspect: .672, h: .82, pos: [.06, -.5, -10.2] },
  behind: { url: 'her-behind', aspect: .483, h: 1.34, pos: [-.78, -1.05, -2.5] },
  look: { url: 'her-look', aspect: .33, h: 1.68, pos: [.08, -1.2, -2.4] },
  // standing in the aisle, barefoot: far down the bus, then a few rows away with her feet just off the floor
  aisleFar: { url: 'her-aisle-far', aspect: .302, h: 1.62, pos: [.02, -1.28, -9.4] },
  aisleNear: { url: 'her-aisle-near', aspect: .324, h: 1.64, pos: [.04, -1.2, -4.3] },
};
