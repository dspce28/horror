'use client';
import { useEffect } from 'react';
import { audio } from '@/lib/audio/engine';
import { events, live, store } from '@/lib/store';
import { SCENES, sceneIndex } from '@/data/stories/last-passenger';
import { soundAt } from '@/lib/animation/director';
import { film } from '@/lib/film/clock';
import { startCallIfIdle } from '@/components/ui/IncomingCall';
import { preload, say } from '@/lib/audio/voice';

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
        case 'night': break;                                                    // wind only: a lonely, empty road
        case 'dog-cry': audio.dogCry(Math.random() < .5 ? -.7 : .6); break;
        case 'horn': audio.horn(.9); break;                                      // the bus, before it is seen
        case 'horn-far': audio.horn(.3); break;                                  // the bus, from inside the fog
        case 'window-tap': if (!s.safe) audio.windowTap(-.55); else audio.windowTap(-.55, 1); break;
        case 'breath-far': audio.breath(); break;
        case 'ping': audio.ping(); buzzPhone([60, 80, 60]); break;
        case 'bark': audio.bark(); break;
        case 'bike-ride': audio.setBike(1, .6); break;
        case 'bike-sputter': audio.bikeSputter(); break;
        case 'bike-stop': audio.bikeStop(); audio.hushAll(3); break;          // then a few seconds of silence
        case 'engine-far': break;
        case 'brake': audio.brake(); live.shake = .9; film.shake = 1.2; break;
        case 'stop': live.shake = .7; film.shake = .7; audio.thump(.4, 70); break;
        case 'door-open': audio.door(); break;
        case 'steps-metal': audio.stepsMetal(3); break;
        case 'door-close': audio.doorClose(); live.shake = .4; break;          // final
        case 'creak-back': audio.creak(.4, .8); break;
        case 'engine-start': audio.thump(.35, 60); break;
        case 'fabric': audio.fabric(-.4); break;
        case 'seat-spring': audio.seatSpring(.2); break;
        case 'bangles': audio.bangles(.55, Math.random() * 1.2 - .6); break;   // her: heard before (or instead of) seen
        case 'hum-far': audio.hum(.6, true, -.5); break;                    // she was on the highway before the bus came
        case 'hum-close': audio.hum(.8, false, .6); break;
        case 'mirror': audio.breath(); audio.creak(.15, -.2); break; // he inhales; the seat shifts under him
        case 'stutter': audio.stutter(); live.flash = 0; break;
        case 'hush': audio.hushAll(2.2); break;                                 // silence before her voice
        case 'breath-close': audio.breathClose(); break;
        case 'teleport': audio.creak(.45, .6); break;
        case 'flicker-out': audio.glitch(); break;
        case 'creak-metal': audio.creak(.3, .25); break;
        case 'stare': audio.themeLevel(0, .2); audio.heartbeat(.5); break;
        case 'lights-die': audio.creak(.55, .7); window.setTimeout(() => audio.vibrate(1), 900); live.shake = s.safe ? 0 : .4; buzzPhone([120]); break;
        case 'engine-cut': audio.engineCut(); audio.hushAll(1.5); break;
        case 'driver-turn': audio.breathClose(); break;
        case 'heartbeat': audio.heartbeat(.5); break;
        case 'jumpscare': if (s.safe) { audio.breathClose(); } else { audio.hit(); audio.shriek(.5); live.shake = .8; buzzPhone([300]); } break;
        case 'lights-back': audio.lightsBack(); break;
        case 'bus-slow': audio.brake(); break;
        case 'bus-away': break;                                                  // the engine fades with the fog (soundAt)
        case 'silence': audio.hushAll(4); break;
        case 'reveal-next': audio.thump(.4, 50); break;
        case 'burn': audio.burn(); break;
        case 'vibrate': audio.vibrate(2); buzzPhone([200, 100, 200]); break;
        case 'call': startCallIfIdle(); break;
        default: break;
      }
    });

    // a voiced line is spoken when the visitor reaches it (scrolling forward); upcoming lines are fetched early
    let lastCue = '', lastScene = -1;
    const offCue = store.subscribe(() => {
      const st = store.get(); const key = st.cueKey;
      if (key === lastCue) return;
      const prev = lastCue; lastCue = key;
      const [sid, k] = key.split(':');
      const scene = SCENES.find((x) => x.id === sid); const cue = scene?.cues.find((c) => c.k === k);
      if (!cue?.voice || st.game) return;
      // only when moving forward onto it (not when scrolling back past it)
      const order = (ck: string) => { const [a, b] = ck.split(':'); const si = SCENES.findIndex((x) => x.id === a); return si * 100 + (SCENES[si]?.cues.findIndex((c) => c.k === b) ?? 0); };
      if (prev && order(key) <= order(prev)) return;
      void say(cue.k, { from: cue.from });
    });

    // continuous layers, 10 times a second
    const tick = window.setInterval(() => {
      if (!audio.ok || !store.get().entered) return;
      const i = live.sceneIndex, t = live.local, id = SCENES[i].id;
      if (i !== lastScene) { lastScene = i; [i, i + 1].forEach((j) => SCENES[j] && preload(SCENES[j].cues.map((c) => c.k))); }
      const w = soundAt(id, t);
      const s = store.get();
      // before boarding: the empty road (soft wind, the bus arriving). After the door shuts: only the horror theme and
      // single effects (no rain, no wind, no engine drone, no tube hum, no rattle)
      const before = id === 'open' || id === 'highway' || id === 'bus' || (id === 'board' && t < .55);
      audio.setEngine(before && id !== 'open' ? w.engine * .7 : 0, w.rpm);
      audio.dread(w.dread);
      audio.setBuzz(0);
      audio.setBike(id === 'highway' && t < .5 ? 1 : 0, .6);
      audio.setInsects(0);
      audio.setRain(0);
      const heart = (id === 'driver' && t > .7) || (id === 'reveal' && t > .4 && t < .9) ? 90 : id === 'inside' && t > .6 ? 70 : 0;
      audio.setHeart(s.game ? 0 : heart);
      // the horror theme stays under the whole story, low; the effects sit above it
      const call = s.call !== 'IDLE' && s.call !== 'DONE';
      audio.themeLevel(s.game ? .07 : call ? .06 : .12);
      audio.bedLevel(before ? .75 : 0, before ? 1 : 2.5);
      if (i < sceneIndex('reveal')) audio.restoreMusic();
      const c = store.get().call; if (c !== 'IDLE' && c !== 'DONE') audio.themeLevel(0);
    }, 100);

    return () => { off(); offCue(); window.clearInterval(tick); audio.stopRing(); audio.setLine(0); };
  }, []);
  return null;
}
