'use client';
import { useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { store, useStore } from '@/lib/store';
import { guessGender } from '@/lib/gender';
import { audio } from '@/lib/audio/engine';
import { batteryLevel } from '@/lib/visitor';
import { beginSession, storyTime } from '@/lib/session';
import { LANGS } from '@/data/translations';
import AtmosphereCanvas from '@/components/fx/AtmosphereCanvas';

type Phase = 'gate' | 'dark' | 'phone';

/**
 * The opening. Silence until the visitor taps (browsers forbid sound before that), then darkness that
 * breathes: wind, a creak, an uneven heartbeat, a figure for a moment, eyes for less, a bus horn far
 * away, and a phone buzzing. The phone is where they tell us who is travelling tonight.
 */
export default function Entry() {
  const t = useT();
  const entered = useStore((s) => s.entered);
  const lang = useStore((s) => s.lang);
  const name = useStore((s) => s.name);
  const gender = useStore((s) => s.gender);
  const safe = useStore((s) => s.safe);
  const [phase, setPhase] = useState<Phase>('gate');
  const [loaded, setLoaded] = useState(0);
  const [beat, setBeat] = useState(0); // which moment of the dark sequence we're in
  const [clock, setClock] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const chosen = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    const small = window.innerWidth < 900;
    const list = ['hero-m', 'hero-f', 'road', 'bus-side', 'inside-empty', 'cabin', 'her-face'].map((n) => `/raat/scenes/${n}${small ? '-m' : ''}.webp`);
    let n = 0, done = false;
    const finish = () => { if (!done) { done = true; setLoaded(1); } };
    list.forEach((u) => { const im = new Image(); im.onload = im.onerror = () => { n++; setLoaded((l) => Math.max(l, n / list.length)); if (n === list.length) finish(); }; im.src = u; });
    const id = window.setTimeout(finish, 9000);
    return () => window.clearTimeout(id);
  }, []);

  // the lock screen shows the story clock: the moment the visitor pressed Begin
  useEffect(() => { if (phase !== 'gate') setClock(storyTime('start', lang)); }, [lang, phase]);

  // first tap: sound becomes possible, the dark sequence begins
  const begin = (noScares: boolean) => {
    if (phase !== 'gate') return;
    beginSession(); // the visitor's real local time, captured once; every scene reads it from the session
    store.set({ safe: noScares });
    audio.safe = noScares;
    audio.init(); audio.setVolume(store.get().volume);
    setPhase('dark');
    const r = store.get().reduced;
    if (r) { setBeat(9); setPhase('phone'); audio.startBed(); return; }
    const at = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
    audio.startBed(); audio.dread(.35);
    at(200, () => audio.breath());
    at(1900, () => audio.creak(.45, -.5));
    at(2600, () => audio.irregularHeart(7));
    at(4300, () => setBeat(1));                              // a figure, barely
    at(4300 + (noScares ? 900 : 260), () => setBeat(2));
    at(6600, () => { setBeat(3); audio.whisper(.6, .5); }); // eyes
    at(6600 + (noScares ? 500 : 120), () => setBeat(4));
    at(8200, () => audio.horn(.6));                         // a bus, far away
    at(10100, () => { audio.vibrate(3); setBeat(5); try { if (!noScares && navigator.vibrate) navigator.vibrate([400, 250, 400]); } catch { /* unsupported */ } });
    at(11400, () => setBeat(6));                            // the line
    at(14200, () => { setBeat(7); setPhase('phone'); });
  };

  const onName = (v: string) => {
    const clean = v.replace(/[<>{}[\]]/g, '').slice(0, 24);
    store.set({ name: clean, ...(chosen.current ? {} : { gender: guessGender(clean) }) });
  };

  const board = () => {
    if (started.current) return;
    started.current = true;
    audio.loadTheme('/raat/audio/theme.mp4');
    try { localStorage.setItem('raat-name', store.get().name); localStorage.setItem('raat-gender', store.get().gender); } catch { /* private mode */ }
    void batteryLevel().then((b) => store.set({ batt: b }));
    setLeaving(true);
    window.setTimeout(() => { store.set({ entered: true }); window.scrollTo(0, 0); }, store.get().reduced ? 50 : 900);
    window.setTimeout(() => setGone(true), store.get().reduced ? 100 : 2200);
  };

  if (gone || entered) return null;
  return (
    <section className={`fixed inset-0 z-40 overflow-hidden bg-black text-center transition-opacity duration-[1300ms] ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`} aria-labelledby="warn-title">
      <h1 id="warn-title" className="sr-only">RAAT — The Last Passenger</h1>
      {phase !== 'gate' && <AtmosphereCanvas red={false} density={.5} />}

      {phase === 'gate' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
          <div className="flex gap-1" role="group" aria-label={t('a_lang')}>
            {LANGS.map((l) => <button key={l.id} type="button" lang={l.id} onClick={() => store.set({ lang: l.id })} aria-pressed={lang === l.id} className={`chip ${lang === l.id ? 'chip-on' : ''}`}>{l.label}</button>)}
          </div>
          <p className="flex items-center gap-2 text-xs tracking-[.2em] text-ash/70"><Headphones size={14} aria-hidden /> {t('headphones')}</p>
          <button type="button" disabled={loaded < 1} onClick={() => begin(false)} className="enter-btn disabled:opacity-40">{loaded < 1 ? `${t('loading')} ${Math.round(loaded * 100)}%` : t('gate_begin')}</button>
          <button type="button" disabled={loaded < 1} onClick={() => begin(true)} className="text-xs text-ash/60 underline-offset-4 hover:text-bone hover:underline disabled:opacity-40">{t('safe')}</button>
        </div>
      )}

      {/* the figure and the eyes: real photographs, shown for a heartbeat */}
      {phase === 'dark' && beat === 1 && <img src="/raat/cutouts/her-look.webp" alt="" aria-hidden className={`op-figure ${safe ? 'soft' : ''}`} />}
      {phase === 'dark' && beat === 3 && <div aria-hidden className={`op-eyes ${safe ? 'soft' : ''}`} style={{ backgroundImage: 'url(/raat/scenes/her-face.webp)' }} />}

      {(phase === 'phone' || beat >= 5) && (
        <div className={`op-phone ${beat >= 5 ? 'in' : ''}`} role="group" aria-label={t('name_q')}>
          <p className="op-clock">{clock}</p>
          <div className={`op-note ${beat >= 6 ? 'in' : ''}`}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-ash/70"><span className="h-2 w-2 rounded-full bg-blood" aria-hidden /> {t('sp_unknown')} <span className="ml-auto normal-case tracking-normal">{t('note_now')}</span></div>
            <p className="mt-2 font-display text-lg leading-snug text-bone">{t('w2')}</p>
            <p className="mt-1 text-sm text-ash">{t('w4')}</p>
            {phase === 'phone' && (
              <div className="mt-4 flex flex-col gap-3 text-left">
                <input value={name} onChange={(e) => onName(e.target.value)} placeholder={t('name_ph')} maxLength={24} autoComplete="given-name" aria-label={t('name_ph')}
                  className="w-full rounded-xl border border-ash/20 bg-black/40 px-3 py-2.5 text-base text-bone outline-none placeholder:text-ash/40 focus:border-blood" />
                <div className="flex items-center gap-2 text-xs text-ash" role="radiogroup" aria-label={t('g_label')}>
                  <span>{t('g_label')}</span>
                  {(['m', 'f', 'n'] as const).map((g) => <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => { chosen.current = true; store.set({ gender: g }); }} className={`chip ${gender === g ? 'chip-on' : ''}`}>{t(g === 'm' ? 'g_m' : g === 'f' ? 'g_f' : 'g_n')}</button>)}
                </div>
                <button type="button" onClick={board} className="enter-btn w-full">{t('enter')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
