'use client';
// Character voices in the browser: fetch a line from /api/voice (once per session), play it through the
// audio director (one voice at a time, ducking, placement), and fall back to subtitles when there is no voice.
import { audio } from './engine';
import { VOICED, cleanName } from './lines';
import { store } from '@/lib/store';
import { en, type Key } from '@/data/translations/en';

export interface SayOpts { from?: number | 'behind'; phone?: boolean }

/** null: not asked yet · true: voices work · false: no provider / failed, play with subtitles only */
let available: boolean | null = null;
const cache = new Map<string, Promise<AudioBuffer | null>>();
let last: { k: Key; o: SayOpts } | null = null;

export const isVoiced = (k: Key) => k in VOICED;
export const lastLine = () => last;

function url(k: Key): string {
  const s = store.get();
  const q = new URLSearchParams({ k, l: s.lang, g: s.gender });
  if (en[k].includes('{N}')) q.set('n', cleanName(s.name));
  return `/api/voice?${q}`;
}

let probing: Promise<boolean> | null = null;
/** ask the server once whether any voice provider is configured */
function probe(): Promise<boolean> {
  if (available !== null) return Promise.resolve(available);
  if (!probing) probing = fetch('/api/voice', { cache: 'no-store' }).then((r) => r.json()).then((j: { available?: boolean }) => (available = !!j.available)).catch(() => (available = false));
  return probing;
}
export const voicesAvailable = () => available;

// real recordings (public/audio/voices/manifest.json) take precedence over generated voices
let recorded: Promise<Set<string>> | null = null;
function recordedLines(): Promise<Set<string>> {
  if (!recorded) recorded = fetch('/audio/voices/manifest.json').then((r) => (r.ok ? r.json() : { lines: [] })).then((j: { lines?: string[] }) => new Set(j.lines ?? [])).catch(() => new Set<string>());
  return recorded;
}

async function load(k: Key): Promise<AudioBuffer | null> {
  if (!audio.ok) return null;
  const lang = store.get().lang, who = VOICED[k]?.who;
  if (who && (await recordedLines()).has(`${k}-${lang}`)) return loadUrl(`/audio/voices/${who}/${k}-${lang}.mp3`);
  if (!(await probe())) return null;
  return loadUrl(url(k));
}
function loadUrl(u: string): Promise<AudioBuffer | null> {
  let p = cache.get(u);
  if (!p) {
    p = (async () => {
      const ctl = new AbortController(); const timer = window.setTimeout(() => ctl.abort(), 8000); // a slow network must not hold the story
      try {
        const r = await fetch(u, { signal: ctl.signal });
        if (r.status === 503) { available = false; return null; } // provider failed: subtitles from here on
        if (!r.ok) return null;
        const buf = await audio.ctx!.decodeAudioData(await r.arrayBuffer());
        available = true; return buf;
      } catch { return null; } finally { window.clearTimeout(timer); }
    })();
    cache.set(u, p);
    p.then((b) => { if (!b) cache.delete(u); }); // a failure can be retried later
  }
  return p;
}

/** warm the cache for lines coming up soon */
export function preload(keys: Key[]) { keys.filter(isVoiced).forEach((k) => { void load(k); }); }

/**
 * Say a line in its character's voice. Resolves with the clip length in seconds, or 0 if there is no voice
 * (the subtitles carry the line, so the story never waits on audio).
 */
export async function say(k: Key, o: SayOpts = {}): Promise<number> {
  const line = VOICED[k]; if (!line) return 0;
  last = { k, o };
  const buf = await load(k);
  if (!buf) return 0;
  return audio.speak(buf, { from: o.from, phone: o.phone ?? line.style === 'phone', whisper: line.style === 'whisper', gain: line.style === 'whisper' ? 1.15 : 1 });
}

/** play the last line again (the replay button) */
export function replay() { if (last) void say(last.k, last.o); }

/** forget voices made for an old name or language (the cache key includes both, so this only frees memory) */
export function resetVoices() { cache.clear(); last = null; }

/** wait while a clip plays; with no clip, wait long enough to read the subtitle */
export async function sayAndWait(k: Key, o: SayOpts = {}, readMs = 2600): Promise<void> {
  const d = await say(k, o);
  await new Promise((r) => window.setTimeout(r, d > 0 ? d * 1000 + 250 : readMs));
}
