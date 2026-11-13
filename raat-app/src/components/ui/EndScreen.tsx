'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Film, Music2, RotateCcw, SkipForward } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { store, useStore } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { replayStory } from '@/lib/replay';
import { FILMS, SONGS } from '@/data/recommendations';

type Panel = 'menu' | 'teaser' | 'films' | 'songs';

/** END OF PART ONE: a quiet title card, one question, and four ways out. */
export default function EndScreen() {
  const t = useT();
  const finished = useStore((s) => s.finished);
  const lang = useStore((s) => s.lang);
  const [panel, setPanel] = useState<Panel>('menu');
  useEffect(() => { if (finished) setPanel('menu'); }, [finished]);
  if (!finished) return null;

  return (
    <section className="end-screen fixed inset-0 z-40 overflow-y-auto bg-black px-5 py-16" aria-labelledby="end-title" lang={lang}>
      {panel === 'menu' && (
        <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center text-center">
          <p className="end-line text-[11px] uppercase tracking-[.5em] text-ash/70" style={{ animationDelay: '.2s' }}>{t('end_presents')}</p>
          <h2 id="end-title" className="end-line mt-5 font-display text-4xl tracking-[.18em] text-bone sm:text-6xl" style={{ animationDelay: '1.4s' }}>{t('end_title')}</h2>
          <p className="end-line mt-4 text-xs uppercase tracking-[.4em] text-[#b3262f]" style={{ animationDelay: '2.8s' }}>{t('end_part')}</p>
          <p className="end-line mt-12 max-w-md font-display text-xl text-bone/90 sm:text-2xl" style={{ animationDelay: '4.4s' }}>{t('end_q')}</p>
          <div className="end-line mt-14 grid w-full max-w-sm grid-cols-1 gap-3 sm:grid-cols-2" style={{ animationDelay: '6.2s' }}>
            <button type="button" className="end-opt" onClick={() => setPanel('teaser')}><SkipForward size={16} aria-hidden />{t('end_next')}</button>
            <button type="button" className="end-opt" onClick={() => setPanel('films')}><Film size={16} aria-hidden />{t('end_films')}</button>
            <button type="button" className="end-opt" onClick={() => setPanel('songs')}><Music2 size={16} aria-hidden />{t('end_songs')}</button>
            <button type="button" className="end-opt" onClick={() => replayStory()}><RotateCcw size={16} aria-hidden />{t('end_replay')}</button>
          </div>
        </div>
      )}

      {panel === 'teaser' && <Teaser onBack={() => setPanel('menu')} />}

      {panel === 'films' && (
        <List title={t('end_films')} note={t('end_films_note')} onBack={() => setPanel('menu')} back={t('end_back')}>
          {FILMS.map((f) => (
            <li key={f.title} className="end-item">
              <div className="min-w-0">
                <p className="font-display text-xl text-bone">{f.title} <span className="text-sm text-ash">· {f.year} · {f.language[lang]}</span></p>
                <p className="mt-1 text-sm text-ash">{f.about[lang]}</p>
              </div>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="end-link">{t('end_find')}<ExternalLink size={13} aria-hidden /></a>
            </li>
          ))}
        </List>
      )}

      {panel === 'songs' && (
        <List title={t('end_songs')} note={t('end_songs_note')} onBack={() => setPanel('menu')} back={t('end_back')}>
          {SONGS.map((s) => (
            <li key={s.title} className="end-item">
              <div className="min-w-0">
                <p className="font-display text-xl text-bone">{s.title}</p>
                <p className="mt-1 text-sm text-ash">{s.artist} · {s.source}</p>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="end-link">{t('end_listen')}<ExternalLink size={13} aria-hidden /></a>
            </li>
          ))}
        </List>
      )}
    </section>
  );
}

function List({ title, note, back, onBack, children }: { title: string; note: string; back: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <button type="button" onClick={onBack} className="ghost-btn flex items-center gap-2"><ArrowLeft size={15} aria-hidden />{back}</button>
      <h3 className="mt-8 font-display text-3xl text-bone">{title}</h3>
      <p className="mt-2 text-xs text-ash/80">{note}</p>
      <ul className="mt-8 flex flex-col gap-3">{children}</ul>
    </div>
  );
}

/** Part two, in three lines and a sound. No more than that. */
function Teaser({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const safe = store.get().safe;
    const at = [1200, 4200, 7400, 8600, 10200];
    const ids = at.map((ms, i) => window.setTimeout(() => {
      setStep(i + 1);
      if (i === 0) audio.setInsects(.25);
      if (i === 3) { audio.setInsects(0); audio.crunch(); if (!safe) audio.thump(.35, 60); }
    }, ms));
    return () => { ids.forEach(window.clearTimeout); audio.setInsects(0); };
  }, []);
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center text-center">
      <div className={`teaser-scene ${step >= 4 ? 'cut' : ''}`} aria-live="polite">
        {step >= 1 && step < 4 && <p className="end-line font-display text-2xl text-bone/90">{t('tz1')}</p>}
        {step >= 2 && step < 4 && <p className="end-line mt-4 font-display text-2xl text-bone/90">{t('tz2')}</p>}
        {step >= 3 && step < 4 && <p className="end-line mt-4 font-display text-2xl text-bone/90">{t('tz3')}</p>}
      </div>
      {step >= 5 && (
        <>
          <p className="end-line text-xs uppercase tracking-[.5em] text-[#b3262f]">{t('end_soon')}</p>
          <button type="button" onClick={onBack} className="end-line ghost-btn mt-10 flex items-center gap-2" style={{ animationDelay: '1s' }}><ArrowLeft size={15} aria-hidden />{t('end_back')}</button>
        </>
      )}
    </div>
  );
}
