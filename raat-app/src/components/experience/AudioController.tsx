'use client';
import { useEffect } from 'react';
import { audio } from '@/lib/audio/engine';
import { events, live, store } from '@/lib/store';
import { SCENES } from '@/data/stories/last-passenger';
import { soundAt } from '@/lib/animation/director';
import { film } from '@/lib/film/clock';

function buzzPhone(pattern: number[]) {
  if (store.get().safe || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch { /* not supported */ }
}

/** Sound follows the scroll: layers are set from the current scene, one-shots come from story events. */
export default function AudioController() {
  useEffect(() => {
    const off = events.on((id) => {
      const s = store.get();
      switch (id) {
        case 'whisper-far': audio.whisper(-.7, .5); break;
        case 'ping': audio.ping(); buzzPhone([60, 80, 60]); break;
        case 'bark': audio.bark(); break;
        case 'brake': audio.brake(); live.shake = .9; film.shake = 1.2; break;
        case 'stop': live.shake = .7; film.shake = .7; audio.thump(.4, 70); break;
        case 'door': audio.door(); break;
        case 'step-in': audio.steps(3); break;
        case 'engine-start': audio.thump(.35, 60); break;
        case 'teleport': audio.thump(.5, 70); audio.glitch(); break;
        case 'her-look': audio.heartbeat(.6); buzzPhone([200]); break;
        case 'flicker-out': audio.glitch(); break;
        case 'whisper-close': audio.whisper(.95, 1.3); audio.breath(); break;
        case 'driver-turn': audio.breath(); break;
        case 'thunder': audio.thunder(); live.flash = 1; break;
        case 'stare': audio.themeLevel(0, .2); audio.heartbeat(.6); break;
        case 'crack': audio.crack(); live.shake = 1; break;
        case 'shriek': audio.shriek(.9); live.shake = 1.2; buzzPhone([300, 50, 300]); break;
        case 'jumpscare': audio.hit(); if (!s.safe) audio.shriek(.7); buzzPhone([400]); break;
        case 'yell': audio.shriek(.35); break;
        case 'reveal-next': audio.thump(.5, 50); break;
        case 'burn': audio.burn(); break;
        case 'laugh': audio.laugh(); break;
        case 'call': store.set({ callOpen: true }); break;
        default: break;
      }
    });

    // continuous layers, 10 times a second
    let comedy = false;
    const tick = window.setInterval(() => {
      if (!audio.ok || !store.get().entered) return;
      const i = live.sceneIndex, t = live.local, id = SCENES[i].id;
      const w = soundAt(id, t);
      const s = store.get();
      audio.setEngine(s.game ? w.engine * .4 : w.engine, w.rpm);
      audio.dread(w.dread);
      const inBus = i >= 3 && i <= 6;
      audio.setBuzz(inBus && w.lights ? .5 * Math.min(1, live.flicker) : 0);
      const heart = (id === 'driver' && t > .9) || (id === 'encounter' && t < .93) ? 95 : id === 'inside' && t > .6 ? 72 : 0;
      audio.setHeart(s.game ? 0 : heart);
      const theme = i <= 1 ? .16 : i === 2 ? .1 : i <= 4 ? .07 : id === 'encounter' && t < .62 ? .1 : 0;
      audio.themeLevel(s.game ? .04 : theme);
      const silent = (id === 'encounter' && t > .93) || i === 6;
      audio.bedLevel(silent ? 0 : i >= 7 ? .5 : 1, silent ? .05 : 1);
      if (i === 6 && t < .97 && !comedy) { comedy = true; audio.startComedy(); }
      if ((i !== 6 || t >= .97) && comedy) { comedy = false; audio.stopComedy(); }
      if (i < 5) audio.restoreMusic();
      if (store.get().callOpen) audio.themeLevel(0);
    }, 100);

    return () => { off(); window.clearInterval(tick); audio.stopComedy(); audio.stopRing(); };
  }, []);
  return null;
}
