'use client';
import { useMemo, useRef, useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { audio } from '@/lib/audio/engine';
import { finishGame } from '@/lib/games/finish';
import { Card, GameShell } from '@/components/ui/GameOverlay';
import { oldPhoto, weddingPhoto } from '@/components/fx/Overlays';
import type { Key } from '@/data/translations';

type ClueId = 'wed' | 'bus' | 'note';
const CLUES: Record<ClueId, { k: Key; year: number }> = { wed: { k: 'k_wed', year: 1974 }, bus: { k: 'k_bus', year: 1985 }, note: { k: 'k_note', year: 1999 } };
const ORDER: ClueId[] = ['wed', 'bus', 'note'];
type Phase = 'intro' | 'inspect' | 'order' | 'memory' | 'done';

/** WHAT HAPPENED IN 1999? Turn, zoom and search an old photograph, then put its clues in order. */
export default function PhotographPuzzle() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('intro');
  const [found, setFound] = useState<ClueId[]>([]);
  const [flip, setFlip] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [picked, setPicked] = useState<ClueId[]>([]);
  const [wrong, setWrong] = useState(false);
  const [flash, setFlash] = useState<ClueId | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const shuffled = useMemo<ClueId[]>(() => ['note', 'wed', 'bus'], []);

  const discover = (c: ClueId) => {
    if (found.includes(c)) return;
    audio.ping(); audio.thump(.25, 120);
    const next = [...found, c]; setFound(next); setFlash(c); window.setTimeout(() => setFlash(null), 1600);
    if (next.length === 3) window.setTimeout(() => setPhase('order'), 1500);
  };

  const choose = (c: ClueId) => {
    if (picked.includes(c)) return;
    const next = [...picked, c];
    if (ORDER[next.length - 1] !== c) {
      setWrong(true); audio.whisper(0, 1); audio.glitch();
      window.setTimeout(() => { setWrong(false); setPicked([]); }, 900);
      return;
    }
    setPicked(next); audio.thump(.3, 100);
    if (next.length === 3) {
      setPhase('memory'); audio.chime();
      window.setTimeout(() => { audio.glitch(); audio.shriek(.7); setPhase('done'); }, 4200);
    }
  };

  const exit = () => finishGame('photo', phase === 'done' ? 'win' : 'skip');

  return (
    <GameShell title={t('g2_title')} onExit={exit} label={t('g2_title')}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1d1813_0%,#09090B_70%)]" />
      {(phase === 'inspect' || phase === 'intro') && (
        <div className="absolute inset-0 flex items-center justify-center px-4"
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; }}
          onPointerMove={(e) => { if (!drag.current) return; setTilt((p) => ({ x: Math.max(-35, Math.min(35, p.x - (e.clientY - drag.current!.y) * .3)), y: Math.max(-45, Math.min(45, p.y + (e.clientX - drag.current!.x) * .3)) })); drag.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
          onWheel={(e) => setZoom((z) => Math.max(1, Math.min(2.6, z - e.deltaY * .001)))}
          style={{ perspective: '1400px', touchAction: 'none' }}>
          <div className="photo-card" style={{ transform: `scale(${zoom}) rotateX(${tilt.x}deg) rotateY(${tilt.y + (flip ? 180 : 0)}deg)` }}>
            <div className="photo-face front">
              <img src={oldPhoto()} alt="" draggable={false} />
              <button type="button" className={`photo-spot ${found.includes('bus') ? 'done' : ''}`} style={{ left: '75%', top: '68%', width: '21%', height: '12%' }} onClick={() => discover('bus')} aria-label={t('g2_spot_plate')} />
              <button type="button" className={`photo-spot ${found.includes('wed') ? 'done' : ''}`} style={{ left: '33%', top: '83%', width: '17%', height: '16%' }} onClick={() => discover('wed')} aria-label={t('g2_spot_bangle')} />
            </div>
            <div className="photo-face back">
              <p className="note-hand">{t('note_text')}</p>
              <p className="note-date">— K. · 12·5·1999</p>
              <button type="button" className={`photo-spot ${found.includes('note') ? 'done' : ''}`} style={{ left: '8%', top: '20%', width: '84%', height: '60%' }} onClick={() => discover('note')} aria-label={t('g2_spot_note')} />
            </div>
          </div>
        </div>
      )}

      {phase === 'inspect' && (
        <div className="absolute inset-x-0 bottom-4 z-[4] flex flex-col items-center gap-3 px-4">
          {flash && <p className="clue-chip in" role="status">{t(CLUES[flash].k)}</p>}
          <div className="flex gap-2">
            <button type="button" className="hud-btn" onClick={() => { setFlip((f) => !f); audio.thump(.15, 200); }} aria-label={t('g2_flip')}><RotateCw size={16} /></button>
            <button type="button" className="hud-btn" onClick={() => setZoom((z) => Math.min(2.6, z + .3))} aria-label={t('g2_zoom_in')}><ZoomIn size={16} /></button>
            <button type="button" className="hud-btn" onClick={() => setZoom((z) => Math.max(1, z - .3))} aria-label={t('g2_zoom_out')}><ZoomOut size={16} /></button>
          </div>
          <p className="text-xs uppercase tracking-[.25em] text-ash">{t('g2_found')} {found.length}/3</p>
        </div>
      )}

      {phase === 'order' && (
        <div className="absolute inset-0 z-[4] flex flex-col items-center justify-center gap-6 px-4">
          <p className="text-center text-sm text-ash">{t('g2_order')}</p>
          <div className={`flex flex-col gap-3 sm:flex-row ${wrong ? 'shake' : ''}`}>
            {shuffled.map((c) => (
              <button key={c} type="button" onClick={() => choose(c)} disabled={picked.includes(c)}
                className={`clue-chip ${picked.includes(c) ? 'picked' : ''}`}>
                {picked.includes(c) && <span className="mr-2 font-display text-blood">{picked.indexOf(c) + 1}</span>}{t(CLUES[c].k)}
              </button>
            ))}
          </div>
          {wrong && <p className="text-sm text-[#c44]" role="status">{t('g2_wrong')}</p>}
        </div>
      )}

      {phase === 'memory' && (
        <div className="memory absolute inset-0 z-[4] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="relative"><img src={weddingPhoto()} alt="" className="memory-photo" /><img src={oldPhoto()} alt="" className="memory-photo memory-photo-2" /></div>
          <p className="font-display text-2xl text-[#f3dfb8] sm:text-4xl">{t('g2_solved')}</p>
          <p className="max-w-md text-sm text-[#e7d3ae]">{t('g2_memory')}</p>
        </div>
      )}

      {phase === 'intro' && (
        <Card>
          <p className="text-bone">{t('g2_a')}</p>
          <p className="mt-1 text-ash">{t('g2_b')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="enter-btn" onClick={() => setPhase('inspect')}>{t('play')}</button>
            <button type="button" className="ghost-btn" onClick={() => finishGame('photo', 'skip')}>{t('skip')}</button>
          </div>
        </Card>
      )}
      {phase === 'done' && (
        <Card>
          <p className="font-display text-2xl text-bone sm:text-3xl">{t('g2_solved')}</p>
          <button type="button" className="enter-btn mt-6" onClick={() => finishGame('photo', 'win')}>{t('continue')}</button>
        </Card>
      )}
    </GameShell>
  );
}
