'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';
import AtmosphereCanvas from '@/components/fx/AtmosphereCanvas';
import RevealText from '@/components/ui/RevealText';
import { useT } from '@/hooks/useT';
import { live, store, useStore } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { guessGender } from '@/lib/gender';
import { beginSession, storyTime } from '@/lib/session';
import { LANGS } from '@/data/translations';
import { film } from '@/lib/film/clock';
import { CUES, LENGTH, LINES, PHONE, type CueId } from '@/lib/film/highway';

const HighwayFilm = dynamic(() => import('@/components/film/HighwayFilm'), { ssr: false });

function playCue(id: CueId) {
  switch (id) {
    case 'breath': audio.breath(); break;
    case 'wind': audio.whisper(-.7, .35); break;
    case 'bark': audio.bark(); break;
    case 'ping': audio.ping(); try { if (navigator.vibrate) navigator.vibrate([60, 80, 60]); } catch { /* unsupported */ } break;
    case 'engine': break;
    case 'brake': audio.brake(); film.shake = 1.2; break;
    case 'stop': film.shake = .7; audio.thump(.4, 70); break;
    case 'door': audio.door(); break;
    case 'steps': audio.steps(3); break;
  }
}

/**
 * Milestone 1: a 44-second film of the highway. Plays by itself; the only control is sound.
 * ?capture=1 exposes window.__seek(seconds) for frame-exact video export.
 */
export default function Prototype() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const name = useStore((s) => s.name);
  const gender = useStore((s) => s.gender);
  const muted = useStore((s) => s.muted);
  const reduced = useStore((s) => s.reduced);
  const sessionStart = useStore((s) => s.sessionStart);
  const [phase, setPhase] = useState<'start' | 'play' | 'done'>('start');
  const [time, setTime] = useState(0);
  const [small, setSmall] = useState(false);
  const clock = useRef({ last: 0, paused: false, fired: new Set<number>() });
  const chosen = useRef(false);
  const [capture, setCapture] = useState(false);

  useEffect(() => {
    const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let n = ''; try { n = localStorage.getItem('raat-name') ?? ''; } catch { /* private mode */ }
    const guess = /^gu/i.test(navigator.language) ? 'gu' : /^hi/i.test(navigator.language) ? 'hi' : 'en';
    store.set({ reduced: r, entered: true, name: n, gender: guessGender(n), lang: guess });
    setSmall(window.innerWidth < 900);
    setCapture(new URLSearchParams(window.location.search).has('capture'));
    return () => { audio.setEngine(0); };
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    const onMove = (e: PointerEvent) => { live.pointer.x = (e.clientX / innerWidth) * 2 - 1; live.pointer.y = (e.clientY / innerHeight) * 2 - 1; };
    addEventListener('pointermove', onMove, { passive: true });
    return () => removeEventListener('pointermove', onMove);
  }, []);

  const seek = useCallback((s: number) => {
    film.t = Math.max(0, Math.min(LENGTH, s));
    clock.current.fired = new Set(CUES.map((c, i) => (c[0] < film.t ? i : -1)).filter((i) => i >= 0));
    setTime(film.t);
  }, []);

  useEffect(() => {
    if (!capture) return;
    (window as unknown as { __seek: (s: number) => void }).__seek = (s: number) => { setPhase('play'); seek(s); };
  }, [capture, seek]);

  // the clock: a hidden Space key pauses, nothing else on screen
  useEffect(() => {
    if (phase !== 'play' || capture) return;
    let raf = 0; const c = clock.current; c.last = performance.now();
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); c.paused = !c.paused; if (c.paused) audio.setEngine(0); } };
    addEventListener('keydown', onKey);
    const loop = (now: number) => {
      const dt = (now - c.last) / 1000; c.last = now;
      if (!c.paused) {
        film.t = Math.min(LENGTH, film.t + dt);
        CUES.forEach(([at, id], i) => { if (film.t >= at && !c.fired.has(i)) { c.fired.add(i); playCue(id); } });
        const s = film.t;
        // engine: out of the fog from 27 s, loudest as it brakes, then idling
        audio.setEngine(s < 27 ? 0 : s < 34.4 ? (s - 27) / 7.4 * .9 : s < 38.6 ? .4 : .3, s < 34.4 ? .3 + (s - 27) / 7.4 * .45 : .2);
        audio.dread(s < 26 ? .25 : .5);
        setTime(s);
        if (s >= LENGTH) { setPhase('done'); audio.setEngine(0); return; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); };
  }, [phase, capture]);

  const start = () => {
    audio.init(); audio.setMuted(store.get().muted); audio.startBed(); audio.loadTheme('/raat/audio/theme.mp4'); audio.themeLevel(.12);
    try { localStorage.setItem('raat-name', store.get().name); } catch { /* private mode */ }
    beginSession(); seek(0); clock.current.paused = false; setPhase('play');
  };
  const toggleSound = () => { audio.init(); const m = !muted; audio.setMuted(m); store.set({ muted: m }); };

  const line = LINES.find((l) => time >= l.from && time < l.to);
  const who = line?.kind === 'you' ? (name.trim() || t('default_name')) : line?.kind === 'driver' ? t('sp_driver') : null;
  const phoneOn = time >= PHONE.from && time < PHONE.to;
  const blackIn = phase !== 'start' ? Math.max(0, 1 - Math.max(0, time - 4.2) / 1.6) : 0;
  const blackOut = phase !== 'start' ? Math.min(1, Math.max(0, time - (LENGTH - 1.4)) / 1.4) : 0;

  return (
    <main className={`lang-${lang} relative h-[100svh] overflow-hidden bg-ink text-bone`}>
      {phase !== 'start' && <HighwayFilm gender={gender} small={small} reduced={reduced} />}
      {/* opening black: grain and drifting fog, then it opens onto the road */}
      {phase !== 'start' && <div className="pointer-events-none fixed inset-0 bg-ink" style={{ opacity: Math.max(blackIn, blackOut) }}><AtmosphereCanvas red={false} density={.8} /></div>}
      <div className="fx-grain" aria-hidden />

      {phase !== 'start' && line && (
        <div key={line.k} className={`film-line film-${line.kind}`} aria-live="polite">
          {who && <span className="film-who">{who}</span>}
          <RevealText text={t(line.k)} ms={line.kind === 'title' ? 1800 : line.kind === 'intro' ? 1400 : 700} />
        </div>
      )}

      {phase !== 'start' && phoneOn && (
        <div className="phone-note" role="status">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-ash/70">
            <span className="inline-block h-2 w-2 rounded-full bg-blood" aria-hidden /> {storyTime('start', lang)} <span className="ml-auto normal-case tracking-normal">{t('note_now')}</span>
          </div>
          <p className="mt-1 text-[15px] font-semibold text-bone">{t('h3')}</p>
        </div>
      )}

      {phase !== 'start' && !capture && (
        <button type="button" onClick={toggleSound} aria-label={muted ? t('a_sound_off') : t('a_sound_on')} aria-pressed={!muted}
          className="fixed right-4 top-4 z-30 grid h-8 w-8 place-items-center rounded-full text-ash/60 transition hover:text-bone">
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}

      {phase === 'start' && (
        <section className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 px-4 text-center" aria-labelledby="p-title">
          <AtmosphereCanvas red />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <h1 id="p-title" className="font-display text-5xl tracking-[.4em] text-bone">RAAT</h1>
            <div className="flex gap-1" role="group" aria-label={t('a_lang')}>
              {LANGS.map((l) => <button key={l.id} type="button" lang={l.id} aria-pressed={lang === l.id} onClick={() => store.set({ lang: l.id })} className={`chip ${lang === l.id ? 'chip-on' : ''}`}>{l.label}</button>)}
            </div>
            <label className="w-full max-w-xs text-sm text-ash">
              <span className="mb-2 block">{t('name_q')}</span>
              <input value={name} maxLength={24} autoComplete="given-name" placeholder={t('name_ph')}
                onChange={(e) => { const v = e.target.value.replace(/[<>{}[\]]/g, ''); store.set({ name: v, ...(chosen.current ? {} : { gender: guessGender(v) }) }); }}
                className="w-full border-b border-ash/30 bg-transparent px-1 py-2 text-center text-lg text-bone outline-none focus:border-blood" />
            </label>
            <div className="flex items-center gap-2 text-xs text-ash" role="radiogroup" aria-label={t('g_label')}>
              <span>{t('g_label')}</span>
              {(['m', 'f'] as const).map((g) => <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => { chosen.current = true; store.set({ gender: g }); }} className={`chip ${gender === g ? 'chip-on' : ''}`}>{t(g === 'm' ? 'g_m' : 'g_f')}</button>)}
            </div>
            <button type="button" onClick={start} className="enter-btn">{t('enter')}</button>
            <p className="text-xs text-ash/60">{t('headphones')}</p>
          </div>
        </section>
      )}

      {phase === 'done' && !capture && (
        <nav className="fixed inset-x-0 bottom-[18%] z-40 flex justify-center gap-8 text-xs uppercase tracking-[.3em] text-ash/80">
          <button type="button" onClick={start} className="transition hover:text-bone">{t('p_replay')}</button>
          <Link href="/" className="transition hover:text-bone">{t('p_full')}</Link>
        </nav>
      )}
    </main>
  );
}
