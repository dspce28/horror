'use client';
import { useEffect, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { store, useStore } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { finishGame } from '@/lib/games/finish';
import { Card, GameShell } from '@/components/ui/GameOverlay';
import { ghostFace, oldPhoto } from '@/components/fx/Overlays';
import type { Key } from '@/data/translations';

type View = 'rear' | 'front';
type Spot = { id: string; view: View; x: number; y: number; label: Key; clue: Key | null };
// positions are fractions of each photograph
const SPOTS: Spot[] = [
  { id: 'hair', view: 'rear', x: .69, y: .66, label: 'g1_spot_seat', clue: 'c_hair' },
  { id: 'photo', view: 'rear', x: .66, y: .2, label: 'g1_spot_rack', clue: 'c_photo' },
  { id: 'd1', view: 'rear', x: .3, y: .58, label: 'g1_spot_dark', clue: null },
  { id: 'd2', view: 'rear', x: .5, y: .42, label: 'g1_spot_dark', clue: null },
  { id: 'bindi', view: 'front', x: .63, y: .7, label: 'g1_spot_cabin', clue: 'c_bindi' },
  { id: 'd3', view: 'front', x: .2, y: .55, label: 'g1_spot_dark', clue: null },
];
const VIEW_IMG: Record<View, string> = { rear: '/raat/scenes/inside-empty.webp', front: '/raat/scenes/cabin.webp' };
const TIME = 30;
type Phase = 'intro' | 'play' | 'win' | 'lose';

/** WHERE IS SHE? Sweep a light around the dark bus, turn to the cabin, find what she left. */
export default function GhostHuntGame() {
  const t = useT();
  const safe = useStore((s) => s.safe);
  const [phase, setPhase] = useState<Phase>('intro');
  const [view, setView] = useState<View>('rear');
  const [timed, setTimed] = useState(true);
  const [left, setLeft] = useState(TIME);
  const [found, setFound] = useState<string[]>([]);
  const [shown, setShown] = useState<Spot | null>(null);
  const [scare, setScare] = useState(false);
  const [decoy, setDecoy] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const edge = useRef(0);

  useEffect(() => {
    if (phase !== 'play' || !timed) return;
    const id = window.setInterval(() => setLeft((l) => {
      if (l <= 1) { window.clearInterval(id); lose(); return 0; }
      if (l <= 8) audio.heartbeat(.4 + (8 - l) * .05);
      return l - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [phase, timed]); // eslint-disable-line react-hooks/exhaustive-deps

  const lose = () => {
    setPhase('lose');
    if (!store.get().safe && !store.get().reduced) { setScare(true); audio.hit(); audio.shriek(.6); window.setTimeout(() => setScare(false), 600); }
  };

  const turn = () => { setView((v) => (v === 'rear' ? 'front' : 'rear')); audio.step(.25); };

  const aim = (cx: number, cy: number) => {
    const el = root.current; if (!el) return;
    const r = el.getBoundingClientRect(), x = (cx - r.left) / r.width, y = (cy - r.top) / r.height;
    el.style.setProperty('--tx', `${x * 100}%`); el.style.setProperty('--ty', `${y * 100}%`);
    // on narrow screens the photo is wider than the screen: the light pans it
    const v = el.querySelector<HTMLDivElement>('.hunt-view'); if (v) v.style.left = `${-(v.offsetWidth - r.width) * Math.min(1, Math.max(0, (x - .1) / .8))}px`;
    // hold the light at the side edge to turn around
    if (phase === 'play' && (x < .06 || x > .94)) { if (!edge.current) edge.current = window.setTimeout(() => { edge.current = 0; turn(); }, 650); }
    else if (edge.current) { window.clearTimeout(edge.current); edge.current = 0; }
    let near: string | null = null;
    el.querySelectorAll<HTMLButtonElement>('.hunt-spot').forEach((b) => {
      const br = b.getBoundingClientRect();
      if (Math.hypot(br.left + br.width / 2 - cx, br.top + br.height / 2 - cy) < Math.min(r.width, r.height) * .16) near = b.dataset.id ?? null;
    });
    setLit(near);
  };

  const pick = (s: Spot) => {
    if (phase !== 'play') return;
    if (!s.clue) {
      audio.whisper(Math.random() - .5, 1); setDecoy(true); window.setTimeout(() => setDecoy(false), 1400);
      if (timed) setLeft((l) => Math.max(1, l - 3));
      return;
    }
    if (found.includes(s.id)) return;
    audio.ping(); audio.thump(.3, 90);
    const next = [...found, s.id];
    setFound(next); setShown(s);
    if (next.length === 3) window.setTimeout(() => { setShown(null); setPhase('win'); audio.door(); }, 2200);
    else window.setTimeout(() => setShown((cur) => (cur?.id === s.id ? null : cur)), 2600);
  };

  const start = (withTimer: boolean) => { setTimed(withTimer); setLeft(TIME); setFound([]); setShown(null); setView('rear'); setPhase('play'); audio.breath(); };
  const onKey = (e: React.KeyboardEvent) => { if (phase === 'play' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) turn(); };
  const exit = () => finishGame('hunt', found.length === 3 ? 'win' : 'skip');

  return (
    <GameShell title={t('g1_title')} onExit={exit} label={t('g1_title')}>
      <div ref={root} className="hunt-dark absolute inset-0 select-none overflow-hidden outline-none" tabIndex={0} onKeyDown={onKey}
        onPointerMove={(e) => aim(e.clientX, e.clientY)} onPointerDown={(e) => aim(e.clientX, e.clientY)}>
        <div key={view} className="hunt-view absolute top-1/2 -translate-y-1/2">
          <img src={VIEW_IMG[view]} alt="" className="h-full w-full" draggable={false} />
          {SPOTS.filter((s) => s.view === view).map((s) => (
            <button key={s.id} type="button" data-id={s.id} data-lit={String(lit === s.id)} onClick={() => pick(s)} aria-label={t(s.label)}
              className={`hunt-spot ${found.includes(s.id) ? 'done' : ''}`} tabIndex={phase === 'play' ? 0 : -1}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: 'translate(-50%, -50%)' }} />
          ))}
        </div>
        <div className="hunt-torch pointer-events-none absolute inset-0" />
      </div>

      {phase === 'play' && (
        <>
          <button type="button" onClick={turn} className="ghost-btn absolute right-4 top-1/2 z-[4] flex -translate-y-1/2 items-center gap-2 bg-black/50 backdrop-blur">
            <RefreshCcw size={14} aria-hidden /> {t(view === 'rear' ? 'g1_turn_front' : 'g1_turn_back')}
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[4] flex flex-col items-center gap-2 px-4 text-center">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[.25em] text-ash">
              <span>{t('g1_found')} {found.length}/3</span>
              {timed && <span className={`tabular-nums ${left <= 8 ? 'animate-pulse text-[#c44]' : ''}`}>0:{String(left).padStart(2, '0')}</span>}
            </div>
            <p className="max-w-md text-xs text-ash/70">{t('g1_how')}</p>
          </div>
        </>
      )}

      {shown && (
        <div className="clue-pop" role="status">
          {shown.id === 'hair' && <svg viewBox="0 0 120 60" className="mx-auto h-14 w-28" aria-hidden><path d="M5 50 C30 5, 50 55, 70 20 S110 10, 115 40" stroke="#0a0a0a" strokeWidth="1.6" fill="none" /></svg>}
          {shown.id === 'photo' && <img src={oldPhoto()} alt="" className="mx-auto h-24 rotate-[-4deg] rounded-sm shadow-xl" />}
          {shown.id === 'bindi' && <span className="mx-auto block h-5 w-5 rounded-full bg-[#9b111e] shadow-[0_0_12px_#9b111e]" aria-hidden />}
          <p className="mt-3 text-sm text-ink">{t(shown.clue!)}</p>
          {shown.id === 'bindi' && <p className="mt-1 font-display text-2xl font-bold text-[#7a1018]">{t('c_bindi2')}</p>}
        </div>
      )}
      {decoy && <p className="decoy-line" role="status">{t('decoy')}</p>}

      {phase === 'intro' && (
        <Card>
          <p className="text-bone">{t('g1_a')}</p>
          <p className="mt-1 text-bone">{t('g1_b')}</p>
          <p className="mt-1 text-ash">{t('g1_c')}</p>
          <p className="mt-4 text-xs text-ash/70">{t('g1_how')} {t('g1_hint_keys')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="enter-btn" onClick={() => start(true)}>{t('play')}</button>
            <button type="button" className="ghost-btn" onClick={() => start(false)}>{t('no_timer')}</button>
            <button type="button" className="ghost-btn" onClick={() => finishGame('hunt', 'skip')}>{t('skip')}</button>
          </div>
        </Card>
      )}
      {phase === 'win' && (
        <Card>
          <p className="font-display text-3xl text-bone">{t('g1_win')}</p>
          <p className="mt-3 font-display text-2xl text-[#b3262f]">{t('c_bindi2')}</p>
          <button type="button" className="enter-btn mt-6" onClick={() => finishGame('hunt', 'win')}>{t('continue')}</button>
        </Card>
      )}
      {phase === 'lose' && (
        <Card>
          <p className="font-display text-4xl uppercase tracking-widest text-[#b3262f]">{t('g1_lose')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="ghost-btn" onClick={() => start(timed)}>{t('retry')}</button>
            <button type="button" className="enter-btn" onClick={() => finishGame('hunt', 'lose')}>{t('continue')}</button>
          </div>
        </Card>
      )}
      {scare && !safe && <div className="fx-scare" aria-hidden><img src={ghostFace()} alt="" /></div>}
    </GameShell>
  );
}
