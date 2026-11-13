// Pure functions that turn story progress into what is on screen. Tune timing here.
import type { SceneId, Speaker } from '@/data/stories/last-passenger';
import type { Gender } from '@/data/translations';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export type ImgId =
  | 'hero' | 'road' | 'stop' | 'bus-far' | 'bus-front' | 'inside-her' | 'inside-empty' | 'her-hair' | 'cabin' | 'cabin-crack'
  | 'her-behind' | 'her-look' | 'driver-back' | 'driver-turn' | 'her-lunge' | 'her-face' | 'twist' | 'bus-side' | 'black'
  | 'her-window' | 'her-upside' | 'her-front' | 'her-backseat' | 'her-seated'
  // Part 2
  | 'p2-highway-after-bus' | 'p2-highway-distant-light' | 'p2-crossroads-wide' | 'p2-black-doll-closeup' | 'p2-haveli-entrance'
  | 'p2-banyan-courtyard' | 'p2-construction-building' | 'p2-ritual-house' | 'p2-lane-run' | 'p2-lane-run-2';

/** Part 2: Kokila standing in a photograph (a cut-out placed in depth). Image space; y is where her feet are. */
export interface FigureShot {
  url: string;
  from: [number, number, number];
  to?: [number, number, number];
  /** she does not walk: she is simply closer each time (this many positions across the shot) */
  steps?: number;
  /** fraction of the shot after which she is gone */
  until?: number;
  /** how far away she is at the start (0 near … 1 far): fog and softness */
  far?: number;
}

export interface Shot {
  /** scene-local progress where this shot starts */
  at: number;
  img: ImgId;
  /** point the camera drifts towards (0–1 of the image) */
  focus: [number, number];
  /** zoom at the start and end of the shot */
  zoom: [number, number];
  /** brightness 0–1 */
  light?: number;
  flicker?: 0 | 1 | 2;
  shake?: number;
  rain?: number;
  /** a headlight glow that grows over the shot, at this point of the image */
  glow?: [number, number];
  warm?: boolean;
  /** fog in the far parts of the photo, 0–1 */
  fog?: number;
  /** depth-of-field strength (0 = sharp everywhere) */
  dof?: number;
  /** cut to whoever is talking (the twist) */
  bySpeaker?: boolean;
  /** where the lens focuses (0–1 of the image), if not where the camera points: rack focus, over-the-shoulder */
  dofAt?: [number, number];
  /** move to this shot without a cut (same photo): a slow pan or a rack focus */
  glide?: boolean;
  /** the tube lights die row by row across this shot, back of the bus first */
  rowsOut?: boolean;
  /** a reflection of her in the glass: where (0–1 of the image) and how tall */
  reflection?: [number, number, number];
  /** fog swallows the picture across this shot, far things first (the bus disappearing) */
  vanish?: boolean;
  /** brightness at the end of the shot (fades from `light`) */
  lightTo?: number;
  /** the headlight glow fades out across the shot instead of growing */
  glowFade?: boolean;
  /** Ramesh glances at his mirror (head offset in image units), holds, then looks away fast; her eyes show in the mirror */
  glance?: [number, number];
  /** hands tighten on the wheel across the shot */
  grip?: boolean;
  /** the empty seat's cushion sinks across the shot */
  press?: boolean;
  /** a shadow falls across the picture from behind {N}: where (0–1 of the image) and how tall */
  shadow?: [number, number, number];
  // ---- Part 2 ----
  /** the camera pans across the shot from `focus` to here (scroll-driven) */
  focusTo?: [number, number];
  figure?: FigureShot;
  /** eleven silhouettes in the branches: revealed one by one across [from, to] of the shot; `turn`: when one of them turns */
  hang?: { from: number; to: number; turn?: number };
  /** a diya flame at this point (x, y, size); `out`: fraction of the shot where it dies */
  diya?: [number, number, number];
  diyaOut?: number;
  /** the circle of water on the road: centre and radii (image space) */
  circle?: [number, number, number, number];
  /** the haveli door opening by itself: the door's box (x0, y0, x1, y1) and where in the shot it opens */
  door?: [number, number, number, number];
  doorAt?: [number, number];
  /** concrete falling inside the building: where, and when in the shot */
  debris?: [number, number, number];
  /** {N}'s name on the doll: where (x, y), its rotation (deg) and size (fraction of image height) */
  name?: [number, number, number, number];
  /** running: the camera bobs and shakes with each stride */
  run?: boolean;
}

// Part 2 placements (image space)
const CIRCLE: [number, number, number, number] = [.5, .8, .165, .088];
const DIYA: [number, number, number] = [.548, .757, .6];
const DOOR: [number, number, number, number] = [.33, .08, .68, .89];
const HER = '/raat/cutouts/her-look.webp';

const SHOTS: Partial<Record<SceneId, Shot[]>> = {
  // the 30-second prototype: t = seconds / 30
  proto: [
    { at: 0, img: 'black', focus: [.5, .5], zoom: [1, 1] },
    { at: 4 / 30, img: 'road', focus: [.46, .56], zoom: [1, 1.55], rain: .5, fog: 1 },
    { at: 9 / 30, img: 'hero', focus: [.3, .5], zoom: [1.04, 1.32], rain: .55 },
    { at: 15 / 30, img: 'road', focus: [.46, .54], zoom: [1.55, 2.1], rain: .6, fog: 1, glow: [.46, .53] },
    { at: 20 / 30, img: 'bus-far', focus: [.48, .52], zoom: [1, 1.75], rain: .7, glow: [.47, .57] },
    { at: 23 / 30, img: 'bus-front', focus: [.5, .58], zoom: [1, 1.38], rain: .7 },
    { at: 26.5 / 30, img: 'bus-side', focus: [.16, .56], zoom: [1.15, 2.7], rain: .55, dof: 1.4 },
  ],
  open: [{ at: 0, img: 'black', focus: [.5, .5], zoom: [1, 1] }],
  highway: [
    { at: 0, img: 'hero', focus: [.3, .52], zoom: [1.02, 1.22], rain: .5 },
    { at: .62, img: 'stop', focus: [.2, .45], zoom: [1.05, 1.18], rain: .5, light: .9 },
    { at: .74, img: 'road', focus: [.46, .52], zoom: [1, 1.35], rain: .6, glow: [.46, .53] },
  ],
  bus: [
    { at: 0, img: 'bus-far', focus: [.48, .5], zoom: [1, 1.7], rain: .7, glow: [.47, .57] },
    { at: .34, img: 'bus-front', focus: [.5, .58], zoom: [1.08, 1.3], rain: .7, shake: .7 },
  ],
  inside: [
    { at: 0, img: 'inside-her', focus: [.56, .56], zoom: [1, 1.45], flicker: 1 },
    { at: .11, img: 'her-hair', focus: [.5, .45], zoom: [1.02, 1.25], flicker: 1 },
    { at: .22, img: 'cabin', focus: [.5, .45], zoom: [1, 1.12], flicker: 1, rain: .4 },
    { at: .6, img: 'her-behind', focus: [.5, .5], zoom: [1.05, 1.22], flicker: 1 },
    { at: .69, img: 'cabin', focus: [.55, .5], zoom: [1.12, 1.16], flicker: 1, rain: .4 },
    { at: .76, img: 'her-look', focus: [.53, .28], zoom: [1.15, 1.45], flicker: 1 },
    { at: .84, img: 'inside-empty', focus: [.5, .5], zoom: [1.05, 1.1], flicker: 2 },
    { at: .92, img: 'black', focus: [.5, .5], zoom: [1, 1] },
  ],
  // no big zooms: framing changes by cutting and by slow drifts; the people move on their own (life.ts)
  // Ramesh's warning: mostly his back; he never turns. In the windscreen, a woman behind {N}
  driver: [
    { at: 0, img: 'driver-back', focus: [.7, .42], zoom: [1, 1.05], flicker: 1, rain: .3 },
    // his hands tighten; his eyes go to the mirror; something is in it; he looks away fast. "Don't look at her."
    { at: .2, img: 'driver-back', focus: [.6, .32], zoom: [1.1, 1.13], flicker: 1, rain: .3, dofAt: [.6, .25], grip: true, glance: [-.016, -.006] },
    { at: .38, img: 'her-backseat', focus: [.52, .42], zoom: [1.08, 1.12], flicker: 1, dof: 1.2 },                    // "Why? Who is she?" — {N} glances back: she is watching over the seats
    { at: .47, img: 'driver-back', focus: [.55, .36], zoom: [1.04, 1.08], flicker: 1, rain: .3, reflection: [.4, .3, .34] },
    { at: .58, img: 'driver-back', focus: [.74, .4], zoom: [1.16, 1.19], flicker: 1, rain: .3, dofAt: [.74, .33], grip: true },
    { at: .69, img: 'driver-back', focus: [.6, .38], zoom: [1.2, 1.24], light: .6, rain: .3 },
    { at: .78, img: 'driver-back', focus: [.25, .14], zoom: [1.35, 1.4], flicker: 1, rain: .3 },                      // the mirror, the photograph
    { at: .88, img: 'cabin', focus: [.55, .7], zoom: [1.12, 1.16], flicker: 1, rain: .3, shadow: [.66, .52, .95] },  // a shadow behind {N}
  ],
  // the reveal: lights die row by row, the engine goes silent, he turns, she comes
  reveal: [
    { at: 0, img: 'inside-empty', focus: [.5, .48], zoom: [1.04, 1.1], flicker: 1, shake: .2, rowsOut: true },
    { at: .13, img: 'cabin', focus: [.5, .45], zoom: [1.05, 1.08], light: .55, rain: .5 },
    { at: .23, img: 'driver-turn', focus: [.55, .34], zoom: [1.05, 1.18], flicker: 1 },
    { at: .42, img: 'inside-her', focus: [.4, .66], zoom: [1.1, 1.14], light: .7, flicker: 1, dofAt: [.17, .9], press: true }, // the seat beside {N} sinks
    { at: .52, img: 'her-window', focus: [.58, .5], zoom: [1.04, 1.1], flicker: 1, rain: .4 },                          // outside the window: her face and hand on the glass
    { at: .61, img: 'her-upside', focus: [.78, .55], zoom: [1.1, 1.16], flicker: 1, rain: .4 },                          // in the window beside {N}: her face, upside down
    { at: .71, img: 'her-front', focus: [.53, .35], zoom: [1.04, 1.1], light: .85, flicker: 1, dof: .9 },                 // over the seat back, right in front: "Stay with me."
    { at: .8, img: 'her-lunge', focus: [.5, .38], zoom: [1.02, 1.08], flicker: 2, shake: .4 },
    { at: .89, img: 'her-backseat', focus: [.52, .42], zoom: [1.1, 1.12], flicker: 1 },                                   // lights back: in her seat at the back, watching
  ],
  // the bus stops; {N} gets off; the fog takes the bus
  leave: [
    { at: 0, img: 'cabin', focus: [.5, .45], zoom: [1.05, 1.1], flicker: 1, rain: .4 },
    { at: .19, img: 'her-seated', focus: [.53, .35], zoom: [1.12, 1.2], flicker: 1, dof: 1.1 },                        // she is looking straight at {N}
    { at: .3, img: 'bus-side', focus: [.2, .56], zoom: [1.6, 1.5], rain: .5, light: .9 },                            // the door, from the road
    { at: .56, img: 'bus-front', focus: [.5, .56], zoom: [1.18, 1.14], rain: .6, glow: [.5, .62] },
    { at: .64, img: 'bus-front', focus: [.5, .55], zoom: [1.14, 1.08], rain: .6, glow: [.5, .62], glowFade: true, vanish: true, lightTo: .55, glide: true },
    { at: .84, img: 'road', focus: [.47, .56], zoom: [1.05, 1.06], rain: .5, fog: 1, light: .65, glow: [.47, .55], glowFade: true },  // one light left, then not
    { at: .93, img: 'road', focus: [.46, .55], zoom: [1.06, 1.07], rain: .5, fog: 1, light: .65, glide: true },                         // hold on the empty road
  ],
  /* ---------------- Part 2 · photographs ---------------- */
  // (p2call, p2return and p2pump are filmed on the 3D highway; these are the fallbacks without WebGL)
  p2call: [{ at: 0, img: 'p2-highway-after-bus', focus: [.5, .56], zoom: [1, 1.3], fog: 1, light: .8 }],
  p2cross: [
    { at: 0, img: 'p2-crossroads-wide', focus: [.5, .55], zoom: [1, 1.1], fog: 1, light: .9, circle: CIRCLE, diya: DIYA },
    { at: .16, img: 'p2-crossroads-wide', focus: [.5, .72], zoom: [1.12, 1.45], fog: 1, light: .9, glide: true, circle: CIRCLE, diya: DIYA, dofAt: [.5, .8] },
    { at: .32, img: 'p2-crossroads-wide', focus: [.5, .77], zoom: [2, 2.3], fog: .8, light: .95, circle: CIRCLE, diya: DIYA, dof: 1.3 },
    { at: .44, img: 'p2-crossroads-wide', focus: [.548, .765], zoom: [3, 3.3], fog: .6, glide: true, circle: CIRCLE, diya: DIYA, dof: 1.5 },
    { at: .5, img: 'p2-black-doll-closeup', focus: [.6, .5], zoom: [1.05, 1.2], warm: true, light: .9, dofAt: [.6, .5], diya: [.385, .3, .5] },
    { at: .66, img: 'p2-crossroads-wide', focus: [.548, .765], zoom: [2.6, 2.75], fog: .7, circle: CIRCLE, diya: DIYA, dof: 1.4 },
    // rack focus across the road: someone is standing there
    { at: .8, img: 'p2-crossroads-wide', focus: [.58, .6], zoom: [1.5, 1.7], fog: 1, light: .85, dofAt: [.66, .5], circle: CIRCLE, diya: DIYA,
      figure: { url: HER, from: [.665, .555, .085], far: 1 } },
  ],
  p2her: [
    // she is simply closer every time
    { at: 0, img: 'p2-crossroads-wide', focus: [.6, .62], zoom: [1.35, 1.45], fog: 1, light: .85, dofAt: [.64, .6], circle: CIRCLE, diya: DIYA,
      figure: { url: HER, from: [.665, .555, .085], to: [.64, 1.02, .82], steps: 5, far: 1 } },
    // her face, filling the frame: urgent, frightened
    { at: .45, img: 'her-face', focus: [.5, .42], zoom: [1.12, 1.32], light: .78, dof: 1.1 },
    { at: .64, img: 'p2-crossroads-wide', focus: [.548, .765], zoom: [2.7, 2.8], fog: .7, circle: CIRCLE, diya: DIYA, diyaOut: .3, dof: 1.4 },
    { at: .8, img: 'p2-lane-run', focus: [.5, .6], zoom: [1.15, 1.7], light: .75, shake: .5, run: true },
    { at: .91, img: 'p2-lane-run-2', focus: [.5, .62], zoom: [1.15, 1.6], light: .7, shake: .5, run: true },
  ],
  p2haveli: [
    { at: 0, img: 'p2-haveli-entrance', focus: [.5, .52], zoom: [1, 1.12], light: .85, warm: true, door: DOOR, doorAt: [9, 9] },
    { at: .2, img: 'p2-haveli-entrance', focus: [.5, .5], zoom: [1.15, 1.25], light: .85, warm: true, glide: true, door: DOOR, doorAt: [9, 9], dofAt: [.52, .55] },
    // the chain slides off; the doors part on their own
    { at: .56, img: 'p2-haveli-entrance', focus: [.505, .5], zoom: [1.25, 1.35], light: .8, warm: true, door: DOOR, doorAt: [.15, .7] },
    // in, through the gap
    { at: .76, img: 'p2-haveli-entrance', focus: [.505, .5], zoom: [1.35, 3.2], light: .75, warm: true, door: DOOR, doorAt: [-1, 0], glide: true },
    { at: .94, img: 'black', focus: [.5, .5], zoom: [1, 1] },
  ],
  p2banyan: [
    // the camera slowly circles the trunk (a sideways drift around it)
    { at: 0, img: 'p2-banyan-courtyard', focus: [.3, .62], focusTo: [.7, .6], zoom: [1.12, 1.2], light: .85, fog: .9 },
    // a creak above; {N} looks up; eleven of them
    // counting them: the camera drifts across the branches, left to right, as they appear
    { at: .24, img: 'p2-banyan-courtyard', focus: [.22, .2], focusTo: [.8, .2], zoom: [1.2, 1.12], light: .8, fog: .9, glide: true, hang: { from: .12, to: .98, turn: 1 } },
    { at: .6, img: 'p2-banyan-courtyard', focus: [.5, .22], zoom: [1.12, 1.08], light: .75, fog: .9, glide: true, hang: { from: -1, to: 0, turn: .3 } },
    // silence; she is right behind {N}
    { at: .72, img: 'p2-banyan-courtyard', focus: [.5, .3], zoom: [1.08, 1.06], light: .45, lightTo: .3, fog: 1, hang: { from: -1, to: 0 } },
    { at: .8, img: 'her-face', focus: [.5, .44], zoom: [1.3, 1.5], light: .7, dof: 1.2, shake: .08 },
    { at: .95, img: 'p2-lane-run-2', focus: [.5, .62], zoom: [1.15, 1.5], light: .7, shake: .5, run: true },
  ],
  p2build: [
    { at: 0, img: 'p2-construction-building', focus: [.5, .6], zoom: [1, 1.1], light: .9, fog: .9, run: false },
    // on the second floor: her. She does not come down.
    { at: .2, img: 'p2-construction-building', focus: [.6, .48], zoom: [1.45, 1.6], light: .9, fog: .9, glide: true, dofAt: [.625, .5],
      figure: { url: HER, from: [.627, .595, .2], until: .99, far: .5 } },
    // {N} looks up again: the floor is empty
    { at: .5, img: 'p2-construction-building', focus: [.6, .48], zoom: [1.6, 1.62], light: .85, fog: .9, dofAt: [.625, .5] },
    { at: .64, img: 'p2-construction-building', focus: [.52, .55], zoom: [1.5, 1.4], light: .85, fog: 1, shake: .35, debris: [.5, .52, .1] },
    { at: .8, img: 'p2-lane-run', focus: [.5, .6], zoom: [1.15, 1.6], light: .7, shake: .5, run: true },
  ],
  p2house: [
    { at: 0, img: 'p2-ritual-house', focus: [.5, .42], zoom: [1, 1.1], light: .9, warm: true },
    { at: .13, img: 'p2-ritual-house', focus: [.5, .62], zoom: [1.2, 1.5], light: .9, warm: true, glide: true, dofAt: [.5, .65] },
    { at: .26, img: 'p2-black-doll-closeup', focus: [.6, .52], zoom: [1.1, 1.25], light: .85, warm: true, diya: [.385, .3, .5] },
    // the name, written on the doll; hold
    { at: .36, img: 'p2-black-doll-closeup', focus: [.64, .54], zoom: [1.6, 1.85], light: .85, warm: true, glide: true, dofAt: [.66, .55], name: [.665, .56, -14, .07], diya: [.385, .3, .5] },
    // the camera pulls back from the door; knocks from inside
    { at: .6, img: 'p2-ritual-house', focus: [.5, .36], zoom: [1.4, 1.02], light: .8, warm: true },
    { at: .9, img: 'p2-lane-run-2', focus: [.5, .62], zoom: [1.15, 1.6], light: .7, shake: .5, run: true },
  ],
  p2return: [{ at: 0, img: 'p2-highway-distant-light', focus: [.5, .55], zoom: [1, 1.7], fog: 1, light: .8, glow: [.5, .57] }],
  p2pump: [{ at: 0, img: 'p2-highway-distant-light', focus: [.5, .56], zoom: [1.7, 2.2], fog: 1, light: .8, glow: [.5, .57] }],
  ticket: [{ at: 0, img: 'black', focus: [.5, .5], zoom: [1, 1] }],
  // the empty road; the call happens on top of it
  end: [{ at: 0, img: 'road', focus: [.46, .55], zoom: [1.06, 1.1], rain: .4, fog: 1, light: .5 }],
};

const SPEAKER_FOCUS: Partial<Record<Speaker, { focus: [number, number]; zoom: number }>> = {
  kokila: { focus: [.27, .38], zoom: 1.55 },
  her: { focus: [.27, .38], zoom: 1.55 },
  driver: { focus: [.72, .4], zoom: 1.55 },
};

export interface Frame {
  img: ImgId; prev: ImgId | null; mix: number;
  x: number; y: number; zoom: number;
  /** the point in focus */
  fx: number; fy: number;
  /** which shot this is (a new value = a cut), and whether to glide into it instead */
  shot: string; glide: boolean;
  rowsOut: number; reflection: [number, number, number] | null; reflectAmt: number; vanish: number;
  nudge: [number, number]; mirrorAmt: number; grip: number; press: number; shadow: [number, number, number] | null; shadowAmt: number;
  light: number; flicker: 0 | 1 | 2; shake: number; rain: number; glow: [number, number] | null; glowAmt: number; warm: boolean; fog: number; dof: number;
  // Part 2
  fig: { url: string; x: number; y: number; h: number; amt: number; far: number } | null;
  hangN: number; hangTurn: number;
  diya: [number, number, number] | null; diyaAmt: number;
  circle: [number, number, number, number] | null;
  door: [number, number, number, number] | null; doorOpen: number;
  debris: [number, number, number] | null; debrisT: number;
  name: [number, number, number, number] | null; nameAmt: number;
  run: boolean;
}

/** Where the camera is for a scene and its local progress. */
export function frameAt(scene: SceneId, t: number, speaker: Speaker | null): Frame {
  const list = SHOTS[scene] ?? [{ at: 0, img: 'black' as ImgId, focus: [.5, .5] as [number, number], zoom: [1, 1] as [number, number] }];
  let i = 0; for (let k = 0; k < list.length; k++) if (t >= list[k].at) i = k;
  const s = list[i], end = list[i + 1]?.at ?? 1;
  const k = smooth(range(t, s.at, end));
  let focus: [number, number] = s.focusTo ? [lerp(s.focus[0], s.focusTo[0], k), lerp(s.focus[1], s.focusTo[1], k)] : s.focus, zoom = lerp(s.zoom[0], s.zoom[1], k);
  if (s.bySpeaker && speaker && SPEAKER_FOCUS[speaker]) { focus = SPEAKER_FOCUS[speaker]!.focus; zoom = SPEAKER_FOCUS[speaker]!.zoom; }
  const fade = .025;
  const mix = i > 0 ? range(t, s.at, s.at + fade) : 1;
  return {
    img: s.img, prev: i > 0 ? list[i - 1].img : null, mix,
    x: focus[0], y: focus[1], zoom,
    fx: (s.dofAt ?? focus)[0], fy: (s.dofAt ?? focus)[1], shot: `${scene}:${i}`, glide: !!s.glide,
    rowsOut: s.rowsOut ? range(t, s.at, s.at + (end - s.at) * .85) : 0, vanish: s.vanish ? smooth(range(t, s.at, s.at + (end - s.at) * .9)) : 0,
    ...glanceAt(s, t, end),
    grip: s.grip ? smooth(range(t, s.at + (end - s.at) * .2, s.at + (end - s.at) * .45)) * (.85 + .15 * Math.sin(t * 900)) : 0,
    press: s.press ? smooth(range(t, s.at + (end - s.at) * .15, s.at + (end - s.at) * .75)) : 0,
    shadow: s.shadow ?? null, shadowAmt: s.shadow ? smooth(range(t, s.at, s.at + (end - s.at) * .5)) * (1 - smooth(range(t, end - (end - s.at) * .2, end))) : 0, reflection: s.reflection ?? null, reflectAmt: s.reflection ? smooth(range(t, s.at, s.at + (end - s.at) * .4)) * (1 - smooth(range(t, end - (end - s.at) * .25, end))) : 0,
    light: s.lightTo != null ? lerp(s.light ?? 1, s.lightTo, k) : s.light ?? 1, flicker: s.flicker ?? 0, shake: s.shake ?? 0, rain: s.rain ?? 0,
    glow: s.glow ?? null, glowAmt: s.glow ? (s.glowFade ? (1 - k) * .3 : k) : 0, warm: !!s.warm, // a fading light stays small: one diffuse point, not a flood
    fog: s.fog ?? (s.rain ? .85 : .3), dof: s.dof ?? (s.dofAt ? 1.35 : s.bySpeaker ? 1.2 : .75),
    ...part2At(s, t, end),
  };
}

/** Part 2 effects for a shot at local time t */
function part2At(s: Shot, t: number, end: number) {
  const L = end - s.at, u = L > 0 ? clamp((t - s.at) / L) : 0;
  let fig: Frame['fig'] = null;
  if (s.figure) {
    const f = s.figure, to = f.to ?? f.from;
    // stepped: each position holds, then she is a little closer (a short, soft change, never a walk)
    let k = u;
    if (f.steps) { const n = f.steps, i = Math.min(n - 1, Math.floor(u * n)), w = (u * n) - i; k = (i + smooth(range(w, .82, 1))) / (n - 1); k = clamp(k); }
    const gone = f.until != null && u > f.until;
    fig = { url: f.url, x: lerp(f.from[0], to[0], k), y: lerp(f.from[1], to[1], k), h: lerp(f.from[2], to[2], k), amt: gone ? 0 : smooth(range(u, 0, .06)), far: (f.far ?? .5) * (1 - k) };
  }
  const hangN = s.hang ? (s.hang.from < 0 ? 11 : 11 * clamp((u - s.hang.from) / (s.hang.to - s.hang.from))) : 0;
  const hangTurn = s.hang?.turn != null ? smooth(range(u, s.hang.turn, Math.min(1, s.hang.turn + .5))) : 0;
  const diyaAmt = s.diya ? (s.diyaOut != null && u > s.diyaOut ? Math.max(0, 1 - (u - s.diyaOut) * 40) : 1) : 0;
  const doorOpen = s.door ? (s.doorAt ? (s.doorAt[0] < 0 ? 1 : smooth(range(u, s.doorAt[0], s.doorAt[1]))) : 0) : 0;
  return {
    fig, hangN, hangTurn, diya: s.diya ?? null, diyaAmt, circle: s.circle ?? null, door: s.door ?? null, doorOpen,
    debris: s.debris ?? null, debrisT: s.debris ? u : 0, name: s.name ?? null, nameAmt: s.name ? smooth(range(u, .05, .25)) : 0, run: !!s.run,
  };
}

/** look at the mirror (slowly), see something, look away (fast) */
function glanceAt(s: Shot, t: number, end: number): { nudge: [number, number]; mirrorAmt: number } {
  if (!s.glance) return { nudge: [0, 0], mirrorAmt: 0 };
  const L = end - s.at, look = smooth(range(t, s.at + L * .08, s.at + L * .32)), away = range(t, s.at + L * .7, s.at + L * .76);
  const k = look * (1 - away);
  return { nudge: [s.glance[0] * k, s.glance[1] * k], mirrorAmt: range(t, s.at + L * .3, s.at + L * .38) * (1 - away) };
}

export function imageFor(id: ImgId, gender: Gender): string | null {
  if (id === 'black') return null;
  return id === 'hero' ? (gender === 'f' ? 'hero-f' : 'hero-m') : id;
}

/** Layer levels for the sound engine. */
export function soundAt(scene: SceneId, t: number) {
  const s = { engine: 0, rpm: .3, dread: .2, lights: true };
  switch (scene) {
    case 'open': s.dread = .25; break;
    case 'highway': if (t > .78) { s.engine = range(t, .78, 1) * .4; s.rpm = .5; } s.dread = .2 + t * .2; break;
    case 'bus': { const k = range(t, 0, .38); s.engine = .45 + (1 - k) * .4; s.rpm = .25 + (1 - k) * .45; s.dread = .35; break; }
    case 'board': s.engine = .32; s.rpm = .2; s.dread = .4; break; // idling at the door
    case 'inside': { const go = range(t, .31, .45); s.engine = .35 + go * .2; s.rpm = .25 + go * .3; s.dread = .4 + t * .35; break; }
    case 'driver': s.engine = .5; s.rpm = .5; s.dread = .6 + t * .2; s.lights = !(t > .59 && t < .84); break;
    case 'reveal': s.engine = t > .14 && t < .9 ? 0 : .5; s.rpm = .5; s.dread = 1; s.lights = !(t > .04 && t < .9); break; // the engine cuts out; the bus keeps moving
    case 'leave': { const slow = range(t, 0, .31), away = range(t, .58, .9); s.engine = (.5 - slow * .2) * (1 - away); s.rpm = .45 - slow * .25; s.dread = .5 * (1 - away); break; }
    case 'p2call': s.dread = .25 + t * .15; s.lights = false; break;
    case 'p2cross': s.dread = .35 + t * .25; s.lights = false; break;
    case 'p2her': s.dread = t < .7 ? .6 + t * .4 : .3; s.lights = false; break;
    case 'p2haveli': s.dread = .5; s.lights = false; break;
    case 'p2banyan': s.dread = t > .72 && t < .8 ? 0 : .7; s.lights = false; break;
    case 'p2build': s.dread = .55; s.lights = false; break;
    case 'p2house': s.dread = .65; s.lights = false; break;
    case 'p2return': s.dread = .35 - t * .15; s.lights = false; break;
    case 'p2pump': s.dread = t < .45 ? .3 : 0; s.lights = false; break;
    default: s.dread = 0; break;
  }
  return s;
}
