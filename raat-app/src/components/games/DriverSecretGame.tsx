'use client';
import { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { nudgeBeam, useFlashlight, type Beam } from '@/hooks/useFlashlight';
import { audio } from '@/lib/audio/engine';
import { finishGame } from '@/lib/games/finish';
import { Card, GameShell } from '@/components/ui/GameOverlay';
import DarkScene, { litBy } from './DarkScene';
import type { Key } from '@/data/translations';

type ClueId = 'id' | 'log' | 'news';
// in the cabin photo: the ID card behind the mirror, the log by the flask, the cutting behind the idol
const CLUES: { id: ClueId; x: number; y: number; title: Key; body: Key }[] = [
  { id: 'id', x: .53, y: .19, title: 'g3_id_t', body: 'g3_id' },
  { id: 'log', x: .13, y: .58, title: 'g3_log_t', body: 'g3_log' },
  { id: 'news', x: .45, y: .6, title: 'g3_news_t', body: 'g3_news' },
];
type Phase = 'intro' | 'play' | 'reveal';

/** THE DRIVER'S SECRET: search his cabin with the light; the three things prove he is dead. */
export default function DriverSecretGame() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('intro');
  const [found, setFound] = useState<ClueId[]>([]);
  const [open, setOpen] = useState<ClueId | null>(null);
  const [hint, setHint] = useState<ClueId | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const spots = useRef<Record<ClueId, HTMLButtonElement | null>>({ id: null, log: null, news: null });
  const dwell = useRef<Record<ClueId, number>>({ id: 0, log: 0, news: 0 });
  const foundRef = useRef<ClueId[]>([]);

  const take = (c: ClueId) => {
    if (foundRef.current.includes(c) || open) return;
    foundRef.current = [...foundRef.current, c]; setFound(foundRef.current); setOpen(c);
    audio.creak(.25, 0); audio.thump(.25, 120);
  };
  const tryTap = (b: Beam) => { (Object.keys(spots.current) as ClueId[]).forEach((c) => { if (litBy(spots.current[c], root.current, b, .5).lit) take(c); }); };
  const beam = useFlashlight(root, { radius: .17, onTap: tryTap });

  // holding the light on a clue for a moment reveals it too (no precise tapping needed)
  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now; const b = beam.current;
      if (b && !open) (Object.keys(spots.current) as ClueId[]).forEach((c) => {
        const el = spots.current[c]; const l = litBy(el, root.current, b, .45);
        if (el) el.dataset.lit = String(l.lit);
        dwell.current[c] = l.lit ? dwell.current[c] + dt : 0;
        if (dwell.current[c] > 900) take(c);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { setOpen(null); if (foundRef.current.length === 3) window.setTimeout(() => { setPhase('reveal'); audio.thump(.6, 50); audio.whisper(.8, .8); }, 400); };
  const useHint = () => { const next = CLUES.find((c) => !foundRef.current.includes(c.id)); if (next) { setHint(next.id); audio.whisper(next.x * 2 - 1, 1); window.setTimeout(() => setHint(null), 1300); } };
  const card = CLUES.find((c) => c.id === open);

  return (
    <GameShell title={t('g3_title')} onExit={() => finishGame('cabin', found.length === 3 ? 'win' : 'skip')} label={t('g3_title')}>
      <div ref={root} className="game-stage" tabIndex={0} onKeyDown={(e) => { if (beam.current && nudgeBeam(beam.current, e.key)) e.preventDefault(); if (e.key === 'Enter' && beam.current) tryTap(beam.current); }}>
        <DarkScene src="/raat/scenes/cabin.webp" beam={beam} dark={.955}>
          {phase === 'play' && CLUES.map((c) => (
            <button key={c.id} type="button" ref={(el) => { spots.current[c.id] = el; }} onClick={() => take(c.id)} aria-label={t(c.title)}
              className={`clue-glint ${found.includes(c.id) ? 'done' : ''} ${hint === c.id ? 'hinted' : ''}`} style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }} />
          ))}
        </DarkScene>
      </div>

      {phase === 'play' && !open && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[4] text-center text-xs uppercase tracking-[.25em] text-ash">{found.length}/3</div>
          <button type="button" onClick={useHint} className="ghost-btn absolute bottom-24 right-4 z-[4] flex items-center gap-2 bg-black/50"><Lightbulb size={14} aria-hidden /> {t('hint')}</button>
        </>
      )}

      {card && (
        <div className="absolute inset-0 z-[6] flex items-center justify-center bg-black/60 px-4" onClick={close}>
          <article className={`prop-card prop-${card.id}`} onClick={(e) => e.stopPropagation()}>
            {card.id === 'id' && <div className="prop-photo" style={{ backgroundImage: 'url(/raat/scenes/photo-1999.webp)' }} aria-hidden />}
            <h3>{t(card.title)}</h3>
            <p>{t(card.body)}</p>
            <button type="button" className="ghost-btn mt-4" onClick={close}>{t('continue')}</button>
          </article>
        </div>
      )}

      {phase === 'intro' && (
        <Card>
          <p className="text-bone">{t('g3_a')}</p>
          <p className="mt-2 text-ash">{t('g3_b')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="enter-btn" onClick={() => setPhase('play')}>{t('play')}</button>
            <button type="button" className="ghost-btn" onClick={() => finishGame('cabin', 'skip')}>{t('skip')}</button>
          </div>
        </Card>
      )}
      {phase === 'reveal' && (
        <Card>
          <p className="font-display text-2xl text-bone">{t('g3_reveal')}</p>
          <p className="mt-3 font-display text-3xl text-[#b3262f]">{t('g3_reveal2')}</p>
          <button type="button" className="enter-btn mt-6" onClick={() => finishGame('cabin', 'win')}>{t('continue')}</button>
        </Card>
      )}
    </GameShell>
  );
}
