'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Pause, Play, RotateCcw } from 'lucide-react';
import PhotoStage from '@/components/experience/PhotoStage';
import Overlays from '@/components/fx/Overlays';
import AtmosphereCanvas from '@/components/fx/AtmosphereCanvas';
import ScrambleText from '@/components/ui/ScrambleText';
import { useT } from '@/hooks/useT';
import { live, store, useStore } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { guessGender } from '@/lib/gender';
import { LANGS, type Key } from '@/data/translations';

const LENGTH = 30;

// text on screen: [from s, to s, key, kind]
const LINES: [number, number, Key, 'big' | 'nar' | 'you' | 'driver'][] = [
  [1.2, 3.9, 'w2', 'big'],
  [9.6, 12.2, 'h1', 'big'],
  [12.4, 14.9, 'h2', 'big'],
  [15.6, 19.6, 'h9', 'nar'],
  [23.4, 26.2, 'b2', 'you'],
  [27.2, 30, 'b3', 'driver'],
];

// one-shot sounds and hits: [at s, what]
type Cue = [number, () => void];
const CUES: Cue[] = [
  [.3, () => audio.breath()],
  [4.1, () => audio.whisper(-.7, .4)],
  [10.4, () => audio.bark()],
  [12.5, () => audio.ping()],
  [23.7, () => { audio.brake(); live.shake = 1.3; }],
  [24.8, () => { live.shake = .6; }],
  [26.6, () => audio.door()],
  [28.4, () => audio.steps(3)],
];

/**
 * A 30-second, self-playing cut of the opening: black and fog, the road, the visitor by their
 * bike, headlights in the fog, the bus pulling up, and the camera moving to its door.
 * ?capture=1 exposes window.__seek(seconds) for frame-exact video export.
 */
export default function Prototype() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const name = useStore((s) => s.name);
  const gender = useStore((s) => s.gender);
  const [phase, setPhase] = useState<'start' | 'play' | 'done'>('start');
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const clock = useRef({ t: 0, last: 0, paused: false, fired: new Set<number>() });
  const chosen = useRef(false);
  const capture = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let n = ''; try { n = localStorage.getItem('raat-name') ?? ''; } catch { /* private mode */ }
    const guess = /^gu/i.test(navigator.language) ? 'gu' : /^hi/i.test(navigator.language) ? 'hi' : 'en';
    store.set({ reduced, entered: true, name: n, gender: guessGender(n), lang: guess, quality: window.innerWidth < 760 ? 'low' : 'high' });
    live.override = { scene: 'proto', t: 0 };
    return () => { live.override = null; audio.setEngine(0); };
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // pointer parallax still works while it plays
  useEffect(() => {
    const onMove = (e: PointerEvent) => { live.pointer.x = (e.clientX / innerWidth) * 2 - 1; live.pointer.y = (e.clientY / innerHeight) * 2 - 1; };
    addEventListener('pointermove', onMove, { passive: true });
    return () => removeEventListener('pointermove', onMove);
  }, []);

  const seek = useCallback((s: number) => {
    const c = clock.current;
    c.t = Math.max(0, Math.min(LENGTH, s));
    c.fired = new Set(CUES.map((q, i) => (q[0] < c.t ? i : -1)).filter((i) => i >= 0));
    live.override = { scene: 'proto', t: c.t / LENGTH, clock: capture ? c.t * 1000 : undefined };
    setTime(c.t);
  }, [capture]);

  // capture mode: an external script steps the clock frame by frame
  useEffect(() => {
    if (!capture) return;
    (window as unknown as { __seek: (s: number) => void }).__seek = (s: number) => { setPhase('play'); seek(s); };
  }, [capture, seek]);

  // the clock
  useEffect(() => {
    if (phase !== 'play' || capture) return;
    let raf = 0;
    const c = clock.current; c.last = performance.now();
    const loop = (now: number) => {
      const dt = (now - c.last) / 1000; c.last = now;
      if (!c.paused) {
        c.t = Math.min(LENGTH, c.t + dt);
        CUES.forEach(([at, fn], i) => { if (c.t >= at && !c.fired.has(i)) { c.fired.add(i); fn(); } });
        // engine rises as the bus comes out of the fog, idles after it stops
        const s = c.t;
        audio.setEngine(s < 15 ? 0 : s < 23.7 ? (s - 15) / 8.7 * .85 : .45, s < 23.7 ? .3 + (s - 15) / 8.7 * .45 : .22);
        audio.dread(s < 15 ? .25 : .45);
        live.override = { scene: 'proto', t: c.t / LENGTH };
        setTime(c.t);
        if (c.t >= LENGTH) { setPhase('done'); return; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, capture]);

  const start = () => {
    audio.init(); audio.startBed(); audio.loadTheme('/raat/audio/theme.mp4'); audio.themeLevel(.14);
    try { localStorage.setItem('raat-name', store.get().name); } catch { /* private mode */ }
    seek(0); clock.current.paused = false; setPaused(false); setPhase('play');
  };
  const togglePause = () => { const c = clock.current; c.paused = !c.paused; setPaused(c.paused); if (c.paused) audio.setEngine(0); };

  const line = LINES.find(([a, b]) => time >= a && time < b);
  const speaker = line && (line[3] === 'you' ? (name.trim() || t('default_name')) : line[3] === 'driver' ? t('sp_driver') : null);

  return (
    <main className={`lang-${lang} relative h-[100svh] overflow-hidden bg-ink text-bone`}>
      {phase !== 'start' && <PhotoStage />}
      {phase !== 'start' && time < 4.3 && <div className="pointer-events-none fixed inset-0" style={{ opacity: Math.max(0, 1 - Math.max(0, time - 3.6) / .7) }}><AtmosphereCanvas red /></div>}
      <Overlays />

      {phase === 'play' && line && (
        <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4" style={{ bottom: line[3] === 'big' ? '40%' : line[3] === 'nar' ? '16%' : '10%' }}>
          <p key={line[2]} className={`story-line ${line[3] === 'big' ? 'big' : line[3] === 'nar' ? 'nar' : 'dialogue'}`}>
            {speaker && <span className={`speaker sp-${line[3]}`}>{speaker}</span>}
            <span className="words"><ScrambleText text={t(line[2])} latin={lang === 'en'} ms={line[3] === 'big' ? 1100 : 650} /></span>
          </p>
        </div>
      )}

      {phase === 'start' && (
        <section className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 px-4 text-center" aria-labelledby="p-title">
          <AtmosphereCanvas red />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <p className="font-display text-5xl tracking-[.4em] text-bone">RAAT</p>
            <h1 id="p-title" className="text-xs uppercase tracking-[.3em] text-ash">{t('p_title')}</h1>
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
            <button type="button" onClick={start} className="enter-btn">{t('p_play')}</button>
            <p className="text-xs text-ash/60">{t('headphones')}</p>
          </div>
        </section>
      )}

      {phase !== 'start' && !capture && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 px-4 pb-4 pt-8" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.6))' }}>
          {phase === 'play' && <button type="button" className="hud-btn" onClick={togglePause} aria-label={paused ? t('p_resume') : t('p_pause')}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}
          <input type="range" min={0} max={LENGTH} step={.05} value={time} aria-label={t('p_scrub')}
            onChange={(e) => { seek(Number(e.target.value)); if (phase === 'done') setPhase('play'); }}
            className="h-1 flex-1 accent-[#72191F]" />
          <span className="w-12 text-right font-mono text-xs tabular-nums text-ash">0:{String(Math.floor(time)).padStart(2, '0')}</span>
        </div>
      )}

      {phase === 'done' && !capture && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="game-card w-full max-w-sm text-center">
            <p className="font-display text-4xl tracking-[.35em] text-bone">RAAT</p>
            <p className="mt-2 text-xs uppercase tracking-[.3em] text-ash">{t('p_title')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" className="ghost-btn flex items-center gap-2" onClick={start}><RotateCcw size={14} />{t('p_replay')}</button>
              <Link href="/" className="enter-btn">{t('p_full')}</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
