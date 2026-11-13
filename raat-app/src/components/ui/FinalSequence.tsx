'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/hooks/useT';
import { store, useStore, type CallState } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { say } from '@/lib/audio/voice';
import { save } from '@/lib/session';

function go(call: CallState, extra: Partial<ReturnType<typeof store.get>> = {}) { store.set({ call, ...extra }); save(); }

/**
 * After the call. She was never on the bus; she is behind {N}.
 * APPARITION: the phone screen goes dark and shows a face that isn't {N}'s; the phone drops; a shadow, hair at
 * the edge of the frame, a breath; then her, very close. Hard cut to black (no transition).
 * WHISPER: black, silence, "We'll meet again." Then 3–4 seconds of black, then the end card.
 * In no-jump-scare mode every step is slower and her face rises out of the dark instead of cutting in.
 */
export default function FinalSequence() {
  const t = useT();
  const call = useStore((s) => s.call);
  const safe = useStore((s) => s.safe);
  const [step, setStep] = useState(0);
  const [sub, setSub] = useState(false);

  useEffect(() => {
    const ids: number[] = []; const at = (ms: number, f: () => void) => ids.push(window.setTimeout(f, ms));
    if (call === 'APPARITION') {
      setStep(1);                                                     // the dark screen, a face in it
      at(600, () => audio.breathClose());
      at(safe ? 2800 : 2400, () => { setStep(2); audio.fabric(-.5); }); // the phone drops; a shadow; hair
      at(safe ? 4300 : 3800, () => audio.breathClose());
      at(safe ? 5400 : 5200, () => { setStep(3); if (!safe) { audio.hit(); } });   // her, very close
      at(safe ? 9200 : 6900, () => { setStep(4); audio.hush(); audio.hushAll(6); go('WHISPER'); }); // cut to black
    }
    if (call === 'WHISPER') {
      setStep(4);
      at(1800, async () => {
        setSub(true);
        const d = await say('whisper_end', { from: 'behind' });
        window.setTimeout(() => {
          setSub(false);
          // let the whisper decay; 3–4 seconds of black; then the end card
          window.setTimeout(() => { go('DONE', { finished: true }); setStep(0); }, 3600);
        }, d > 0 ? d * 1000 + 900 : 2600);
      });
    }
    if (call === 'IDLE' || call === 'DONE') { setStep(0); setSub(false); }
    return () => ids.forEach(window.clearTimeout);
  }, [call, safe]);

  if (step === 0) return null;
  return (
    <div className={`fin ${safe ? 'safe' : ''}`} aria-live="polite">
      {step < 4 && (
        <>
          <div className={`fin-phone ${step >= 2 ? 'drop' : ''}`}>
            <p className="text-xs uppercase tracking-[.25em] text-ash/60">{t('call_ended')}</p>
            <p className="mt-3 font-display text-2xl tracking-[.15em] text-bone/70">{t('call_name')}</p>
            <div className="fin-reflect" aria-hidden />
          </div>
          {step >= 2 && <div className="fin-shadow" aria-hidden />}
          {step >= 2 && <div className="fin-hair" aria-hidden />}
          {step >= 3 && <div className="fin-face" role="img" aria-label={t('call_name')} />}
        </>
      )}
      {step >= 4 && <div className="fin-black" />}
      {sub && <p className="fin-sub">{t('whisper_end')}</p>}
    </div>
  );
}
