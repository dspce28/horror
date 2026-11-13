'use client';
import { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { nudgeBeam, useFlashlight } from '@/hooks/useFlashlight';
import { store, useStore } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { finishGame } from '@/lib/games/finish';
import { Card, GameShell } from '@/components/ui/GameOverlay';
import KokilaScare from '@/components/ui/KokilaScare';
import DarkScene, { litBy } from './DarkScene';

// where she can be, in the photo's coordinates: centre x, foot y, height (fractions of the photo)
type Pose = 'hair' | 'behind' | 'look';
const SPOTS: { x: number; y: number; h: number; pose: Pose }[] = [
  { x: .505, y: .56, h: .2, pose: 'hair' },     // the last bench
  { x: .29, y: .76, h: .34, pose: 'behind' },   // a left seat, halfway down
  { x: .66, y: .66, h: .26, pose: 'behind' },   // a right seat, further back
  { x: .53, y: .99, h: .62, pose: 'look' },     // standing in the aisle, close
  { x: .8, y: .98, h: .5, pose: 'behind' },     // the seat right next to you
];
const ASPECT: Record<Pose, number> = { hair: .672, behind: .433, look: .561 };
const NEED = 3, TIME = 60, DWELL = 750;
type Phase = 'intro' | 'play' | 'win' | 'lose';

/** FIND KOKILA: a dark bus, one flashlight, and a woman who doesn't want to be found. */
export default function GhostDetectionGame() {
  const t = useT();
  const safe = useStore((s) => s.safe);
  const [phase, setPhase] = useState<Phase>('intro');
  const [timed, setTimed] = useState(true);
  const [left, setLeft] = useState(TIME);
  const [found, setFound] = useState(0);
  const [spot, setSpot] = useState(0);
  const [visible, setVisible] = useState(true);
  const [msg, setMsg] = useState<'' | 'found' | 'gone'>('');
  const [hint, setHint] = useState(false);
  const [hints, setHints] = useState(3);
  const [scare, setScare] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const her = useRef<HTMLImageElement>(null);
  const st = useRef({ lit: 0, wasLit: false, unseen: 0, whisper: 0, busy: false, found: 0, spot: 0 });
  const beam = useFlashlight(root, { radius: .19 });

  const relocate = (avoid: number) => {
    let n = avoid; while (n === avoid) n = Math.floor(Math.random() * SPOTS.length);
    setVisible(false); st.current.busy = true;
    window.setTimeout(() => { st.current.spot = n; setSpot(n); setVisible(true); st.current.busy = false; st.current.lit = 0; st.current.unseen = 0; }, 900);
  };

  // detection loop: holding the light on her for DWELL ms counts as finding her
  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now; const s = st.current, b = beam.current;
      if (!s.busy && visible && b) {
        const l = litBy(her.current, root.current, b);
        if (l.lit) {
          s.lit += dt; s.wasLit = true; s.unseen = 0;
          if (her.current) her.current.style.filter = `brightness(${1 + Math.min(1, s.lit / DWELL) * .5}) contrast(1.1)`;
          if (s.lit >= DWELL) catchHer();
        } else {
          if (her.current) her.current.style.filter = '';
          // caught a glimpse, then lost her: sometimes she uses that moment to move
          if (s.wasLit && s.lit > 120 && Math.random() < .4) { s.wasLit = false; setMsg('gone'); audio.creak(.3, (l.cx / (b.w || 1)) * 2 - 1); relocate(s.spot); }
          s.lit = Math.max(0, s.lit - dt * 2); s.wasLit = s.lit > 0;
          s.unseen += dt; if (s.unseen > 9000) relocate(s.spot);
        }
        // her whisper comes from her side of the bus
        s.whisper -= dt;
        if (s.whisper <= 0) { s.whisper = 3200 + Math.random() * 1600; audio.whisper(Math.max(-1, Math.min(1, (l.cx / (b.w || 1)) * 2 - 1)), .55 + (1 - Math.min(1, l.d / (b.w || 1))) * .5); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, visible, spot]); // eslint-disable-line react-hooks/exhaustive-deps

  // the clock
  useEffect(() => {
    if (phase !== 'play' || !timed) return;
    const id = window.setInterval(() => setLeft((l) => {
      if (l <= 1) { window.clearInterval(id); lose(); return 0; }
      if (l <= 10) audio.heartbeat(.35 + (10 - l) * .04);
      return l - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [phase, timed]); // eslint-disable-line react-hooks/exhaustive-deps

  const catchHer = () => {
    const s = st.current; if (s.busy) return;
    s.busy = true; s.lit = 0;
    audio.shriek(.28); audio.thump(.4, 70);
    setMsg('found');
    const n = s.found + 1; s.found = n; setFound(n);
    if (n >= NEED) { window.setTimeout(() => { setPhase('win'); audio.door(); }, 900); return; }
    relocate(s.spot);
  };

  const lose = () => { setPhase('lose'); setScare(true); window.setTimeout(() => setScare(false), store.get().safe ? 2200 : 700); };

  const useHint = () => {
    if (hints <= 0 || phase !== 'play') return;
    setHints((h) => h - 1); setHint(true); audio.whisper(0, 1.2); window.setTimeout(() => setHint(false), 1300);
  };

  const start = (withTimer: boolean) => {
    setTimed(withTimer); setLeft(TIME); setFound(0); setHints(3); setMsg('');
    const first = Math.floor(Math.random() * SPOTS.length);
    st.current = { lit: 0, wasLit: false, unseen: 0, whisper: 600, busy: false, found: 0, spot: first };
    setSpot(first); setVisible(true); setPhase('play'); audio.breath();
  };

  useEffect(() => { if (!msg) return; const id = window.setTimeout(() => setMsg(''), 1300); return () => window.clearTimeout(id); }, [msg, found]);

  const sp = SPOTS[spot];
  return (
    <GameShell title={t('g1k_title')} onExit={() => finishGame('hunt', found >= NEED ? 'win' : 'skip')} label={t('g1k_title')}>
      <div ref={root} className="game-stage" tabIndex={0} onKeyDown={(e) => { if (beam.current && nudgeBeam(beam.current, e.key)) e.preventDefault(); }}>
        <DarkScene src="/raat/scenes/inside-empty.webp" beam={beam}>
          {phase === 'play' && visible && (
            <img ref={her} src={`/raat/cutouts/her-${sp.pose}.webp`} alt="" draggable={false} className="kokila-spot"
              style={{ left: `${sp.x * 100}%`, top: `${(sp.y - sp.h) * 100}%`, height: `${sp.h * 100}%`, width: 'auto', aspectRatio: `${ASPECT[sp.pose]}` }} />
          )}
          {hint && <span className="hint-pulse" style={{ left: `${sp.x * 100}%`, top: `${(sp.y - sp.h / 2) * 100}%` }} aria-hidden />}
        </DarkScene>
      </div>

      {phase === 'play' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[4] flex flex-col items-center gap-2 px-4 text-center">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[.25em] text-ash">
            <span>{t('g1k_found')} {found}/{NEED}</span>
            {timed && <span className={`tabular-nums ${left <= 10 ? 'animate-pulse text-[#c44]' : ''}`}>0:{String(left).padStart(2, '0')}</span>}
          </div>
          {msg && <p className="font-display text-xl text-bone" role="status">{t(msg === 'found' ? 'g1k_found' : 'g1k_gone')}</p>}
          <p className="max-w-md text-[11px] text-ash/70">{t('g1k_how')}</p>
        </div>
      )}
      {phase === 'play' && (
        <button type="button" onClick={useHint} disabled={hints <= 0} className="ghost-btn absolute bottom-24 right-4 z-[4] flex items-center gap-2 bg-black/50 disabled:opacity-30" aria-label={`${t('hint')} (${hints})`}>
          <Lightbulb size={14} aria-hidden /> {t('hint')} · {hints}
        </button>
      )}

      {phase === 'intro' && (
        <Card>
          <p className="text-bone">{t('g1k_a')}</p>
          <p className="mt-2 text-ash">{t('g1k_b')}</p>
          <p className="mt-4 text-xs text-ash/70">{t('g1k_how')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="enter-btn" onClick={() => start(true)}>{t('play')}</button>
            <button type="button" className="ghost-btn" onClick={() => start(false)}>{t('no_timer')}</button>
            <button type="button" className="ghost-btn" onClick={() => finishGame('hunt', 'skip')}>{t('skip')}</button>
          </div>
        </Card>
      )}
      {phase === 'win' && (
        <Card>
          <p className="font-display text-3xl text-bone">{t('g1k_win')}</p>
          <button type="button" className="enter-btn mt-6" onClick={() => finishGame('hunt', 'win')}>{t('continue')}</button>
        </Card>
      )}
      {phase === 'lose' && !scare && (
        <Card>
          <p className="font-display text-3xl text-[#b3262f]">{t('g1k_lose')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="ghost-btn" onClick={() => start(timed)}>{t('retry')}</button>
            <button type="button" className="enter-btn" onClick={() => finishGame('hunt', 'lose')}>{t('continue')}</button>
          </div>
        </Card>
      )}
      {scare && <KokilaScare safe={safe} />}
    </GameShell>
  );
}
