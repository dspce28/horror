'use client';
import { useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { events, store, useStore } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { storyTime } from '@/lib/session';
import { scroll } from '@/lib/scroll';
import { ghostFace } from '@/components/fx/Overlays';
import { sayAndWait } from '@/lib/audio/voice';

/**
 * Part 2's two calls from KOKILA BEN. The visitor answers (there is no decline in Part 2).
 * 1 · on the highway: "Walk away from there… and don't look back." Then: call ended, no network.
 * 2 · at the petrol pump: silence, a small laugh, the line, her laughter.
 * While a call is on, the page can't be scrolled away from it.
 */
export default function Part2Call() {
  const t = useT();
  const state = useStore((s) => s.p2call);
  const n = useStore((s) => s.p2callN);
  const lang = useStore((s) => s.lang);
  const [line, setLine] = useState<'' | 'laugh' | 'l1' | 'l2' | 'ended'>('');
  const [secs, setSecs] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => events.on((id) => {
    const s = store.get();
    if (id === 'p2-call-1' && s.p2callN < 1) store.set({ p2call: 'RING', p2callN: 1, callOpen: true });
    if (id === 'p2-call-2' && s.p2callN < 2) store.set({ p2call: 'RING', p2callN: 2, callOpen: true });
  }), []);

  useEffect(() => {
    const on = state === 'RING' || state === 'TALK';
    scroll.lock(on);
    return () => { if (on) scroll.lock(false); };
  }, [state]);

  useEffect(() => {
    if (state === 'RING') {
      setLine(''); audio.startRing(); btn.current?.focus();
      const vib = window.setInterval(() => { if (!store.get().safe && navigator.vibrate) try { navigator.vibrate([400, 200, 400]); } catch { /* unsupported */ } }, 2600);
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(); } };
      addEventListener('keydown', onKey);
      return () => { audio.stopRing(); window.clearInterval(vib); removeEventListener('keydown', onKey); };
    }
    if (state !== 'TALK') return;
    let alive = true; const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    setSecs(0);
    const tick = window.setInterval(() => setSecs((x) => x + 1), 1000);
    audio.callConnect(); audio.setLine(1);
    void (async () => {
      if (n === 1) {
        await wait(1600); if (!alive) return; audio.breath();
        await wait(1100); if (!alive) return; setLine('l1'); await sayAndWait('p2_call1', { phone: true }, 3800);
      } else {
        // silence on the line; a small laugh; then the line
        await wait(2400); if (!alive) return; setLine('laugh'); audio.laugh(.45, true);
        await wait(1700); if (!alive) return; setLine('l2'); await sayAndWait('p2_call2', { phone: true }, 3800);
        if (!alive) return; audio.laugh(.8, true);
        await wait(1400);
      }
      if (!alive) return;
      audio.setLine(0); audio.callEnd(); setLine('ended');
      await wait(n === 1 ? 2200 : 900); if (!alive) return;
      store.set({ p2call: 'ENDED', callOpen: false });
    })();
    return () => { alive = false; window.clearInterval(tick); audio.setLine(0); };
  }, [state, n]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = () => { if (store.get().p2call !== 'RING') return; audio.stopRing(); store.set({ p2call: 'TALK' }); };

  if (state !== 'RING' && state !== 'TALK') return null;
  const ringing = state === 'RING';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={t('call_in')}>
      <div className={`phone-call ${ringing ? 'ringing' : ''}`}>
        <p className="text-xs text-ash/60">{storyTime('now', lang)}</p>
        <p className="mt-2 text-xs uppercase tracking-[.25em] text-ash/70" aria-live="polite">
          {ringing ? t('call_in') : line === 'ended' ? (n === 1 ? `${t('p2_ended')} · ${t('p2_nonet')}` : t('p2_ended')) : `0:${String(secs).padStart(2, '0')}`}
        </p>
        <div className="mx-auto mt-6 h-24 w-24 overflow-hidden rounded-full border border-ash/20"><img src={ghostFace()} alt="" className="h-full w-full scale-125 object-cover blur-[1.5px] grayscale" /></div>
        <p className="mt-4 font-display text-3xl tracking-[.15em] text-bone">{t('call_name')}</p>
        {!ringing && (
          <div className="mt-6 min-h-[4.5rem] space-y-3" aria-live="polite">
            {line === 'laugh' && <p className="text-sm italic text-ash" style={{ animation: 'lineIn .8s ease both' }}>{t('p2_laugh')}</p>}
            {(line === 'l1' || (line === 'ended' && n === 1)) && <p className="font-display text-xl text-bone" style={{ animation: 'lineIn .8s ease both' }}>{t('p2_call1')}</p>}
            {(line === 'l2' || (line === 'ended' && n === 2)) && <p className="font-display text-xl text-bone" style={{ animation: 'lineIn .8s ease both' }}>{t('p2_call2')}</p>}
          </div>
        )}
        {ringing && (
          <div className="mb-8 mt-10 flex justify-center">
            <button ref={btn} type="button" onClick={answer} className="call-btn big bg-[#2f4a35]" aria-label={t('call_accept')}><Phone size={28} /><span>{t('call_accept')}</span></button>
          </div>
        )}
      </div>
    </div>
  );
}
