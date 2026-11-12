'use client';
import { RANGES, SCENES, type GameId } from '@/data/stories/last-passenger';
import { store, type GameResult } from '@/lib/store';
import { scroll } from '@/lib/scroll';

/** Close a mini-game, record the result and hand the scroll back to the story. */
export function finishGame(id: GameId, result: GameResult) {
  store.set((s) => ({ game: null, results: { ...s.results, [id]: result } }));
  scroll.lock(false);
  const i = SCENES.findIndex((s) => s.gameAfter === id);
  if (i >= 0) window.setTimeout(() => scroll.toProgress(RANGES[i].b + .004, false), 60);
}
