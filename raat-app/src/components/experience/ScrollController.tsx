'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { RANGES, SCENES, TOTAL_VH, cueAt, gamesOf, sceneAt } from '@/data/stories/last-passenger';
import { events, live, store, useStore } from '@/lib/store';
import { scroll } from '@/lib/scroll';

gsap.registerPlugin(ScrollTrigger);

/** One tall scroll track drives the whole film. Native scrolling stays intact; Lenis only smooths it. */
export default function ScrollController() {
  const track = useRef<HTMLDivElement>(null);
  const entered = useStore((s) => s.entered);
  const reduced = useStore((s) => s.reduced);
  const part = useStore((s) => s.part);

  useEffect(() => {
    if (!entered || !track.current) return;
    const lenis = reduced ? null : new Lenis({ lerp: .085, wheelMultiplier: .9, touchMultiplier: 1.4 });
    let raf: ((t: number) => void) | null = null;
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      raf = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }
    const el = track.current;
    const yFor = (p: number) => el.offsetTop + p * (el.offsetHeight - window.innerHeight);

    scroll.lock = (on: boolean) => {
      document.documentElement.classList.toggle('locked', on);
      if (lenis) { if (on) lenis.stop(); else lenis.start(); }
    };
    scroll.toProgress = (p: number, immediate = true) => {
      const y = yFor(p);
      if (lenis) lenis.scrollTo(y, { immediate, force: true }); else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
    };

    // the first update only records where the page is (a part change must not replay every event before it)
    let prev = -1;
    let wasDeepInside = false;
    const st = ScrollTrigger.create({
      trigger: el, start: 'top top', end: 'bottom bottom',
      onUpdate(self) {
        const p = self.progress;
        const { index, local } = sceneAt(p);
        live.p = p; live.local = local; live.velocity = self.getVelocity();
        if (index !== live.sceneIndex) { live.sceneIndex = index; }
        const scene = SCENES[index];
        const cue = cueAt(scene, local);
        store.set({ sceneIndex: index, cueKey: cue ? `${scene.id}:${cue.k}` : `${scene.id}:` });

        // she moves closer every time the visitor scrolls back to check on her
        if (scene.id === 'inside') {
          if (local > .66) wasDeepInside = true;
          if (wasDeepInside && local < .55) { live.lookBacks++; wasDeepInside = false; }
        }

        if (prev < 0) prev = p < .003 ? 0 : p;
        if (p > prev) {
          // one-shot story events, forward only
          SCENES.forEach((s, i) => {
            const r = RANGES[i]; if (r.a < 0) return; // not in the part that is playing
            s.events.forEach((e) => { const at = r.a + e.at * (r.b - r.a); if (prev < at && p >= at) events.emit(e.id); });
            // mini-games wait at the end of their scene
            const next = gamesOf(s).find((g) => !store.get().results[g]);
            if (next && prev < r.b - .0005 && p >= r.b - .0005) {
              scroll.toProgress(r.b - .0006);
              scroll.lock(true);
              store.set({ game: next });
            }
          });
        }
        prev = p;
      },
    });
    ScrollTrigger.refresh();

    return () => {
      st.kill();
      if (raf) gsap.ticker.remove(raf);
      lenis?.destroy();
      scroll.lock = () => {}; scroll.toProgress = () => {};
    };
  }, [entered, reduced, part]);

  return <div ref={track} aria-hidden data-part={part} style={{ height: `${TOTAL_VH}vh` }} className="relative pointer-events-none" />;
}
