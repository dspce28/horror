'use client';
import { useState } from 'react';
import { MessageCircle, RotateCcw, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { LANGS } from '@/data/translations';
import { SCENES } from '@/data/stories/last-passenger';
import { live, store, useStore } from '@/lib/store';
import { useT } from '@/hooks/useT';
import { audio } from '@/lib/audio/engine';
import { replayStory } from '@/lib/replay';
import { replay as replayLine } from '@/lib/audio/voice';

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
  const restart = () => replayStory();
  const [voiceVol, setVoiceVol] = useState(1), [moodVol, setMoodVol] = useState(1);
  const slider = (label: string, v: number, set: (x: number) => void) => (
    <label className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[.18em] text-ash">
      <span>{label}</span>
      <input type="range" min={0} max={1} step={.05} value={v} aria-label={label} onChange={(e) => set(Number(e.target.value))} className="w-28 accent-[#72191F]" />
    </label>
  );

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
          <button type="button" onClick={toggle} aria-label={muted ? t('a_sound_off') : t('a_sound_on')} aria-pressed={!muted} className="hud-btn">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          {/* sound settings: a tap opens it (no hover needed on phones) */}
          <div className="relative">
            <button type="button" onClick={() => setVol((o) => !o)} aria-expanded={vol} aria-label={t('a_audio')} className="hud-btn"><SlidersHorizontal size={15} /></button>
            {vol && (
              <div className="absolute right-0 top-11 z-40 flex w-64 flex-col gap-3 rounded-2xl border border-ash/15 bg-black/85 p-4 backdrop-blur" role="group" aria-label={t('a_audio')}>
                {slider(t('a_volume'), volume, (v) => { audio.init(); audio.setVolume(v); store.set({ volume: v, muted: v === 0 }); audio.setMuted(v === 0); })}
                {slider(t('a_dialogue'), voiceVol, (v) => { setVoiceVol(v); audio.setVoiceVolume(v); })}
                {slider(t('a_music'), moodVol, (v) => { setMoodVol(v); audio.setMoodVolume(v); })}
              </div>
            )}
          </div>
          {entered && (
            <button type="button" onClick={() => replayLine()} aria-label={t('a_replay_line')} className="hud-btn"><MessageCircle size={15} /></button>
          )}
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
