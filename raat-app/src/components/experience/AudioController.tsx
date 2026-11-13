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
        // ---------- Part 2 ----------
        case 'p2-night': audio.startBed(); break;
        case 'p2-walk': audio.footsteps(6, 'road'); break;
        case 'p2-run': audio.footsteps(8, 'road', true); audio.breathHeavy(3); live.shake = s.safe ? 0 : .3; break;
        case 'p2-run-stop': audio.breathHeavy(3); break;
        case 'anklet': audio.anklet(.3); break;
        case 'diya': audio.diya(); break;
        case 'metal-ring': audio.metalRing(.25); break;
        case 'rumble': audio.rumble(.5); break;
        case 'her-step': audio.fabric(.3); if (Math.random() < .6) audio.anklet(.18); break;   // closer each time: saree, anklets
        case 'diya-out': audio.hushAll(1.2); audio.breath(); break;
        case 'knock-1': audio.knock(1); break;
        case 'knock-2': audio.knock(2, false, .38); break;
        case 'chain': audio.chain(); break;
        case 'door-wood': audio.doorWood(); break;
        case 'steps-stone': audio.footsteps(4, 'stone'); break;
        case 'leaves': audio.leaves(.5); break;
        case 'rope-creak': audio.ropeCreak(.5); break;
        case 'metal-impact': if (s.safe) audio.thump(.3, 80); else { audio.metalImpact(.7); live.shake = .5; } break;
        case 'p2-silence': audio.hushAll(2.5); break;
        case 'metal-vibe': audio.metalVibe(.35); break;
        case 'msg-run': audio.vibrate(2); buzzPhone([150, 80, 150]); store.set({ notice: { id: Date.now(), k: 'p2_msg1', from: 'kokila' } }); break;
        case 'msg-enter': audio.vibrate(2); buzzPhone([150, 80, 150]); store.set({ notice: { id: Date.now(), k: 'p2_msg2', from: 'kokila' } }); break;
        case 'debris': audio.debris(); live.shake = s.safe ? .1 : .5; break;
        case 'ritual-move': audio.ritualMove(); break;
        case 'doll-amb': audio.hum(.25, true, -.3); break;
        case 'knocks-inside': audio.knock(3, true, .55); live.shake = s.safe ? 0 : .15; break;
        case 'traffic': audio.traffic(.4); break;
        case 'tank-open': audio.creak(.15, .3); window.setTimeout(() => audio.thump(.12, 400), 500); break;
        case 'laugh': audio.laugh(.7, true); break;
        case 'p2-end': audio.hushAll(1.5); window.setTimeout(() => { store.set({ p2done: true }); }, 900); break;
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
      const p2 = id.startsWith('p2');
      const before = id === 'open' || id === 'highway' || id === 'bus' || (id === 'board' && t < .55);
      audio.setEngine(before && id !== 'open' ? w.engine * .7 : 0, w.rpm);
      audio.dread(w.dread);
      // Part 2: the petrol pump's tube light hums
      audio.setBuzz(id === 'p2pump' && t < .93 ? .35 : 0);
      audio.setBike(id === 'highway' && t < .5 ? 1 : 0, .6);
      // Part 2 outdoors: a few insects, very low, on the road and at the crossroads only
      audio.setInsects(id === 'p2call' || id === 'p2cross' ? .12 : 0);
      audio.setRain(0);
      const heart = (id === 'driver' && t > .7) || (id === 'reveal' && t > .4 && t < .9) ? 90 : id === 'inside' && t > .6 ? 70
        : (id === 'p2her' && t > .3 && t < .7) || (id === 'p2banyan' && t > .3 && t < .72) || (id === 'p2house' && t > .6 && t < .9) ? 80 : 0;
      audio.setHeart(s.game ? 0 : heart);
      // the horror theme stays under the whole story, low; the effects sit above it
      const call = s.call !== 'IDLE' && s.call !== 'DONE';
      audio.themeLevel(s.game ? .07 : call || s.p2call === 'RING' || s.p2call === 'TALK' ? .05 : id === 'p2banyan' && t > .72 && t < .8 ? 0 : .12);
      // wind: before boarding in Part 1; everywhere outside in Part 2, but gone in the banyan's silence and the black at the end
      const p2wind = p2 && !(id === 'p2banyan' && t > .72 && t < .8) && !(id === 'p2pump' && t > .93) ? (id === 'p2build' ? .9 : .6) : 0;
      audio.bedLevel(before ? .75 : p2wind, before || p2 ? 1 : 2.5);
      if (i < sceneIndex('reveal')) audio.restoreMusic();
      const c = store.get().call; if (c !== 'IDLE' && c !== 'DONE') audio.themeLevel(0);
    }, 100);

    return () => { off(); offCue(); window.clearInterval(tick); audio.stopRing(); audio.setLine(0); };
  }, []);
  return null;
}
