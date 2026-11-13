import type { Key } from '@/data/translations';

export type SceneId = 'open' | 'highway' | 'bus' | 'board' | 'inside' | 'driver' | 'reveal' | 'leave' | 'ticket' | 'end' | 'proto';
export type Speaker = 'nar' | 'big' | 'you' | 'driver' | 'her' | 'kokila' | 'phone';
/** how a voiced line is delivered */
export type Delivery = 'normal' | 'whisper' | 'close';
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
  /** spoken aloud by a character's voice (Kokila or Ramesh); how it is delivered */
  voice?: Delivery;
  /** where the voice comes from: -1 left … 1 right; 'behind' puts it just behind the listener */
  from?: number | 'behind';
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
    // black: night ambience, a breath, a low rumble; one line
    id: 'open', vh: 120, label: 'sc_warning',
    cues: [{ at: .14, who: 'big', k: 'o1' }],
    events: [{ at: .02, id: 'night' }, { at: .3, id: 'dog-cry' }, { at: .5, id: 'breath-far' }],
  },
  {
    id: 'highway', vh: 300, label: 'sc_highway',
    cues: [
      // timed to the camera: the road first, the visitor from about two-thirds in, headlights at the end
      { at: .06, who: 'big', k: 'h2' }, { at: .17, who: 'phone', k: 'fw_time', direct: true }, { at: .27, who: 'nar', k: 'h7' },
      { at: .38, who: 'nar', k: 'h4' }, { at: .5, who: 'nar', k: 'h4b' }, { at: .64, who: 'big', k: 'h1' }, { at: .73, who: 'phone', k: 'h3' },
      { at: .79, who: 'you', k: 'h5' }, { at: .86, who: 'nar', k: 'h8' }, { at: .94, who: 'big', k: 'h9' },
    ],
    events: [
      { at: .02, id: 'bike-ride' }, { at: .17, id: 'ping' }, { at: .27, id: 'dog-cry' }, { at: .38, id: 'bike-sputter' }, { at: .5, id: 'bike-stop' },
      { at: .73, id: 'ping' }, { at: .62, id: 'dog-cry' }, { at: .86, id: 'engine-far' }, { at: .3, id: 'hum-far' }, { at: .56, id: 'subliminal-upside' },
    ],
  },
  {
    id: 'bus', vh: 240, label: 'sc_bus',
    cues: [{ at: .04, who: 'nar', k: 'b1' }, { at: .3, who: 'you', k: 'b2' }, { at: .78, who: 'nar', k: 'bd1' }],
    events: [{ at: .12, id: 'dog-cry' }, { at: .22, id: 'horn' }, { at: .4, id: 'brake' }, { at: .54, id: 'stop' }],
  },
  {
    // boarding: the door opens, the driver asks, the visitor climbs in; the cut hides in the doorway's light
    id: 'board', vh: 380, label: 'sc_board',
    cues: [
      { at: .05, who: 'driver', k: 'b3', voice: 'normal', from: .3 }, { at: .13, who: 'you', k: 'b4' }, { at: .2, who: 'driver', k: 'b5', voice: 'normal', from: .3 },
      { at: .28, who: 'you', k: 'b6' }, { at: .35, who: 'driver', k: 'b7', voice: 'normal', from: .3 }, { at: .43, who: 'nar', k: 'b8' },
      { at: .58, who: 'nar', k: 'bd5' }, { at: .68, who: 'her', k: 'i_name', direct: true, voice: 'whisper', from: 'behind' }, { at: .81, who: 'nar', k: 'bd3' }, { at: .9, who: 'nar', k: 'bd2' },
    ],
    events: [{ at: .02, id: 'door-open' }, { at: .44, id: 'steps-metal' }, { at: .6, id: 'steps-metal' }, { at: .9, id: 'door-close' }],
  },
  {
    // the last passenger, revealed a little at a time: an empty seat, a reflection, her voice, a silhouette, closer
    id: 'inside', vh: 380, label: 'sc_inside',
    cues: [
      { at: .03, who: 'nar', k: 'i1' }, { at: .12, who: 'nar', k: 'i2' }, { at: .22, who: 'nar', k: 'i3' },
      { at: .31, who: 'nar', k: 'i4' }, { at: .4, who: 'nar', k: 'i5' },
      { at: .5, who: 'her', k: 'i_name', direct: true, voice: 'whisper', from: 'behind' }, { at: .58, who: 'nar', k: 'i6' },
      { at: .66, who: 'her', k: 'i7', direct: true, voice: 'whisper', from: 'behind' }, { at: .76, who: 'nar', k: 'i8' },
      { at: .84, who: 'nar', k: 'i9' }, { at: .9, who: 'nar', k: 'i9b' }, { at: .95, who: 'her', k: 'i10', behind: true, direct: true, voice: 'whisper', from: .6 },
    ],
    events: [
      { at: .12, id: 'seat-spring' }, { at: .31, id: 'engine-start' }, { at: .4, id: 'fabric' }, { at: .48, id: 'hush' }, { at: .62, id: 'breath-close' },
      { at: .72, id: 'creak-back' }, { at: .835, id: 'stutter' }, { at: .9, id: 'fabric' }, { at: .97, id: 'blackout' },
      { at: .37, id: 'bangles' }, { at: .78, id: 'bangles' }, { at: .885, id: 'bangles' },
    ],
    gameAfter: ['hunt'],
  },
  {
    // Ramesh's warning; then the photograph behind his mirror and the drawer under his dashboard
    id: 'driver', vh: 320, label: 'sc_driver',
    cues: [
      { at: .04, who: 'nar', k: 'd1' }, { at: .13, who: 'you', k: 'd2' }, { at: .22, who: 'nar', k: 'd3' },
      { at: .31, who: 'driver', k: 'd4', voice: 'normal', from: .2 }, { at: .4, who: 'you', k: 'd5' }, { at: .49, who: 'nar', k: 'd6' },
      { at: .6, who: 'driver', k: 'd7', voice: 'normal', from: .2 }, { at: .7, who: 'driver', k: 'fw_watch', direct: true, voice: 'normal' },
      { at: .8, who: 'nar', k: 'd8' }, { at: .9, who: 'nar', k: 'd9' },
    ],
    events: [{ at: .22, id: 'creak-metal' }, { at: .27, id: 'mirror' }, { at: .26, id: 'bangles' }, { at: .49, id: 'breath-close' }, { at: .7, id: 'stare' }, { at: .9, id: 'breath-close' }],
    gameAfter: ['photo', 'cabin'],
  },
  {
    // the reveal: one strong supernatural moment, built from silence, reflections and her getting closer
    id: 'reveal', vh: 340, label: 'sc_encounter',
    cues: [
      { at: .04, who: 'nar', k: 'r1' }, { at: .14, who: 'nar', k: 'r2' }, { at: .24, who: 'nar', k: 'r3' },
      { at: .34, who: 'driver', k: 'r4', voice: 'normal', from: .2 }, { at: .43, who: 'nar', k: 'r5' },
      { at: .53, who: 'her', k: 'r6', voice: 'whisper', from: -.4 }, { at: .62, who: 'nar', k: 'r7' },
      { at: .72, who: 'her', k: 'r8', voice: 'close', from: 'behind' }, { at: .81, who: 'nar', k: 'r9' }, { at: .9, who: 'nar', k: 'r10' },
    ],
    events: [
      { at: .04, id: 'lights-die' }, { at: .14, id: 'engine-cut' }, { at: .44, id: 'seat-spring' }, { at: .24, id: 'driver-turn' }, { at: .43, id: 'heartbeat' },
      { at: .62, id: 'fabric' }, { at: .81, id: 'jumpscare' }, { at: .9, id: 'lights-back' }, { at: .58, id: 'bangles' }, { at: .68, id: 'hum-close' }, { at: .525, id: 'window-tap' }, { at: .565, id: 'window-tap' }, { at: .62, id: 'window-tap' },
    ],
  },
  {
    // the bus stops; {N} gets off; the fog takes the bus
    id: 'leave', vh: 360, label: 'sc_leave',
    cues: [
      { at: .03, who: 'nar', k: 'l1' }, { at: .12, who: 'nar', k: 'l2' }, { at: .21, who: 'nar', k: 'l3' }, { at: .31, who: 'nar', k: 'l4' },
      { at: .41, who: 'nar', k: 'l5' }, { at: .455, who: 'her', k: 'i_name', direct: true, voice: 'whisper', from: 'behind' }, { at: .5, who: 'nar', k: 'l6' }, { at: .58, who: 'nar', k: 'l7' },
      { at: .66, who: 'nar', k: 'l8' }, { at: .78, who: 'nar', k: 'l9' }, { at: .9, who: 'nar', k: 'l10' },
    ],
    events: [
      { at: .03, id: 'bus-slow' }, { at: .31, id: 'door-open' }, { at: .41, id: 'steps-metal' }, { at: .5, id: 'door-close' },
      { at: .58, id: 'bus-away' }, { at: .74, id: 'horn-far' }, { at: .9, id: 'silence' }, { at: .18, id: 'bangles' },
    ],
  },
  {
    // in {N}'s pocket: a ticket that wasn't there before
    id: 'ticket', vh: 240, label: 'sc_ticket',
    cues: [{ at: .02, who: 'nar', k: 'k1' }],
    events: [{ at: .5, id: 'reveal-next' }, { at: .72, id: 'burn' }, { at: .3, id: 'subliminal-window' }],
  },
  {
    // the road, the phone. The rest (the call, her, the whisper, the end) is a timed sequence: see FinalCall
    id: 'end', vh: 200, label: 'sc_end',
    cues: [{ at: .05, who: 'nar', k: 'c1' }, { at: .22, who: 'nar', k: 'c2' }],
    events: [{ at: .22, id: 'vibrate' }, { at: .4, id: 'call' }],
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
