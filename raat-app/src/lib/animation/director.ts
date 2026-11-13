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
  | 'her-behind' | 'her-look' | 'driver-back' | 'driver-turn' | 'her-lunge' | 'her-face' | 'twist' | 'bus-side' | 'black';

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
}

const SHOTS: Partial<Record<SceneId, Shot[]>> = {
  // the 30-second prototype: t = seconds / 30
  proto: [
    { at: 0, img: 'black', focus: [.5, .5], zoom: [1, 1] },
    { at: 4 / 30, img: 'road', focus: [.46, .56], zoom: [1, 1.55], rain: .5, fog: 1 },
    { at: 9 / 30, img: 'hero', focus: [.3, .5], zoom: [1.04, 1.32], rain: .55 },
    { at: 15 / 30, img: 'road', focus: [.46, .54], zoom: [1.55, 2.1], rain: .6, fog: 1, glow: [.46, .53] },
    { at: 20 / 30, img: 'bus-far', focus: [.48, .52], zoom: [1, 1.75], rain: .7, glow: [.47, .57] },
    { at: 23 / 30, img: 'bus-front', focus: [.5, .58], zoom: [1, 1.38], rain: .7 },
    { at: 26.5 / 30, img: 'bus-side', focus: [.84, .55], zoom: [1.15, 2.7], rain: .55, dof: 1.4 },
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
  driver: [
    { at: 0, img: 'driver-back', focus: [.74, .4], zoom: [1, 1.04], flicker: 1, rain: .3 },
    { at: .1, img: 'driver-back', focus: [.6, .36], zoom: [1.06, 1.1], flicker: 1, rain: .3, reflection: [.4, .3, .34], glide: true },
    { at: .22, img: 'driver-turn', focus: [.58, .32], zoom: [1.05, 1.18], flicker: 1 },
    { at: .41, img: 'driver-turn', focus: [.62, .36], zoom: [1.18, 1.22], flicker: 1, dofAt: [.5, .3] },
    // "You mean… you are…" — {N} glances back: she is still in her seat, a little closer
    { at: .645, img: 'her-behind', focus: [.53, .45], zoom: [1.12, 1.16], flicker: 1, dof: 1.2 },
    { at: .7, img: 'driver-turn', focus: [.52, .32], zoom: [1.3, 1.34], light: .4 },
    { at: .76, img: 'driver-turn', focus: [.5, .3], zoom: [1.42, 1.46], light: .45 },
    { at: .84, img: 'her-look', focus: [.48, .4], zoom: [1.02, 1.1], flicker: 1 },
  ],
  encounter: [
    { at: 0, img: 'inside-empty', focus: [.5, .48], zoom: [1.04, 1.1], flicker: 1, shake: .2, rowsOut: true },
    { at: .14, img: 'her-look', focus: [.48, .32], zoom: [1.15, 1.3], flicker: 2, shake: .2 },
    { at: .28, img: 'her-lunge', focus: [.5, .38], zoom: [1, 1.1], flicker: 2, shake: .4 },
    // Ramesh, weary: "not now, Kokila"
    { at: .38, img: 'driver-turn', focus: [.55, .34], zoom: [1.2, 1.24], flicker: 1 },
    { at: .46, img: 'her-lunge', focus: [.52, .34], zoom: [1.12, 1.16], flicker: 2, shake: .2 },
    { at: .55, img: 'her-lunge', focus: [.5, .4], zoom: [1.02, 1.05], flicker: 2, shake: .5, dofAt: [.25, .7] },
    { at: .64, img: 'her-lunge', focus: [.53, .3], zoom: [1.25, 1.28], flicker: 2 },
    // "Ramesh. Explain it." — he looks away
    { at: .83, img: 'driver-turn', focus: [.6, .36], zoom: [1.15, 1.18], light: .5 },
    { at: .93, img: 'her-lunge', focus: [.5, .4], zoom: [1.1, 1.12], light: .35 },
  ],
  // the twist: the same lit bus, but staged like a scene: two-shots, close-ups, reactions, over the shoulder
  twist: [
    { at: 0, img: 'twist', focus: [.5, .42], zoom: [1.04, 1.08], warm: true },
    { at: .12, img: 'twist', focus: [.71, .4], zoom: [1.55, 1.58], warm: true, dofAt: [.73, .36] },            // Ramesh doesn't look up
    { at: .19, img: 'twist', focus: [.42, .34], zoom: [1.42, 1.45], warm: true, dofAt: [.32, .22] },           // over his shoulder, at her
    { at: .26, img: 'twist', focus: [.7, .4], zoom: [1.5, 1.52], warm: true, dofAt: [.73, .36] },              // "we're dead"
    { at: .32, img: 'twist', focus: [.33, .27], zoom: [1.68, 1.72], warm: true },                              // "so? book online!"
    { at: .38, img: 'twist', focus: [.5, .42], zoom: [1.02, 1.04], warm: true },                               // {N}: "you're not here to kill me?"
    { at: .44, img: 'twist', focus: [.42, .34], zoom: [1.42, 1.44], warm: true, dofAt: [.32, .22] },
    { at: .5, img: 'twist', focus: [.33, .25], zoom: [1.78, 1.84], warm: true },                              // she really looks at you
    { at: .6, img: 'twist', focus: [.71, .4], zoom: [1.55, 1.57], warm: true, dofAt: [.73, .36] },             // Ramesh: he knows what's coming
    { at: .645, img: 'twist', focus: [.33, .27], zoom: [1.66, 1.7], warm: true },                              // she smiles
    { at: .69, img: 'twist', focus: [.45, .36], zoom: [1.3, 1.32], warm: true, dofAt: [.32, .22] },
    { at: .725, img: 'twist', focus: [.45, .36], zoom: [1.32, 1.34], warm: true, dofAt: [.73, .36], glide: true },          // rack focus: "Ramesh, look"
    { at: .78, img: 'black', focus: [.5, .5], zoom: [1, 1] },
    { at: .83, img: 'twist', focus: [.5, .42], zoom: [1.06, 1.08], warm: true },
    { at: .865, img: 'twist', focus: [.71, .4], zoom: [1.55, 1.57], warm: true, dofAt: [.73, .36] },          // Ramesh shrugs at "horoscopes"
    { at: .895, img: 'twist', focus: [.33, .27], zoom: [1.66, 1.7], warm: true },
    { at: .94, img: 'twist', focus: [.5, .42], zoom: [1.04, 1.06], warm: true, shake: .3 },
    { at: .965, img: 'twist', focus: [.33, .25], zoom: [1.8, 1.86], warm: true, light: .85 },                  // "I'll call you."
  ],
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
  rowsOut: number; reflection: [number, number, number] | null; reflectAmt: number;
  light: number; flicker: 0 | 1 | 2; shake: number; rain: number; glow: [number, number] | null; glowAmt: number; warm: boolean; fog: number; dof: number;
}

/** Where the camera is for a scene and its local progress. */
export function frameAt(scene: SceneId, t: number, speaker: Speaker | null): Frame {
  const list = SHOTS[scene] ?? [{ at: 0, img: 'black' as ImgId, focus: [.5, .5] as [number, number], zoom: [1, 1] as [number, number] }];
  let i = 0; for (let k = 0; k < list.length; k++) if (t >= list[k].at) i = k;
  const s = list[i], end = list[i + 1]?.at ?? 1;
  const k = smooth(range(t, s.at, end));
  let focus = s.focus, zoom = lerp(s.zoom[0], s.zoom[1], k);
  if (s.bySpeaker && speaker && SPEAKER_FOCUS[speaker]) { focus = SPEAKER_FOCUS[speaker]!.focus; zoom = SPEAKER_FOCUS[speaker]!.zoom; }
  const fade = .025;
  const mix = i > 0 ? range(t, s.at, s.at + fade) : 1;
  return {
    img: s.img, prev: i > 0 ? list[i - 1].img : null, mix,
    x: focus[0], y: focus[1], zoom,
    fx: (s.dofAt ?? focus)[0], fy: (s.dofAt ?? focus)[1], shot: `${scene}:${i}`, glide: !!s.glide,
    rowsOut: s.rowsOut ? range(t, s.at, s.at + (end - s.at) * .85) : 0, reflection: s.reflection ?? null, reflectAmt: s.reflection ? smooth(range(t, s.at, s.at + (end - s.at) * .4)) * (1 - smooth(range(t, end - (end - s.at) * .25, end))) : 0,
    light: s.light ?? 1, flicker: s.flicker ?? 0, shake: s.shake ?? 0, rain: s.rain ?? 0,
    glow: s.glow ?? null, glowAmt: s.glow ? k : 0, warm: !!s.warm,
    fog: s.fog ?? (s.rain ? .85 : .3), dof: s.dof ?? (s.dofAt ? 1.35 : s.bySpeaker ? 1.2 : .75),
  };
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
    case 'encounter': s.engine = t > .93 ? .3 : .55; s.rpm = .55; s.dread = 1; break;
    case 'twist': { const stop = range(t, .7, .77); s.engine = .3 - stop * .2; s.rpm = .3 - stop * .2; s.dread = 0; break; }
    default: s.dread = 0; break;
  }
  return s;
}
