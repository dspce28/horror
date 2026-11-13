import type { Key } from '@/data/translations';

export type SceneId = 'open' | 'highway' | 'bus' | 'board' | 'inside' | 'driver' | 'encounter' | 'twist' | 'ticket' | 'end' | 'proto';
export type Speaker = 'nar' | 'big' | 'you' | 'driver' | 'her' | 'kokila' | 'phone';
export type GameId = 'hunt' | 'cabin' | 'photo';

export interface Cue {
  /** scene-local progress (0–1) at which the line appears */
  at: number;
  who: Speaker;
  k: Key;
  /** the ghost's face shows faintly behind this line */
  behind?: boolean;
  /** the line is said to the visitor, not the hero */
  direct?: boolean;
}

export interface StoryEvent { at: number; id: string }

export interface SceneDef {
  id: SceneId;
  /** scroll length in viewport heights */
  vh: number;
  label: Key;
  cues: Cue[];
  events: StoryEvent[];
  /** a mini-game offered when the visitor reaches the end of this scene */
  gameAfter?: GameId | GameId[];
}

export const SCENES: SceneDef[] = [
  {
    id: 'open', vh: 120, label: 'sc_warning',
    cues: [{ at: .12, who: 'big', k: 'o1' }, { at: .5, who: 'big', k: 'o2', behind: true }],
    events: [{ at: .45, id: 'whisper-far' }],
  },
  {
    id: 'highway', vh: 300, label: 'sc_highway',
    cues: [
      // timed to the camera: the road first, the visitor from about two-thirds in, headlights at the end
      { at: .06, who: 'big', k: 'h2' }, { at: .17, who: 'phone', k: 'fw_time', direct: true }, { at: .28, who: 'nar', k: 'h7' },
      { at: .42, who: 'nar', k: 'h4' }, { at: .64, who: 'big', k: 'h1' }, { at: .73, who: 'phone', k: 'h3' },
      { at: .78, who: 'you', k: 'h5' }, { at: .83, who: 'nar', k: 'h6' }, { at: .88, who: 'nar', k: 'h8' }, { at: .94, who: 'big', k: 'h9' },
    ],
    events: [{ at: .17, id: 'ping' }, { at: .28, id: 'bark' }, { at: .73, id: 'ping' }, { at: .88, id: 'engine-far' }],
  },
  {
    id: 'bus', vh: 240, label: 'sc_bus',
    cues: [{ at: .04, who: 'nar', k: 'b1' }, { at: .3, who: 'you', k: 'b2' }, { at: .78, who: 'nar', k: 'bd1' }],
    events: [{ at: .4, id: 'brake' }, { at: .54, id: 'stop' }],
  },
  {
    // boarding: the door opens, the driver asks, the visitor climbs in; the cut hides in the doorway's light
    id: 'board', vh: 380, label: 'sc_board',
    cues: [
      { at: .05, who: 'driver', k: 'b3' }, { at: .13, who: 'you', k: 'b4' }, { at: .2, who: 'driver', k: 'b5' },
      { at: .28, who: 'you', k: 'b6' }, { at: .35, who: 'driver', k: 'b7' }, { at: .43, who: 'nar', k: 'b8' },
      { at: .58, who: 'nar', k: 'bd2' }, { at: .81, who: 'nar', k: 'bd3' }, { at: .9, who: 'nar', k: 'bd4' },
    ],
    events: [{ at: .02, id: 'door-open' }, { at: .44, id: 'steps-metal' }, { at: .555, id: 'door-close' }, { at: .93, id: 'creak-back' }],
  },
  {
    id: 'inside', vh: 360, label: 'sc_inside',
    cues: [
      { at: .03, who: 'nar', k: 'i1' }, { at: .12, who: 'nar', k: 'i2' }, { at: .23, who: 'you', k: 'i3' },
      { at: .31, who: 'nar', k: 'i4' }, { at: .4, who: 'phone', k: 'n1' }, { at: .47, who: 'nar', k: 'i5' },
      { at: .54, who: 'phone', k: 'n2' }, { at: .62, who: 'nar', k: 'i6' }, { at: .7, who: 'you', k: 'i7' },
      { at: .77, who: 'nar', k: 'i8' }, { at: .85, who: 'nar', k: 'i9' }, { at: .93, who: 'her', k: 'i10', behind: true, direct: true },
    ],
    events: [
      { at: .31, id: 'engine-start' }, { at: .4, id: 'ping' }, { at: .54, id: 'ping' }, { at: .62, id: 'teleport' },
      { at: .77, id: 'her-look' }, { at: .85, id: 'flicker-out' }, { at: .93, id: 'whisper-close' }, { at: .96, id: 'blackout' },
    ],
    gameAfter: ['hunt', 'cabin'],
  },
  {
    id: 'driver', vh: 320, label: 'sc_driver',
    cues: [
      { at: .04, who: 'you', k: 'd1' }, { at: .13, who: 'you', k: 'd2' }, { at: .23, who: 'nar', k: 'd3' },
      { at: .33, who: 'driver', k: 'd4' }, { at: .41, who: 'you', k: 'd5' }, { at: .49, who: 'driver', k: 'd6' },
      { at: .57, who: 'driver', k: 'd7' }, { at: .65, who: 'you', k: 'd8' }, { at: .71, who: 'driver', k: 'd9' },
      { at: .77, who: 'driver', k: 'fw_watch', direct: true }, { at: .85, who: 'driver', k: 'd10' }, { at: .93, who: 'nar', k: 'd11' },
    ],
    events: [{ at: .23, id: 'driver-turn' }, { at: .59, id: 'thunder' }, { at: .77, id: 'stare' }, { at: .93, id: 'heartbeat' }],
    gameAfter: 'photo',
  },
  {
    id: 'encounter', vh: 320, label: 'sc_encounter',
    cues: [
      { at: .04, who: 'nar', k: 'r1' }, { at: .15, who: 'nar', k: 'r2' }, { at: .29, who: 'her', k: 'r3' },
      { at: .39, who: 'driver', k: 'r4' }, { at: .47, who: 'her', k: 'r5' }, { at: .55, who: 'you', k: 'r6' },
      { at: .65, who: 'her', k: 'r7' }, { at: .76, who: 'you', k: 'r8' }, { at: .84, who: 'her', k: 'r9' }, { at: .93, who: 'nar', k: 'r10' },
    ],
    events: [
      { at: .04, id: 'lights-die' }, { at: .15, id: 'heartbeat' }, { at: .29, id: 'shriek' }, { at: .62, id: 'music-dip' },
      { at: .66, id: 'jumpscare' }, { at: .93, id: 'silence' },
    ],
  },
  {
    id: 'twist', vh: 420, label: 'sc_twist',
    cues: [
      { at: .03, who: 'kokila', k: 't1' }, { at: .09, who: 'driver', k: 't2' }, { at: .14, who: 'nar', k: 'tx1' },
      { at: .2, who: 'kokila', k: 't3' }, { at: .27, who: 'driver', k: 't4' }, { at: .33, who: 'kokila', k: 't5' },
      { at: .39, who: 'you', k: 't6' }, { at: .45, who: 'kokila', k: 't7' }, { at: .51, who: 'nar', k: 'tx2' },
      { at: .56, who: 'kokila', k: 't8' }, { at: .61, who: 'you', k: 't9' }, { at: .65, who: 'nar', k: 't10' },
      { at: .69, who: 'kokila', k: 't11' }, { at: .73, who: 'kokila', k: 't12' }, { at: .78, who: 'nar', k: 't13' },
      { at: .83, who: 'kokila', k: 't14' }, { at: .87, who: 'you', k: 't15' }, { at: .9, who: 'kokila', k: 't16' },
      { at: .94, who: 'nar', k: 't17' }, { at: .97, who: 'kokila', k: 't18' },
    ],
    events: [{ at: .02, id: 'comedy' }, { at: .78, id: 'door' }, { at: .94, id: 'yell' }],
  },
  {
    id: 'ticket', vh: 240, label: 'sc_ticket',
    cues: [],
    events: [{ at: .5, id: 'reveal-next' }, { at: .72, id: 'burn' }],
  },
  {
    id: 'end', vh: 220, label: 'sc_end',
    cues: [
      { at: .06, who: 'nar', k: 'e1' }, { at: .2, who: 'driver', k: 'e2' }, { at: .32, who: 'driver', k: 'e3' },
      { at: .46, who: 'big', k: 'fw_end1', behind: true, direct: true }, { at: .58, who: 'big', k: 'fw_end2', direct: true },
      { at: .7, who: 'big', k: 'fw_batt', direct: true },
    ],
    events: [{ at: .06, id: 'laugh' }, { at: .46, id: 'whisper-close' }, { at: .84, id: 'call' }],
  },
];

/** position of a scene by name, so code never depends on scene numbers */
export const sceneIndex = (id: SceneId) => SCENES.findIndex((s) => s.id === id);

/** the games offered at the end of a scene, in order */
export const gamesOf = (s: SceneDef): GameId[] => (s.gameAfter ? (Array.isArray(s.gameAfter) ? s.gameAfter : [s.gameAfter]) : []);

export const TOTAL_VH = SCENES.reduce((s, x) => s + x.vh, 0);

/** start/end of each scene in global progress (0–1) */
export const RANGES = (() => {
  let acc = 0;
  return SCENES.map((s) => {
    const a = acc / TOTAL_VH;
    acc += s.vh;
    return { id: s.id, a, b: acc / TOTAL_VH };
  });
})();

export function sceneAt(p: number): { index: number; local: number } {
  for (let i = 0; i < RANGES.length; i++) {
    const r = RANGES[i];
    if (p < r.b || i === RANGES.length - 1) return { index: i, local: Math.min(1, Math.max(0, (p - r.a) / (r.b - r.a))) };
  }
  return { index: 0, local: 0 };
}

export function cueAt(scene: SceneDef, local: number): Cue | null {
  let found: Cue | null = null;
  for (const c of scene.cues) if (local >= c.at) found = c;
  return found;
}
