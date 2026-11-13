'use client';
import { useSyncExternalStore } from 'react';
import type { Gender, Lang } from '@/data/translations';
import type { GameId } from '@/data/stories/last-passenger';

export type GameResult = 'win' | 'lose' | 'skip';
export type CallState = 'IDLE' | 'CALL_1' | 'DECLINED_1' | 'CALL_2' | 'DECLINED_2' | 'CALL_3' | 'DECLINED_3' | 'KOKILA_JUMPSCARE' | 'FORCED_CALL' | 'ANSWERED' | 'FINAL_CONVERSATION' | 'APPARITION' | 'WHISPER' | 'DONE';
export type Quality = 'high' | 'low';

export interface State {
  entered: boolean;
  safe: boolean;
  reduced: boolean;
  quality: Quality;
  webgl: boolean;
  lang: Lang;
  name: string;
  gender: Gender;
  muted: boolean;
  volume: number;
  sceneIndex: number;
  cueKey: string;
  game: GameId | null;
  results: Partial<Record<GameId, GameResult>>;
  callAccepted: boolean | null;
  callOpen: boolean;
  finished: boolean;
  batt: number | null;
  notice: { id: number; k: string; from: 'unknown' | 'kokila' } | null;
  /** the moment the visitor boarded: one reference time for every story timestamp */
  sessionStart: number | null;
  tz: string;
  hour12: boolean;
  /** Kokila's final call */
  call: CallState;
  declines: number;
  /** which part of the story is playing */
  part: 1 | 2;
  /** Part 2: her two calls (the walk-away call, the petrol-pump call) */
  p2call: 'IDLE' | 'RING' | 'TALK' | 'ENDED';
  p2callN: 0 | 1 | 2;
  /** Part 2 finished: END OF PART TWO */
  p2done: boolean;
}

const initial: State = {
  entered: false, safe: false, reduced: false, quality: 'high', webgl: true,
  lang: 'en', name: '', gender: 'm', muted: false, volume: .8,
  sceneIndex: 0, cueKey: '', game: null, results: {}, callAccepted: null, callOpen: false, finished: false,
  batt: null, notice: null,
  sessionStart: null, tz: 'UTC', hour12: true, call: 'IDLE', declines: 0,
  part: 1, p2call: 'IDLE', p2callN: 0, p2done: false,
};

let state: State = initial;
const subs = new Set<() => void>();

export const store = {
  get: () => state,
  set(patch: Partial<State> | ((s: State) => Partial<State>)) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    let changed = false;
    for (const k in next) if ((next as Record<string, unknown>)[k] !== (state as unknown as Record<string, unknown>)[k]) { changed = true; break; }
    if (!changed) return;
    state = { ...state, ...next };
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(state), () => sel(initial));
}

/** Per-frame values. Read in animation loops; never triggers React renders. */
export const live = {
  p: 0,
  local: 0,
  sceneIndex: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  /** look direction while a game controls the camera (radians) */
  gameYaw: Math.PI,
  gamePitch: 0,
  shake: 0,
  flash: 0,
  flicker: 1,
  /** how many times the visitor scrolled back inside the bus; she gets closer each time */
  lookBacks: 0,
  blackout: 0,
  time: 0,
  /** when set, the stage plays this scene instead of following the scroll (the prototype) */
  override: null as null | { scene: import('@/data/stories/last-passenger').SceneId; t: number; clock?: number },
};

type Listener = (id: string) => void;
const eventSubs = new Set<Listener>();
export const events = {
  emit(id: string) { eventSubs.forEach((f) => f(id)); },
  on(f: Listener) { eventSubs.add(f); return () => { eventSubs.delete(f); }; },
};
