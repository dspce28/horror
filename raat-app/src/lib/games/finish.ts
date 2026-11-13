'use client';
import { RANGES, SCENES, gamesOf, type GameId } from '@/data/stories/last-passenger';
import { store, type GameResult } from '@/lib/store';
import { scroll } from '@/lib/scroll';
import { save } from '@/lib/session';

/** Close a mini-game, record the result, then open the scene's next game or hand the scroll back. */
export function finishGame(id: GameId, result: GameResult) {
  const results = { ...store.get().results, [id]: result };
  const i = SCENES.findIndex((s) => gamesOf(s).includes(id));
  const next = i >= 0 ? gamesOf(SCENES[i]).find((g) => !results[g]) : undefined;
  store.set({ results, game: next ?? null });
  save();
  if (next) return;
  scroll.lock(false);
  if (i >= 0) window.setTimeout(() => scroll.toProgress(RANGES[i].b + .004, false), 60);
}
