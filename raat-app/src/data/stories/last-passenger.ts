import type { Key } from '@/data/translations';

export type SceneId = 'open' | 'highway' | 'bus' | 'board' | 'inside' | 'driver' | 'reveal' | 'leave' | 'ticket' | 'end' | 'proto'
  | 'p2call' | 'p2cross' | 'p2her' | 'p2haveli' | 'p2banyan' | 'p2build' | 'p2house' | 'p2return' | 'p2pump';
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
  /** which part of the story the scene belongs to (default 1) */
  part?: 1 | 2;
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

  /* ================= PART 2 · THE CIRCLE ================= */
  {
    // the same highway; the bus is gone. Her call: walk away, don't look back. The visitor walks.
    id: 'p2call', vh: 300, label: 'sc_p2call', part: 2,
    cues: [
      { at: .03, who: 'nar', k: 'p2_a1' }, { at: .1, who: 'nar', k: 'p2_a2' },
      { at: .3, who: 'nar', k: 'p2_a4' }, { at: .55, who: 'nar', k: 'p2_a5' },
    ],
    events: [{ at: .01, id: 'p2-night' }, { at: .12, id: 'dog-cry' }, { at: .18, id: 'p2-call-1' }, { at: .3, id: 'p2-walk' }, { at: .55, id: 'anklet' }, { at: .64, id: 'breath-far' }, { at: .8, id: 'p2-walk' }],
  },
  {
    // a deserted crossroads; a circle of water on the road; offerings; a diya; a doll. Someone across the road.
    id: 'p2cross', vh: 420, label: 'sc_p2cross', part: 2,
    cues: [
      { at: .03, who: 'big', k: 'p2_b1' }, { at: .16, who: 'nar', k: 'p2_b2' }, { at: .32, who: 'nar', k: 'p2_b3' },
      { at: .5, who: 'nar', k: 'p2_b4' }, { at: .66, who: 'nar', k: 'p2_b5' }, { at: .86, who: 'nar', k: 'p2_b6' },
    ],
    events: [{ at: .02, id: 'p2-walk' }, { at: .2, id: 'dog-cry' }, { at: .4, id: 'diya' }, { at: .55, id: 'metal-ring' }, { at: .7, id: 'diya' }, { at: .86, id: 'rumble' }],
  },
  {
    // she comes closer every time; then her face; the warning; the diya dies; run
    id: 'p2her', vh: 400, label: 'sc_p2her', part: 2,
    cues: [
      { at: .04, who: 'nar', k: 'p2_c1' }, { at: .22, who: 'nar', k: 'p2_c2' }, { at: .4, who: 'nar', k: 'p2_c3' },
      { at: .55, who: 'her', k: 'p2_c4', direct: true, voice: 'close', from: .1 }, { at: .7, who: 'nar', k: 'p2_c5' }, { at: .82, who: 'big', k: 'p2_c6' },
    ],
    events: [
      { at: .1, id: 'her-step' }, { at: .2, id: 'her-step' }, { at: .3, id: 'her-step' }, { at: .4, id: 'her-step' }, { at: .5, id: 'breath-close' },
      { at: .7, id: 'diya-out' }, { at: .82, id: 'p2-run' },
    ],
  },
  {
    // the haveli: knock once, knock twice; the chain falls; the door opens on its own
    id: 'p2haveli', vh: 340, label: 'sc_p2haveli', part: 2,
    cues: [
      { at: .04, who: 'nar', k: 'p2_d1' }, { at: .25, who: 'nar', k: 'p2_d2' }, { at: .42, who: 'nar', k: 'p2_d3' },
      { at: .6, who: 'nar', k: 'p2_d4' }, { at: .82, who: 'nar', k: 'p2_d5' },
    ],
    events: [{ at: .02, id: 'p2-run-stop' }, { at: .26, id: 'knock-1' }, { at: .43, id: 'knock-2' }, { at: .58, id: 'chain' }, { at: .62, id: 'door-wood' }, { at: .85, id: 'steps-stone' }],
  },
  {
    // the banyan in the courtyard; something creaks above; eleven of them; she is behind {N}
    id: 'p2banyan', vh: 460, label: 'sc_p2banyan', part: 2,
    cues: [
      { at: .03, who: 'nar', k: 'p2_e1' }, { at: .15, who: 'nar', k: 'p2_e2' }, { at: .25, who: 'nar', k: 'p2_e3' },
      { at: .35, who: 'nar', k: 'p2_e4' }, { at: .45, who: 'nar', k: 'p2_e5' }, { at: .54, who: 'nar', k: 'p2_e6' }, { at: .6, who: 'big', k: 'p2_e7' },
      { at: .67, who: 'nar', k: 'p2_e8' }, { at: .75, who: 'nar', k: 'p2_e9' },
      { at: .82, who: 'her', k: 'i_name', direct: true, voice: 'whisper', from: 'behind' },
      { at: .88, who: 'her', k: 'p2_e10', direct: true, voice: 'close', from: 'behind' },
    ],
    events: [
      { at: .02, id: 'leaves' }, { at: .15, id: 'rope-creak' }, { at: .3, id: 'rope-creak' }, { at: .5, id: 'leaves' }, { at: .62, id: 'rope-creak' },
      { at: .69, id: 'metal-impact' }, { at: .72, id: 'p2-silence' }, { at: .76, id: 'breath-close' }, { at: .96, id: 'p2-run' },
    ],
  },
  {
    // the unfinished building: she stands on a floor and does not come down; a message; she is gone; concrete falls
    id: 'p2build', vh: 340, label: 'sc_p2build', part: 2,
    cues: [
      { at: .04, who: 'nar', k: 'p2_f1' }, { at: .22, who: 'nar', k: 'p2_f2' }, { at: .5, who: 'nar', k: 'p2_f3' },
      { at: .66, who: 'nar', k: 'p2_f4' }, { at: .8, who: 'big', k: 'p2_c6' },
    ],
    events: [{ at: .02, id: 'p2-run-stop' }, { at: .3, id: 'metal-vibe' }, { at: .38, id: 'msg-run' }, { at: .66, id: 'debris' }, { at: .8, id: 'p2-run' }],
  },
  {
    // the locked house: the ritual at the door; a doll with {N}'s name; DO NOT ENTER; knocks from inside
    id: 'p2house', vh: 420, label: 'sc_p2house', part: 2,
    cues: [
      { at: .03, who: 'nar', k: 'p2_g1' }, { at: .13, who: 'nar', k: 'p2_g2' }, { at: .26, who: 'nar', k: 'p2_g3' }, { at: .36, who: 'nar', k: 'p2_g4' },
      { at: .66, who: 'nar', k: 'p2_g5' }, { at: .78, who: 'nar', k: 'p2_g6' }, { at: .9, who: 'big', k: 'p2_c6' },
    ],
    events: [{ at: .02, id: 'p2-run-stop' }, { at: .1, id: 'ritual-move' }, { at: .3, id: 'doll-amb' }, { at: .52, id: 'msg-enter' }, { at: .66, id: 'knocks-inside' }, { at: .78, id: 'knocks-inside' }, { at: .9, id: 'p2-run' }],
  },
  {
    // back on the four-lane highway: the same lamps; a dim light far away
    id: 'p2return', vh: 320, label: 'sc_p2return', part: 2,
    cues: [{ at: .05, who: 'nar', k: 'p2_h1' }, { at: .35, who: 'nar', k: 'p2_h2' }, { at: .7, who: 'nar', k: 'p2_h3' }],
    events: [{ at: .02, id: 'p2-run-stop' }, { at: .2, id: 'traffic' }, { at: .45, id: 'p2-walk' }, { at: .75, id: 'p2-walk' }],
  },
  {
    // the petrol pump; her last call; the bike; the tank is empty
    id: 'p2pump', vh: 420, label: 'sc_p2pump', part: 2,
    cues: [
      { at: .04, who: 'nar', k: 'p2_i1' }, { at: .5, who: 'nar', k: 'p2_i2' }, { at: .6, who: 'nar', k: 'p2_i3' },
      { at: .72, who: 'nar', k: 'p2_i4' }, { at: .8, who: 'nar', k: 'p2_i5' }, { at: .88, who: 'nar', k: 'p2_i6' },
    ],
    events: [{ at: .2, id: 'p2-call-2' }, { at: .62, id: 'tank-open' }, { at: .88, id: 'laugh' }, { at: .97, id: 'p2-end' }],
  },
];

/** position of a scene by name, so code never depends on scene numbers */
export const sceneIndex = (id: SceneId) => SCENES.findIndex((s) => s.id === id);

/** the games offered at the end of a scene, in order */
export const gamesOf = (s: SceneDef): GameId[] => (s.gameAfter ? (Array.isArray(s.gameAfter) ? s.gameAfter : [s.gameAfter]) : []);

/** which part is playing: the scroll track only covers that part's scenes */
let activePart: 1 | 2 = 1;
export const partOf = (s: SceneDef): 1 | 2 => s.part ?? 1;
const windowOf = (part: 1 | 2) => SCENES.map((s, i) => (partOf(s) === part ? i : -1)).filter((i) => i >= 0);

/** scroll length of the active part, in viewport heights */
export let TOTAL_VH = 0;
/** start/end of each scene in the active part's progress (0–1); scenes of the other part sit at -1 */
export let RANGES: { id: SceneId; a: number; b: number }[] = [];

export function setPart(part: 1 | 2) {
  activePart = part;
  const win = windowOf(part);
  TOTAL_VH = win.reduce((sum, i) => sum + SCENES[i].vh, 0);
  let acc = 0;
  RANGES = SCENES.map((s) => {
    if (partOf(s) !== part) return { id: s.id, a: -1, b: -1 };
    const a = acc / TOTAL_VH; acc += s.vh;
    return { id: s.id, a, b: acc / TOTAL_VH };
  });
}
setPart(1);
export const currentPart = () => activePart;
/** the first scene of a part */
export const firstOf = (part: 1 | 2) => windowOf(part)[0];

export function sceneAt(p: number): { index: number; local: number } {
  const win = windowOf(activePart);
  for (let n = 0; n < win.length; n++) {
    const i = win[n], r = RANGES[i];
    if (p < r.b || n === win.length - 1) return { index: i, local: Math.min(1, Math.max(0, (p - r.a) / (r.b - r.a))) };
  }
  return { index: win[0], local: 0 };
}

export function cueAt(scene: SceneDef, local: number): Cue | null {
  let found: Cue | null = null;
  for (const c of scene.cues) if (local >= c.at) found = c;
  return found;
}
