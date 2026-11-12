'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useT } from '@/hooks/useT';
import { live, store, useStore } from '@/lib/store';
import { frame } from '@/lib/three/frame';
import { audio } from '@/lib/audio/engine';
import { finishGame } from '@/lib/games/finish';
import { Card, GameShell } from '@/components/ui/GameOverlay';
import { ghostFace, oldPhoto } from '@/components/fx/Overlays';
import type { Key } from '@/data/translations';

type Spot = { id: string; pos: [number, number, number]; label: Key; clue: Key | null };
const SPOTS: Spot[] = [
  { id: 'hair', pos: [2.35, 1.35, -22.0], label: 'g1_spot_seat', clue: 'c_hair' },
  { id: 'photo', pos: [.55, 2.6, -18.0], label: 'g1_spot_rack', clue: 'c_photo' },
  { id: 'bindi', pos: [1.25, 1.75, -12.65], label: 'g1_spot_cabin', clue: 'c_bindi' },
  { id: 'd1', pos: [2.45, 1.5, -17.2], label: 'g1_spot_dark', clue: null },
  { id: 'd2', pos: [.45, 1.95, -20.4], label: 'g1_spot_dark', clue: null },
];
const TIME = 30;

type Phase = 'intro' | 'play' | 'win' | 'lose';

/** WHERE IS SHE? Look around the dark bus with a light and find the three things she left. */
export default function GhostHuntGame() {
  const t = useT();
  const safe = useStore((s) => s.safe);
  const [phase, setPhase] = useState<Phase>('intro');
  const [timed, setTimed] = useState(true);
  const [left, setLeft] = useState(TIME);
  const [found, setFound] = useState<string[]>([]);
  const [shown, setShown] = useState<Spot | null>(null);
  const [scare, setScare] = useState(false);
  const [decoy, setDecoy] = useState(false);
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const root = useRef<HTMLDivElement>(null);
  const torch = useRef({ x: .5, y: .55 });
  const base = useRef(0);
  const drag = useRef<number | null>(null);
  const v = useRef(new THREE.Vector3());

  // look direction: start facing the back of the bus
  useEffect(() => { live.gameYaw = 0; live.gamePitch = -.05; return () => { live.gameYaw = Math.PI; }; }, []);

  // project 3D spots onto the screen every frame
  useEffect(() => {
    let raf = 0, prev = performance.now();
    const loop = () => {
      const now = performance.now(), dt = Math.min(.05, (now - prev) / 1000); prev = now;
      // holding the light near a screen edge turns your head
      const tx = torch.current.x;
      if (tx < .14 || tx > .86) { base.current += (tx < .5 ? -1 : 1) * dt * 1.6; live.gameYaw = base.current + (tx - .5) * 1.5; }
      const cam = frame.camera, el = root.current;
      if (cam && el) {
        const w = el.clientWidth, h = el.clientHeight;
        el.style.setProperty('--tx', `${torch.current.x * 100}%`); el.style.setProperty('--ty', `${torch.current.y * 100}%`);
        SPOTS.forEach((s) => {
          const b = btns.current[s.id]; if (!b) return;
          v.current.set(...s.pos).project(cam);
          const on = v.current.z < 1 && Math.abs(v.current.x) < 1.05 && Math.abs(v.current.y) < 1.05;
          const x = (v.current.x * .5 + .5) * w, y = (-v.current.y * .5 + .5) * h;
          b.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
          b.style.visibility = on ? 'visible' : 'hidden';
          const dx = x - torch.current.x * w, dy = y - torch.current.y * h;
          b.dataset.lit = String(Math.hypot(dx, dy) < Math.min(w, h) * .2);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // timer
  useEffect(() => {
    if (phase !== 'play' || !timed) return;
    const id = window.setInterval(() => setLeft((l) => {
      if (l <= 1) { window.clearInterval(id); lose(); return 0; }
      if (l <= 8) audio.heartbeat(.4 + (8 - l) * .05);
      return l - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [phase, timed]); // eslint-disable-line react-hooks/exhaustive-deps

  const aim = useCallback((cx: number, cy: number) => {
    const el = root.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (cx - r.left) / r.width, y = (cy - r.top) / r.height;
    torch.current = { x, y };
    live.gameYaw = base.current + (x - .5) * 1.5;
    live.gamePitch = -(y - .5) * .7;
  }, []);

  const lose = () => {
    setPhase('lose');
    if (!store.get().safe && !store.get().reduced) { setScare(true); audio.hit(); audio.shriek(.6); window.setTimeout(() => setScare(false), 600); }
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
    if (next.length === SPOTS.filter((x) => x.clue).length) window.setTimeout(() => { setShown(null); setPhase('win'); audio.door(); }, 2200);
    else window.setTimeout(() => setShown((cur) => (cur?.id === s.id ? null : cur)), 2600);
  };

  const start = (withTimer: boolean) => { setTimed(withTimer); setLeft(TIME); setFound([]); setShown(null); setPhase('play'); base.current = 0; audio.breath(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (phase !== 'play') return;
    if (e.key === 'ArrowLeft') { base.current -= .25; live.gameYaw = base.current; }
    if (e.key === 'ArrowRight') { base.current += .25; live.gameYaw = base.current; }
    if (e.key === 'ArrowUp') live.gamePitch = Math.min(.5, live.gamePitch + .1);
    if (e.key === 'ArrowDown') live.gamePitch = Math.max(-.5, live.gamePitch - .1);
  };

  const exit = () => finishGame('hunt', found.length === 3 ? 'win' : 'skip');

  return (
    <GameShell title={t('g1_title')} onExit={exit} label={t('g1_title')}>
      <div
        ref={root}
        className="hunt-dark absolute inset-0 touch-none select-none outline-none"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={(e) => { if (drag.current != null && e.pointerType !== 'mouse') { base.current += (e.clientX - drag.current) * -.004; drag.current = e.clientX; } aim(e.clientX, e.clientY); }}
        onPointerDown={(e) => { drag.current = e.clientX; aim(e.clientX, e.clientY); }}
        onPointerUp={() => { drag.current = null; }}
      >
        {SPOTS.map((s) => (
          <button key={s.id} type="button" ref={(b) => { btns.current[s.id] = b; }} onClick={() => pick(s)} aria-label={t(s.label)}
            className={`hunt-spot ${found.includes(s.id) ? 'done' : ''}`} tabIndex={phase === 'play' ? 0 : -1} style={{ visibility: 'hidden' }}>
            <span className="sr-only">{t(s.label)}</span>
          </button>
        ))}
      </div>

      {phase === 'play' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[4] flex flex-col items-center gap-2 px-4 text-center">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[.25em] text-ash">
            <span>{t('g1_found')} {found.length}/3</span>
            {timed && <span className={`tabular-nums ${left <= 8 ? 'text-[#c44] animate-pulse' : ''}`}>0:{String(left).padStart(2, '0')}</span>}
          </div>
          <p className="max-w-md text-xs text-ash/70">{t('g1_how')}</p>
        </div>
      )}

      {shown && (
        <div className="clue-pop" role="status">
          {shown.id === 'hair' && <svg viewBox="0 0 120 60" className="mx-auto h-14 w-28" aria-hidden><path d="M5 50 C30 5, 50 55, 70 20 S110 10, 115 40" stroke="#0a0a0a" strokeWidth="1.6" fill="none" /></svg>}
          {shown.id === 'photo' && <img src={oldPhoto()} alt="" className="mx-auto h-24 rotate-[-4deg] rounded-sm shadow-xl sepia" />}
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
