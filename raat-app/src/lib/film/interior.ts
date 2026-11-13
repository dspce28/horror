// The bus interior, driven by the 'inside' scene's scroll progress (0–1).
// The camera sits at the origin: looking down -z is the back of the bus, +z is the driver's cabin.
import { clamp, lerp, range, smooth } from '@/lib/animation/director';

export type GhostPose = 'none' | 'hair' | 'behind' | 'look';
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
}

const turn = (t: number, a: number, b: number, from: number, to: number) => lerp(from, to, smooth(range(t, a, b)));

export function interiorAt(t: number, lookBacks: number): InteriorFrame {
  // yaw keyframes: a slow turn back is the scariest part, a fast one is panic
  let yaw = 0;
  yaw = turn(t, .3, .37, 0, Math.PI);                    // sit down, face the front
  if (t > .58) yaw = turn(t, .58, .65, Math.PI, Math.PI * 2);   // ...slowly turn back
  if (t > .69) yaw = turn(t, .69, .715, Math.PI * 2, Math.PI * 3); // whip to the driver
  if (t > .745) yaw = turn(t, .745, .775, Math.PI * 3, Math.PI * 4); // and back to her
  if (t > .92) yaw = Math.PI * 4 + turn(t, .92, .935, 0, -.75);   // a whisper behind your right ear

  const sit = smooth(range(t, .3, .37));
  const dolly = t < .3 ? lerp(.6, .75, smooth(range(t, 0, .22))) : lerp(.75, 0, sit);
  const fov = t < .3 ? lerp(46, 34, smooth(range(t, .1, .24))) : t > .745 && t < .85 ? lerp(46, 38, smooth(range(t, .76, .84))) : 46;

  let ghost: GhostPose = 'none', ghostAlpha = 0;
  if (t >= .11 && t < .3) { ghost = 'hair'; ghostAlpha = clamp(range(t, .11, .14)); }
  else if (t >= .3 && t < .6) { ghost = 'hair'; ghostAlpha = 1; }
  else if (t >= .6 && t < .745) { ghost = 'behind'; ghostAlpha = 1; }
  else if (t >= .745 && t < .85) { ghost = 'look'; ghostAlpha = 1; }
  void lookBacks;

  const flicker: 0 | 1 | 2 = t > .84 && t < .93 ? 2 : t > .05 ? 1 : 0;
  // turning speed: how fast yaw changes per unit of progress, mapped to 0–1
  const k = .003, y2 = interiorYawOnly(t + k), y1 = interiorYawOnly(t - k);
  const turnSpeed = clamp(Math.abs(y2 - y1) / (2 * k) / 140);
  return { yaw, pitch: t > .745 && t < .85 ? .05 : 0, dolly, height: -sit * .32, fov, ghost, ghostAlpha, flicker, moving: smooth(range(t, .31, .42)), turnSpeed, flash: 0, ghostDim: 1, driver: true };
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
  const ghostAlpha = smooth(range(k, .8, .92));
  const y1 = boardYaw(k + .003), y0 = boardYaw(k - .003);
  return {
    yaw, pitch: k < .2 ? -.06 : 0, dolly, height: -.12 + k * .12 + step, fov: k > .8 ? lerp(46, 38, smooth(range(k, .8, .95))) : 46,
    ghost: 'hair', ghostAlpha, flicker: k > .08 ? 1 : 0, moving: 0, turnSpeed: clamp(Math.abs(y1 - y0) / .006 / 140),
    flash: 1 - smooth(range(k, 0, .1)), ghostDim: .9, driver: true,
  };
}
function boardYaw(k: number) {
  let yaw = Math.PI - .22 + turn(k, 0, .22, 0, .22);                    // up the steps, turning to the cab
  if (k > .3) yaw = turn(k, .3, .45, Math.PI, Math.PI * 2);             // turn to the aisle
  if (k > .62) yaw = turn(k, .62, .69, Math.PI * 2, Math.PI * 3);       // glance back: the driver, far away now
  if (k > .7) yaw = turn(k, .7, .77, Math.PI * 3, Math.PI * 4);         // and back to the aisle
  return yaw;
}

function interiorYawOnly(t: number) {
  let yaw = turn(t, .3, .37, 0, Math.PI);
  if (t > .58) yaw = turn(t, .58, .65, Math.PI, Math.PI * 2);
  if (t > .69) yaw = turn(t, .69, .715, Math.PI * 2, Math.PI * 3);
  if (t > .745) yaw = turn(t, .745, .775, Math.PI * 3, Math.PI * 4);
  return yaw;
}

/** where each ghost cut-out stands, in metres from the camera (camera faces -z) */
export const GHOSTS: Record<Exclude<GhostPose, 'none'>, { url: string; aspect: number; h: number; pos: [number, number, number] }> = {
  hair: { url: 'her-hair', aspect: .672, h: .82, pos: [.06, -.5, -10.2] },
  behind: { url: 'her-behind', aspect: .433, h: 1.32, pos: [-.78, -1.05, -2.5] },
  look: { url: 'her-look', aspect: .561, h: 1.7, pos: [.08, -1.18, -2.3] },
};
