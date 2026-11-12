'use client';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { live, store, useStore } from '@/lib/store';
import { guessGender } from '@/lib/gender';
import type { Lang } from '@/data/translations';
import Entry from './Entry';
import ScrollController from './ScrollController';
import AudioController from './AudioController';
import FourthWall from './FourthWall';
import Overlays from '@/components/fx/Overlays';
import AtmosphereCanvas from '@/components/fx/AtmosphereCanvas';
import Hud from '@/components/ui/Hud';
import StoryText from '@/components/ui/StoryText';
import PhoneNotification from '@/components/ui/PhoneNotification';
import EndingCard, { CallScreen } from '@/components/ui/EndingCard';
import TicketScene from '@/components/scenes/TicketScene';
import { useT } from '@/hooks/useT';

// Heavy pieces load only when needed.
const StoryCanvas = dynamic(() => import('./StoryCanvas'), { ssr: false });
const GhostHuntGame = dynamic(() => import('@/components/games/GhostHuntGame'), { ssr: false });
const PhotographPuzzle = dynamic(() => import('@/components/games/PhotographPuzzle'), { ssr: false });

function webglOk(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export default function Experience() {
  const t = useT();
  const entered = useStore((s) => s.entered);
  const webgl = useStore((s) => s.webgl);
  const game = useStore((s) => s.game);
  const scene = useStore((s) => s.sceneIndex);
  const lang = useStore((s) => s.lang);

  // first visit: language, reduced motion, device class, remembered name
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const small = window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches;
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    let saved: Lang | null = null, name = '', gender: 'm' | 'f' | null = null;
    try { saved = localStorage.getItem('raat-lang') as Lang | null; name = localStorage.getItem('raat-name') ?? ''; gender = localStorage.getItem('raat-gender') as 'm' | 'f' | null; } catch { /* private mode */ }
    const guess: Lang = /^gu/i.test(navigator.language) ? 'gu' : /^hi/i.test(navigator.language) ? 'hi' : 'en';
    store.set({ reduced, quality: small || weak ? 'low' : 'high', webgl: webglOk(), lang: saved ?? guess, name, gender: gender ?? guessGender(name) });
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('entered', entered); }, [entered]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('raat-lang', lang); } catch { /* private mode */ }
  }, [lang]);

  // pointer parallax for the camera (touch drags count too)
  useEffect(() => {
    const onMove = (e: PointerEvent) => { live.pointer.x = (e.clientX / window.innerWidth) * 2 - 1; live.pointer.y = (e.clientY / window.innerHeight) * 2 - 1; };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <main className={`lang-${lang} relative min-h-screen bg-ink text-bone`}>
      {entered && webgl && <StoryCanvas />}
      {entered && !webgl && (
        <div className="fixed inset-0"><AtmosphereCanvas red={false} density={1.4} /><p className="absolute inset-x-0 top-16 px-6 text-center text-xs text-ash/70">{t('webgl_off')}</p></div>
      )}
      {entered && scene >= 7 && <div className="fixed inset-0"><AtmosphereCanvas red={scene === 8} density={.7} /></div>}
      <ScrollController />
      {entered && (
        <>
          <AudioController />
          <FourthWall />
          <TicketScene />
          <StoryText />
          <PhoneNotification />
          <CallScreen />
          <EndingCard />
        </>
      )}
      <Overlays />
      <Hud />
      {game === 'hunt' && <GhostHuntGame />}
      {game === 'photo' && <PhotographPuzzle />}
      <Entry />
    </main>
  );
}
