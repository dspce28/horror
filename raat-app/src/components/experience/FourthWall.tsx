'use client';
import { useEffect } from 'react';
import { live, store } from '@/lib/store';
import { translate } from '@/data/translations';
import { SCENES } from '@/data/stories/last-passenger';

/** The ghost notices the person behind the screen: when they leave the tab, and when they stop scrolling. */
export default function FourthWall() {
  useEffect(() => {
    const base = document.title;
    const vars = () => { const s = store.get(); return { name: s.name.trim() || translate(s.lang, 'default_name', { name: '', gender: s.gender }), gender: s.gender }; };
    const onVis = () => {
      const s = store.get(); if (!s.entered) return;
      if (document.hidden) document.title = translate(s.lang, 'fw_tab', vars());
      else { document.title = base; if (['highway', 'bus', 'board', 'inside', 'driver', 'encounter', 'twist'].includes(SCENES[s.sceneIndex]?.id)) store.set({ notice: { id: Date.now(), k: 'fw_back', from: 'unknown' } }); }
    };
    document.addEventListener('visibilitychange', onVis);

    let last = live.p, still = 0, nudges = 0;
    const id = window.setInterval(() => {
      const s = store.get();
      if (!s.entered || s.game || (s.call !== 'IDLE' && s.call !== 'DONE') || document.hidden) { still = 0; return; }
      if (Math.abs(live.p - last) > .0005) { last = live.p; still = 0; return; }
      still += 1;
      if (still === 16 && nudges < 2 && ['bus', 'board', 'inside', 'driver', 'encounter'].includes(SCENES[s.sceneIndex]?.id)) { nudges++; store.set({ notice: { id: Date.now(), k: 'fw_idle', from: 'unknown' } }); }
    }, 1000);
    return () => { document.removeEventListener('visibilitychange', onVis); window.clearInterval(id); document.title = base; };
  }, []);
  return null;
}
