'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { live, useStore } from '@/lib/store';
import { film } from '@/lib/film/clock';
import { SCENES } from '@/data/stories/last-passenger';
import PhotoStage from './PhotoStage';

const HighwayFilm = dynamic(() => import('@/components/film/HighwayFilm'), { ssr: false });
const BusInterior = dynamic(() => import('@/components/film/BusInterior'), { ssr: false });

/** scroll progress → seconds of the highway film (opening 0–5 s, highway 5–30 s, bus 30–44 s) */
const FILM_SPAN: Record<string, [number, number]> = { open: [0, 5], highway: [5, 30], bus: [30, 44] };

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
  const world = !gl ? 'photo' : id === 'open' || id === 'highway' || id === 'bus' ? 'road' : id === 'inside' ? 'interior' : 'photo';

  // drive the highway film's clock from the scroll; keep the opening black until the road fades in
  useEffect(() => {
    if (world !== 'road') return;
    let raf = 0;
    const loop = () => {
      const sid = SCENES[live.sceneIndex]?.id ?? 'open', span = FILM_SPAN[sid];
      if (span) film.t = span[0] + (span[1] - span[0]) * live.local;
      if (veil.current) veil.current.style.opacity = String(sid === 'open' ? Math.min(1, Math.max(0, 1 - (live.local - .72) / .28)) : 0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world]);

  if (gl === null) return null;
  return (
    <div className="fixed inset-0 overflow-hidden bg-black" aria-hidden>
      {world === 'road' && <HighwayFilm gender={gender} small={small} reduced={reduced} />}
      {world === 'interior' && <BusInterior small={small} reduced={reduced} progress={() => live.local} />}
      {world === 'photo' && <PhotoStage />}
      {world === 'road' && <div ref={veil} className="pointer-events-none absolute inset-0 bg-ink" />}
    </div>
  );
}
