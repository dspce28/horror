'use client';
// The story session: when the visitor boarded, in their own time zone, plus the state of
// Kokila's call. Kept in sessionStorage so scrolling, language changes or a reload don't reset it.
import { store, type CallState, type GameResult } from '@/lib/store';
import type { Lang } from '@/data/translations';
import { setPart, type GameId } from '@/data/stories/last-passenger';

const KEY = 'raat-session';

interface Saved { start: number; tz: string; hour12: boolean; call: CallState; declines: number; results: Partial<Record<GameId, GameResult>>; part?: 1 | 2 }

/**
 * THE story clock. Called once, when the visitor presses Begin: captures their local time, time zone and
 * 12/24-hour habit. Every time shown anywhere in the story comes from this one reference (see storyTime).
 * A reload keeps the original start.
 */
export function beginSession() {
  if (store.get().sessionStart) return;
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
    // a visitor who reached Part 2 comes back to Part 2 (from its start)
    if (s.part === 2) { setPart(2); store.set({ part: 2 }); }
  } catch { /* nothing saved */ }
}

export function save() {
  const s = store.get(); if (!s.sessionStart) return;
  const v: Saved = { start: s.sessionStart, tz: s.tz, hour12: s.hour12, call: s.call, declines: s.declines, results: s.results, part: s.part };
  try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ }
}

export function clearSession() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }

const LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };

/**
 * Every time on screen comes from here, formatted the same way: the visitor's zone, their 12/24-hour habit,
 * the story language.
 * - 'start': the moment the visitor began (opening narration, lock screen, the ticket).
 * - 'now':   that same start plus the minutes elapsed since (notifications and the final call, which happen later).
 * Before the visitor begins there is no session yet, so both read the device clock.
 */
export function storyTime(kind: 'start' | 'now', lang: Lang): string {
  const s = store.get();
  const start = s.sessionStart;
  const when = start == null ? Date.now() : kind === 'start' ? start : start + Math.floor((Date.now() - start) / 60000) * 60000;
  const c = start ? { tz: s.tz, hour12: s.hour12 } : deviceClock();
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit', hour12: c.hour12, timeZone: c.tz }).format(when);
  } catch {
    const d = new Date(when); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/** The hour (0–23) at the story's start, in the visitor's zone: decides whether the ghost says "night" or "day". */
export function storyHour(): number {
  const s = store.get();
  const c = s.sessionStart ? { tz: s.tz, hour12: s.hour12 } : deviceClock();
  try { return +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: c.tz }).format(s.sessionStart ?? Date.now()); } catch { return new Date().getHours(); }
}
