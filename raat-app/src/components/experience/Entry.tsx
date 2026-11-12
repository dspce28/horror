'use client';
import { useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { store, useStore } from '@/lib/store';
import { guessGender } from '@/lib/gender';
import { audio } from '@/lib/audio/engine';
import { assetUrl } from '@/lib/assets';
import { batteryLevel } from '@/lib/visitor';
import { LANGS } from '@/data/translations';
import AtmosphereCanvas from '@/components/fx/AtmosphereCanvas';

/** Scene 00: black screen, fog, three lines, a name, and one red button. No sound before the click. */
export default function Entry() {
  const t = useT();
  const entered = useStore((s) => s.entered);
  const lang = useStore((s) => s.lang);
  const name = useStore((s) => s.name);
  const gender = useStore((s) => s.gender);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const chosen = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (entered) return;
    const reduced = store.get().reduced;
    const times = reduced ? [0, 0, 0, 0] : [700, 2600, 4600, 6000];
    const ids = times.map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    return () => ids.forEach(window.clearTimeout);
  }, [entered]);

  const onName = (v: string) => {
    const clean = v.replace(/[<>{}[\]]/g, '').slice(0, 24);
    store.set({ name: clean, ...(chosen.current ? {} : { gender: guessGender(clean) }) });
  };

  const enter = (safe: boolean) => {
    if (started.current) return; // one start only
    started.current = true;
    audio.safe = safe;
    audio.init();
    audio.startBed();
    const theme = assetUrl('theme'); if (theme) audio.loadTheme(theme);
    audio.breath();
    try { localStorage.setItem('raat-name', store.get().name); localStorage.setItem('raat-gender', store.get().gender); } catch { /* private mode */ }
    void batteryLevel().then((b) => store.set({ batt: b }));
    setLeaving(true);
    window.setTimeout(() => { store.set({ entered: true, safe }); window.scrollTo(0, 0); }, store.get().reduced ? 50 : 900);
    window.setTimeout(() => setGone(true), store.get().reduced ? 100 : 2200);
  };

  if (gone) return null;
  return (
    <section
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#09090B] px-4 text-center transition-opacity duration-[1300ms] ${leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      aria-labelledby="warn-title"
    >
      <AtmosphereCanvas />
      <div className={`red-flash ${leaving ? 'on' : ''}`} aria-hidden />
      <div className="relative z-10 flex max-w-xl flex-col items-center gap-5">
        <h1 id="warn-title" className="sr-only">RAAT — The Last Passenger</h1>
        <p className={`title-line ${step >= 1 ? 'in' : ''}`}>{t('w1')}</p>
        <p className={`title-line ${step >= 2 ? 'in' : ''}`}>{t('w2')}</p>
        <p className={`title-line text-bone ${step >= 3 ? 'in' : ''}`}>{t('w3')}</p>

        <div className={`mt-6 flex w-full flex-col items-center gap-4 transition-all duration-1000 ${step >= 4 ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-3'}`}>
          <div className="flex gap-1" role="group" aria-label={t('a_lang')}>
            {LANGS.map((l) => (
              <button key={l.id} type="button" onClick={() => store.set({ lang: l.id })} aria-pressed={lang === l.id}
                className={`chip ${lang === l.id ? 'chip-on' : ''}`} lang={l.id}>{l.label}</button>
            ))}
          </div>
          <label className="w-full max-w-xs text-sm text-ash">
            <span className="mb-2 block tracking-wide">{t('name_q')}</span>
            <input value={name} onChange={(e) => onName(e.target.value)} placeholder={t('name_ph')} maxLength={24} autoComplete="given-name"
              className="w-full border-b border-ash/30 bg-transparent px-1 py-2 text-center text-lg text-bone outline-none placeholder:text-ash/40 focus:border-blood" />
          </label>
          <div className="flex items-center gap-2 text-xs text-ash" role="radiogroup" aria-label={t('g_label')}>
            <span>{t('g_label')}</span>
            {(['m', 'f'] as const).map((g) => (
              <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => { chosen.current = true; store.set({ gender: g }); }}
                className={`chip ${gender === g ? 'chip-on' : ''}`}>{t(g === 'm' ? 'g_m' : 'g_f')}</button>
            ))}
          </div>
          <button type="button" onClick={() => enter(false)} className="enter-btn mt-2">{t('enter')}</button>
          <button type="button" onClick={() => enter(true)} className="text-xs text-ash/70 underline-offset-4 hover:text-bone hover:underline">{t('safe')}</button>
          <p className="flex items-center gap-2 text-xs text-ash/60"><Headphones size={14} aria-hidden /> {t('headphones')}</p>
        </div>
      </div>
    </section>
  );
}
