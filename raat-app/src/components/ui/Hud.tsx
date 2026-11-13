'use client';
import { useState } from 'react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { LANGS } from '@/data/translations';
import { SCENES } from '@/data/stories/last-passenger';
import { live, store, useStore } from '@/lib/store';
import { useT } from '@/hooks/useT';
import { audio } from '@/lib/audio/engine';
import { scroll } from '@/lib/scroll';
import { beginSession, clearSession } from '@/lib/session';

/** Minimal chrome: logo, language, sound, volume, restart, and a quiet progress rail. */
export default function Hud() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const muted = useStore((s) => s.muted);
  const volume = useStore((s) => s.volume);
  const scene = useStore((s) => s.sceneIndex);
  const entered = useStore((s) => s.entered);
  const [vol, setVol] = useState(false);

  const toggle = () => { audio.init(); const m = !muted; audio.setMuted(m); store.set({ muted: m }); };
  const restart = () => {
    store.set({ results: {}, callAccepted: null, callOpen: false, finished: false, game: null, call: 'IDLE', declines: 0, sessionStart: null });
    clearSession(); beginSession(); live.lookBacks = 0; // a new journey starts a new story clock
    scroll.lock(false); scroll.toProgress(0);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="font-display text-xl tracking-[.35em] text-bone/80">RAAT</span>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-full border border-ash/15 bg-black/40 p-0.5 backdrop-blur" role="group" aria-label={t('a_lang')}>
            {LANGS.map((l) => (
              <button key={l.id} type="button" lang={l.id} aria-pressed={lang === l.id} aria-label={l.label} onClick={() => store.set({ lang: l.id })}
                className={`h-8 min-w-8 rounded-full px-2 text-xs transition ${lang === l.id ? 'bg-bone/90 text-ink' : 'text-ash hover:text-bone'}`}>{l.short}</button>
            ))}
          </div>
          <div className="relative" onMouseLeave={() => setVol(false)}>
            <button type="button" onClick={toggle} onMouseEnter={() => setVol(true)} onFocus={() => setVol(true)}
              aria-label={muted ? t('a_sound_off') : t('a_sound_on')} aria-pressed={!muted} className="hud-btn">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className={`absolute right-0 top-10 rounded-full border border-ash/15 bg-black/70 px-3 py-2 backdrop-blur transition ${vol ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
              <input type="range" min={0} max={1} step={.05} value={volume} aria-label={t('a_volume')}
                onChange={(e) => { const v = Number(e.target.value); audio.init(); audio.setVolume(v); store.set({ volume: v, muted: v === 0 }); audio.setMuted(v === 0); }}
                className="w-28 accent-[#72191F]" />
            </div>
          </div>
          {entered && (
            <button type="button" onClick={restart} aria-label={t('a_restart')} className="hud-btn"><RotateCcw size={15} /></button>
          )}
        </div>
      </header>
      {entered && (
        <nav className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-label={t('a_progress')}>
          {SCENES.map((s, i) => (
            <span key={s.id} title={t(s.label)} aria-current={i === scene ? 'step' : undefined}
              className={`block w-[3px] rounded-full transition-all duration-500 ${i === scene ? 'h-6 bg-blood' : i < scene ? 'h-2 bg-ash/50' : 'h-2 bg-ash/15'}`} />
          ))}
        </nav>
      )}
      {entered && scene === 0 && (
        <div className="scroll-hint fixed bottom-6 left-1/2 z-20 -translate-x-1/2 text-[11px] uppercase tracking-[.4em] text-ash/60">{t('scroll')}</div>
      )}
    </>
  );
}
