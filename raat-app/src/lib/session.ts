'use client';
// The story session: when the visitor boarded, in their own time zone, plus the state of
// Kokila's call. Kept in sessionStorage so scrolling, language changes or a reload don't reset it.
import { store, type CallState, type GameResult } from '@/lib/store';
import type { Lang } from '@/data/translations';
import type { GameId } from '@/data/stories/last-passenger';

const KEY = 'raat-session';

interface Saved { start: number; tz: string; hour12: boolean; call: CallState; declines: number; results: Partial<Record<GameId, GameResult>> }

/** Called once, when the visitor presses the final boarding button. */
export function beginSession() {
  store.set({ sessionStart: Date.now(), ...deviceClock() });
  save();
}

/** The visitor's own time zone and 12/24-hour habit, read from the device. */
function deviceClock(): { tz: string; hour12: boolean } {
  try {
    const ro = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
    return { tz: ro.timeZone || 'UTC', hour12: ro.hour12 ?? (ro.hourCycle ? ro.hourCycle.startsWith('h1') : true) };
  } catch { return { tz: 'UTC', hour12: true }; }
}

export function restoreSession() {
  try {
    const raw = sessionStorage.getItem(KEY); if (!raw) return;
    const s = JSON.parse(raw) as Saved;
    // a call in progress is parked (not reopened on page load); the decline count is kept
    store.set({ sessionStart: s.start, tz: s.tz, hour12: s.hour12, call: s.call === 'DONE' ? 'DONE' : 'IDLE', declines: s.declines, results: s.results ?? {} });
  } catch { /* nothing saved */ }
}

export function save() {
  const s = store.get(); if (!s.sessionStart) return;
  const v: Saved = { start: s.sessionStart, tz: s.tz, hour12: s.hour12, call: s.call, declines: s.declines, results: s.results };
  try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ }
}

export function clearSession() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }

const LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };

/** Format a story time the same way everywhere: the visitor's zone, their 12/24-hour habit, the story language. */
export function storyTime(ts: number | null, lang: Lang): string {
  const s = store.get();
  const when = ts ?? Date.now();
  // before boarding there is no session yet: read the device directly (the store only has SSR defaults)
  const c = s.sessionStart ? { tz: s.tz, hour12: s.hour12 } : deviceClock();
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit', hour12: c.hour12, timeZone: c.tz }).format(when);
  } catch {
    const d = new Date(when); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
