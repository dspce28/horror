'use client';
import { live, store } from '@/lib/store';
import { scroll } from '@/lib/scroll';
import { audio } from '@/lib/audio/engine';
import { resetVoices } from '@/lib/audio/voice';
import { beginSession, clearSession, save } from '@/lib/session';
import { firstOf, setPart } from '@/data/stories/last-passenger';

/**
 * Back to the beginning of Part 1 without reloading. Keeps the visitor's language, name, gender, scare mode
 * and sound settings; resets story progress, games, the call and its decline count, and starts a new story clock.
 */
export function replayStory() {
  audio.hush(); audio.stopRing(); audio.setLine(0); audio.restoreMusic();
  setPart(1);
  store.set({ results: {}, callAccepted: null, callOpen: false, finished: false, game: null, call: 'IDLE', declines: 0, sessionStart: null, notice: null, part: 1, p2call: 'IDLE', p2callN: 0, p2done: false, sceneIndex: 0 });
  live.sceneIndex = 0; live.local = 0;
  clearSession(); beginSession(); resetVoices();
  live.lookBacks = 0;
  scroll.lock(false);
  scroll.toProgress(0);
}

/**
 * Part 2 starts where Part 1 left the visitor: on the same road, after her call. Name, language, gender, scare mode,
 * sound and the story clock all carry over; the scroll track now covers Part 2's scenes only.
 */
export function startPart2() {
  audio.hush(); audio.stopRing(); audio.setLine(0); audio.restoreMusic();
  setPart(2);
  const first = firstOf(2);
  live.sceneIndex = first; live.local = 0; live.lookBacks = 0;
  store.set({ part: 2, finished: false, callOpen: false, notice: null, game: null, p2call: 'IDLE', p2callN: 0, p2done: false, sceneIndex: first, cueKey: '' });
  if (!store.get().sessionStart) beginSession();
  save();
  scroll.lock(false);
  // the track is resized for Part 2 on the next render; go to its top after that
  window.setTimeout(() => scroll.toProgress(0), 60);
}
