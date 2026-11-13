'use client';
import { useEffect } from 'react';
import { audio } from '@/lib/audio/engine';
import { events, live, store } from '@/lib/store';
import { SCENES, sceneIndex } from '@/data/stories/last-passenger';
import { soundAt } from '@/lib/animation/director';
import { film } from '@/lib/film/clock';
import { startCallIfIdle } from '@/components/ui/IncomingCall';

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
        case 'door-open': audio.door(); break;
        case 'steps-metal': audio.stepsMetal(3); break;
        case 'door-close': audio.doorClose(); live.shake = .4; break;
        case 'creak-back': audio.creak(.4, .8); break;
        case 'step-in': audio.steps(3); break;
        case 'engine-start': audio.thump(.35, 60); break;
        case 'teleport': audio.thump(.5, 70); audio.glitch(); break;
        case 'her-look': audio.heartbeat(.6); buzzPhone([200]); break;
        case 'flicker-out': audio.glitch(); break;
        case 'whisper-close': audio.whisper(.95, 1.3); audio.breath(); break;
        case 'driver-turn': audio.breath(); break;
        case 'thunder': audio.thunder(); live.flash = 1; break;
        case 'stare': audio.themeLevel(0, .2); audio.heartbeat(.6); break;
        // story-motivated, not broken glass: the lights die, a seat creaks behind you, the phone buzzes with nothing on it
        case 'lights-die': audio.creak(.55, .7); window.setTimeout(() => audio.vibrate(1), 900); live.shake = .4; buzzPhone([120]); break;
        case 'shriek': audio.shriek(.9); live.shake = 1.2; buzzPhone([300, 50, 300]); break;
        case 'jumpscare': audio.hit(); if (!s.safe) audio.shriek(.7); buzzPhone([400]); break;
        case 'yell': audio.shriek(.35); break;
        case 'reveal-next': audio.thump(.5, 50); break;
        case 'burn': audio.burn(); break;
        case 'laugh': audio.laugh(); break;
        case 'call': startCallIfIdle(); break;
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
      const inBus = ['board', 'inside', 'driver', 'encounter', 'twist'].includes(id) && !(id === 'board' && t < .55);
      audio.setBuzz(inBus && w.lights ? .5 * Math.min(1, live.flicker) : 0);
      const heart = (id === 'driver' && t > .9) || (id === 'encounter' && t < .93) ? 95 : id === 'inside' && t > .6 ? 72 : 0;
      audio.setHeart(s.game ? 0 : heart);
      const theme = id === 'open' || id === 'highway' ? .16 : id === 'bus' || id === 'board' ? .1 : id === 'inside' || id === 'driver' ? .07 : id === 'encounter' && t < .62 ? .1 : 0;
      audio.themeLevel(s.game ? .04 : theme);
      const silent = (id === 'encounter' && t > .93) || id === 'twist';
      audio.bedLevel(silent ? 0 : id === 'ticket' || id === 'end' ? .5 : 1, silent ? .05 : 1);
      audio.setRain(id === 'highway' || id === 'bus' || (id === 'board' && t < .55) ? .9 : inBus ? .45 : 0);
      if (id === 'twist' && t < .97 && !comedy) { comedy = true; audio.startComedy(); }
      if ((id !== 'twist' || t >= .97) && comedy) { comedy = false; audio.stopComedy(); }
      if (i < sceneIndex('encounter')) audio.restoreMusic();
      const c = store.get().call; if (c !== 'IDLE' && c !== 'DONE') audio.themeLevel(0);
    }, 100);

    return () => { off(); window.clearInterval(tick); audio.stopComedy(); audio.stopRing(); };
  }, []);
  return null;
}
