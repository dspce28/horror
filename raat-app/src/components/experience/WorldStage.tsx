'use client';
import { visualGender } from '@/lib/gender';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { live, store, useStore } from '@/lib/store';
import { film } from '@/lib/film/clock';
import { SCENES } from '@/data/stories/last-passenger';
import PhotoStage from './PhotoStage';

const HighwayFilm = dynamic(() => import('@/components/film/HighwayFilm'), { ssr: false });
const BusInterior = dynamic(() => import('@/components/film/BusInterior'), { ssr: false });

/** scroll progress → seconds of the highway film (opening 0–5 s, highway 5–30 s, bus 30–44 s) */
const FILM_SPAN: Record<string, [number, number]> = { open: [0, 5], highway: [5, 30], bus: [30, 38.6], p2call: [100, 112], p2return: [120, 135], p2pump: [135, 150] };
/** Part 2 scenes filmed on the same 3D highway */
const P2_ROAD = new Set(['p2call', 'p2return', 'p2pump']);
/** boarding: the first part is the door shot (film 38.6–45 s); the cut to the interior hides in the doorway's light */
const BOARD_CUT = .5;

function webglOk(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

/**
 * Picks the world for the current part of the story: the 3D highway (opening, road, bus arriving),
 * the 3D bus interior, then the photographic stage for the rest.
 */
export default function WorldStage() {
  const scene = useStore((s) => s.sceneIndex);
  const gender = useStore((s) => s.gender);
  const reduced = useStore((s) => s.reduced);
  const [gl, setGl] = useState<boolean | null>(null);
  const [small, setSmall] = useState(false);
  const veil = useRef<HTMLDivElement>(null);
  useEffect(() => { setGl(webglOk()); setSmall(window.innerWidth < 900); }, []);

  const id = SCENES[scene]?.id;
  const [boardIn, setBoardIn] = useState(false);
  const world = !gl ? 'photo' : P2_ROAD.has(id ?? '') ? 'road' : id === 'open' || id === 'highway' || id === 'bus' || (id === 'board' && !boardIn) ? 'road' : id === 'inside' || id === 'board' ? 'interior' : 'photo';

  // which side of the doorway we are on during boarding
  useEffect(() => {
    let raf = 0;
    const loop = () => { const inside = SCENES[live.sceneIndex]?.id === 'board' && live.local >= BOARD_CUT; setBoardIn((b) => (b === inside ? b : inside)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // drive the highway film's clock from the scroll; keep the opening black until the road fades in
  useEffect(() => {
    if (world !== 'road') return;
    let raf = 0;
    const loop = () => {
      const sid = SCENES[live.sceneIndex]?.id ?? 'open', span = FILM_SPAN[sid];
      if (span) film.t = span[0] + (span[1] - span[0]) * live.local;
      else if (sid === 'board') film.t = 38.6 + (45 - 38.6) * Math.min(1, live.local / BOARD_CUT);
      const l = live.local, ramp = (a: number, b: number) => Math.min(1, Math.max(0, (l - a) / (b - a)));
      // Part 2: in from black, out to black between places (the run between them happens in the dark)
      const v = sid === 'open' ? Math.min(1, Math.max(0, 1 - (l - .72) / .28))
        : sid === 'p2call' ? Math.max(1 - ramp(0, .04), ramp(.86, .98))
        : sid === 'p2return' ? 1 - ramp(0, .08)
        : sid === 'p2pump' ? ramp(.93, .97) : 0;
      if (veil.current) veil.current.style.opacity = String(v);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world]);

  if (gl === null) return null;
  return (
    <div className="fixed inset-0 overflow-hidden bg-black" aria-hidden>
      {world === 'road' && <HighwayFilm gender={visualGender(gender, store.get().name)} small={small} reduced={reduced} />}
      {world === 'interior' && <BusInterior small={small} reduced={reduced} progress={() => SCENES[live.sceneIndex]?.id === 'board' ? { mode: 'board', t: Math.max(0, (live.local - BOARD_CUT) / (1 - BOARD_CUT)) } : { mode: 'inside', t: live.local }} />}
      {world === 'photo' && <PhotoStage />}
      {world === 'road' && <div ref={veil} className="pointer-events-none absolute inset-0 bg-ink" />}
    </div>
  );
}
