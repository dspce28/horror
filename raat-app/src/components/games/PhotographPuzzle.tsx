'use client';
import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useFlashlight, type Beam } from '@/hooks/useFlashlight';
import { audio } from '@/lib/audio/engine';
import { finishGame } from '@/lib/games/finish';
import { Card, GameShell } from '@/components/ui/GameOverlay';
import { oldPhoto, weddingPhoto } from '@/components/fx/Overlays';
import { litBy } from './DarkScene';
import type { Key } from '@/data/translations';

type ClueId = 'groom' | 'bride' | 'date' | 'back';
const FRONT: { id: ClueId; x: number; y: number; label: Key; text: Key }[] = [
  { id: 'groom', x: .6, y: .33, label: 'g2w_spot_groom', text: 'c_groom' },
  { id: 'bride', x: .322, y: .4, label: 'g2w_spot_bride', text: 'c_bride' },
  { id: 'date', x: .86, y: .9, label: 'g2w_spot_date', text: 'c_date' },
];
type Phase = 'intro' | 'inspect' | 'memory' | 'done';

/** THE WEDDING PHOTOGRAPH: a magnifier over Ramesh and Kokila's wedding picture, then its back. */
export default function PhotographPuzzle() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('intro');
  const [found, setFound] = useState<ClueId[]>([]);
  const [line, setLine] = useState<Key | null>(null);
  const [flip, setFlip] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const spots = useRef<Partial<Record<ClueId, HTMLButtonElement | null>>>({});
  const foundRef = useRef<ClueId[]>([]);

  const take = (c: ClueId, text: Key) => {
    if (foundRef.current.includes(c)) return;
    foundRef.current = [...foundRef.current, c]; setFound(foundRef.current); setLine(text);
    audio.ping(); audio.thump(.2, 140);
    if (foundRef.current.length === 4) window.setTimeout(() => { setPhase('memory'); audio.chime(); window.setTimeout(() => { audio.glitch(); audio.shriek(.5); setPhase('done'); }, 5200); }, 1800);
  };
  const tap = (b: Beam) => {
    if (flip) { take('back', 'c_back'); return; }
    FRONT.forEach((c) => { if (litBy(spots.current[c.id] ?? null, root.current, b, .35).lit) take(c.id, c.text); });
  };
  const beam = useFlashlight(root, { radius: .13, onTap: tap });

  // the magnifier: follows the mouse or finger, shows the photo at 2.6×
  useEffect(() => {
    if (phase !== 'inspect') return;
    let raf = 0;
    const loop = () => {
      const b = beam.current, l = lens.current, p = photo.current, r = root.current;
      if (b && l && p && r) {
        const pr = p.getBoundingClientRect(), rr = r.getBoundingClientRect();
        const ux = (b.x + rr.left - pr.left) / pr.width, uy = (b.y + rr.top - pr.top) / pr.height, z = 2.6;
        l.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px)`;
        l.style.width = l.style.height = `${b.r * 2}px`;
        l.style.backgroundSize = `${pr.width * z}px ${pr.height * z}px`;
        l.style.backgroundPosition = `${-(ux * pr.width * z - b.r)}px ${-(uy * pr.height * z - b.r)}px`;
        l.style.opacity = ux > 0 && ux < 1 && uy > 0 && uy < 1 && !flip ? '1' : '0';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, flip]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!line) return; const id = window.setTimeout(() => setLine(null), 4200); return () => window.clearTimeout(id); }, [line]);
  const frontDone = FRONT.every((c) => found.includes(c.id));

  return (
    <GameShell title={t('g2w_title')} onExit={() => finishGame('photo', phase === 'done' ? 'win' : 'skip')} label={t('g2w_title')}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1d1813_0%,#09090B_70%)]" />
      {(phase === 'inspect' || phase === 'intro') && (
        <div ref={root} className="game-stage flex items-center justify-center px-4" style={{ perspective: '1400px' }} onKeyDown={(e) => { if (e.key === 'Enter' && beam.current) tap(beam.current); }} tabIndex={0}>
          <div ref={photo} className="photo-card wedding" style={{ transform: `rotateY(${flip ? 180 : 0}deg)` }}>
            <div className="photo-face front">
              <img src={weddingPhoto()} alt="" draggable={false} />
              <span className="ink-date" aria-hidden>12·5·1974</span>
              {FRONT.map((c) => (
                <button key={c.id} type="button" ref={(el) => { spots.current[c.id] = el; }} onClick={() => take(c.id, c.text)} aria-label={t(c.label)}
                  className={`photo-spot ${found.includes(c.id) ? 'done' : ''}`} style={{ left: `${c.x * 100 - 6}%`, top: `${c.y * 100 - 7}%`, width: '12%', height: '14%' }} />
              ))}
            </div>
            <div className="photo-face back">
              <p className="note-hand">{t('note_text')}</p>
              <p className="note-date">— K. · 12·5·1999</p>
              <button type="button" className={`photo-spot ${found.includes('back') ? 'done' : ''}`} style={{ left: '8%', top: '20%', width: '84%', height: '60%' }} onClick={() => take('back', 'c_back')} aria-label={t('g2w_spot_back')} />
            </div>
          </div>
          {phase === 'inspect' && <div ref={lens} className="magnifier" style={{ backgroundImage: `url(${weddingPhoto()})` }} aria-hidden />}
        </div>
      )}

      {phase === 'inspect' && (
        <div className="absolute inset-x-0 bottom-4 z-[4] flex flex-col items-center gap-3 px-4 text-center">
          {line && <p className="clue-line max-w-lg" role="status">{t(line)}</p>}
          <div className="flex items-center gap-3">
            <button type="button" className={`hud-btn ${frontDone && !flip ? 'animate-pulse' : ''}`} onClick={() => { setFlip((f) => !f); audio.thump(.15, 200); }} aria-label={t('g2_flip')}><RotateCw size={16} /></button>
            <span className="text-xs uppercase tracking-[.25em] text-ash">{found.length}/4</span>
          </div>
        </div>
      )}

      {phase === 'memory' && (
        <div className="memory absolute inset-0 z-[4] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="relative"><img src={weddingPhoto()} alt="" className="memory-photo" /><img src={oldPhoto()} alt="" className="memory-photo memory-photo-2" /></div>
          <p className="font-display text-2xl text-[#f3dfb8] sm:text-4xl">{t('g2_solved')}</p>
          <p className="max-w-md text-sm text-[#e7d3ae]">{t('g2w_reveal')}</p>
        </div>
      )}

      {phase === 'intro' && (
        <Card>
          <p className="text-bone">{t('g2w_a')}</p>
          <p className="mt-2 text-ash">{t('g2w_b')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="enter-btn" onClick={() => setPhase('inspect')}>{t('play')}</button>
            <button type="button" className="ghost-btn" onClick={() => finishGame('photo', 'skip')}>{t('skip')}</button>
          </div>
        </Card>
      )}
      {phase === 'done' && (
        <Card>
          <p className="font-display text-2xl text-bone">{t('g2_solved')}</p>
          <p className="mt-2 text-sm text-ash">{t('g2w_reveal')}</p>
          <button type="button" className="enter-btn mt-6" onClick={() => finishGame('photo', 'win')}>{t('continue')}</button>
        </Card>
      )}
    </GameShell>
  );
}
