'use client';
import { live, store } from '@/lib/store';
import { scroll } from '@/lib/scroll';
import { audio } from '@/lib/audio/engine';
import { resetVoices } from '@/lib/audio/voice';
import { beginSession, clearSession } from '@/lib/session';

/**
 * Back to the beginning of Part 1 without reloading. Keeps the visitor's language, name, gender, scare mode
 * and sound settings; resets story progress, games, the call and its decline count, and starts a new story clock.
 */
export function replayStory() {
  audio.hush(); audio.stopRing(); audio.setLine(0); audio.restoreMusic();
  store.set({ results: {}, callAccepted: null, callOpen: false, finished: false, game: null, call: 'IDLE', declines: 0, sessionStart: null, notice: null });
  clearSession(); beginSession(); resetVoices();
  live.lookBacks = 0;
  scroll.lock(false);
  scroll.toProgress(0);
}
