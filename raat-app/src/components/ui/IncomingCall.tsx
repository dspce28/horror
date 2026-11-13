'use client';
import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { store, useStore, type CallState } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { save, storyTime } from '@/lib/session';
import { scroll } from '@/lib/scroll';
import { ghostFace } from '@/components/fx/Overlays';
import { say, sayAndWait } from '@/lib/audio/voice';
import KokilaScare from './KokilaScare';

const RINGING: CallState[] = ['CALL_1', 'CALL_2', 'CALL_3', 'FORCED_CALL'];
const ACTIVE: CallState[] = ['CALL_1', 'DECLINED_1', 'CALL_2', 'DECLINED_2', 'CALL_3', 'DECLINED_3', 'KOKILA_JUMPSCARE', 'FORCED_CALL', 'ANSWERED', 'FINAL_CONVERSATION', 'APPARITION', 'WHISPER'];

function go(call: CallState, extra: Partial<ReturnType<typeof store.get>> = {}) { store.set({ call, ...extra }); save(); }

/**
 * Kokila's final call, as a state machine:
 * CALL_1 → (decline) DECLINED_1 → CALL_2 → DECLINED_2 → CALL_3 → DECLINED_3 → KOKILA_JUMPSCARE → FORCED_CALL
 * Answering at any ringing state → ANSWERED → FINAL_CONVERSATION → DONE.
 * The state and the decline count live in the session, so scrolling, reloading or a language change can't reset them.
 */
export default function IncomingCall() {
  const t = useT();
  const call = useStore((s) => s.call);
  const declines = useStore((s) => s.declines);
  const safe = useStore((s) => s.safe);
  const lang = useStore((s) => s.lang);
  const gender = useStore((s) => s.gender);
  const [secs, setSecs] = useState(0);
  const [shown, setShown] = useState(0); // which of her two lines is on screen
  const answerBtn = useRef<HTMLButtonElement>(null);

  // while the call is on, the page can't be scrolled away from it
  useEffect(() => {
    const on = ACTIVE.includes(call);
    scroll.lock(on);
    return () => { if (on) scroll.lock(false); };
  }, [call]);

  // ringing: tone + vibration; a declined call rings back after a pause
  useEffect(() => {
    if (RINGING.includes(call)) {
      audio.startRing();
      const vib = window.setInterval(() => { if (!store.get().safe && navigator.vibrate) try { navigator.vibrate([400, 200, 400]); } catch { /* unsupported */ } }, 2600);
      answerBtn.current?.focus();
      return () => { audio.stopRing(); window.clearInterval(vib); };
    }
    if (call === 'DECLINED_1' || call === 'DECLINED_2') {
      store.set({ notice: { id: Date.now(), k: 'call_again', from: 'kokila' } });
      const id = window.setTimeout(() => go(call === 'DECLINED_1' ? 'CALL_2' : 'CALL_3'), 2600);
      return () => window.clearTimeout(id);
    }
    if (call === 'DECLINED_3') { const id = window.setTimeout(() => go('KOKILA_JUMPSCARE'), 120); return () => window.clearTimeout(id); }
    if (call === 'KOKILA_JUMPSCARE') {
      // black, then her, right behind: "Pick up."
      const v = window.setTimeout(() => { void say('call_scare', { from: 'behind' }); }, safe ? 1300 : 950);
      const id = window.setTimeout(() => go('FORCED_CALL'), safe ? 3800 : 3900);
      return () => { window.clearTimeout(v); window.clearTimeout(id); };
    }
    if (call === 'ANSWERED') { audio.callConnect(); const id = window.setTimeout(() => go('FINAL_CONVERSATION'), 1300); return () => window.clearTimeout(id); }
    if (call === 'FINAL_CONVERSATION') {
      // silence; breathing; her two lines through the phone, with room between them; then the line goes dead
      let alive = true; const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
      setSecs(0); setShown(0);
      const tick = window.setInterval(() => setSecs((x) => x + 1), 1000);
      audio.setLine(1);
      void (async () => {
        await wait(1800); if (!alive) return; audio.breath();
        await wait(1500); if (!alive) return; setShown(1); await sayAndWait('call_line1', { phone: true }, 3400);
        if (!alive) return; await wait(2000);
        if (!alive) return; setShown(2); await sayAndWait('call_line2', { phone: true }, 4800);
        if (!alive) return; await wait(1300);
        audio.setLine(0); audio.callEnd(); go('APPARITION');
      })();
      return () => { alive = false; window.clearInterval(tick); audio.setLine(0); };
    }
  }, [call, safe]);

  // the forced call: any key answers too (keyboard, switch access)
  useEffect(() => {
    if (call !== 'FORCED_CALL') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(); } };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [call]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = () => {
    if (!RINGING.includes(store.get().call)) return;
    audio.stopRing();
    if (store.get().callAccepted == null) store.set({ callAccepted: store.get().call === 'CALL_1' });
    go('ANSWERED');
  };
  const decline = () => {
    const c = store.get().call;
    if (c === 'FORCED_CALL' || !RINGING.includes(c)) return;
    audio.stopRing();
    const n = declines + 1;
    go(c === 'CALL_1' ? 'DECLINED_1' : c === 'CALL_2' ? 'DECLINED_2' : 'DECLINED_3', { declines: n });
  };

  if (call === 'KOKILA_JUMPSCARE') return <KokilaScare safe={safe} line={t('call_scare')} />;
  if (!RINGING.includes(call) && call !== 'ANSWERED' && call !== 'FINAL_CONVERSATION') return null;

  const ringing = RINGING.includes(call), forced = call === 'FORCED_CALL';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={t('call_in')}>
      <div className={`phone-call ${ringing ? 'ringing' : ''} ${forced ? 'forced' : ''}`}>
        <p className="text-xs text-ash/60">{storyTime('now', lang)}</p>
        <p className="mt-2 text-xs uppercase tracking-[.25em] text-ash/70" aria-live="polite">
          {ringing ? t('call_in') : call === 'ANSWERED' ? t('call_connecting') : `0:${String(secs).padStart(2, '0')}`}
        </p>
        <div className="mx-auto mt-6 h-24 w-24 overflow-hidden rounded-full border border-ash/20"><img src={ghostFace()} alt="" className="h-full w-full scale-125 object-cover blur-[1.5px] grayscale" /></div>
        <p className="mt-4 font-display text-3xl tracking-[.15em] text-bone">{t('call_name')}</p>
        {call === 'FINAL_CONVERSATION' && (
          <div className="mt-6 space-y-3" aria-live="polite">
            {shown >= 1 && <p className="font-display text-xl text-bone" style={{ animation: 'lineIn .8s ease both' }}>{t('call_line1')}</p>}
            {shown >= 2 && <p className="font-display text-xl text-bone" style={{ animation: 'lineIn .8s ease both' }}>{t('call_line2')}</p>}
          </div>
        )}
        {ringing && (
          <>
            <div className={`mb-8 mt-10 flex justify-center ${forced ? "" : "gap-14"}`}>
              {!forced && <button type="button" onClick={decline} className="call-btn bg-[#72191F]" aria-label={t('call_decline')}><PhoneOff size={24} /><span>{t('call_decline')}</span></button>}
              <button ref={answerBtn} type="button" onClick={answer} className={`call-btn bg-[#2f4a35] ${forced ? 'big' : ''}`} aria-label={t('call_accept')}><Phone size={forced ? 30 : 24} /><span>{t('call_accept')}</span></button>
            </div>
            {forced && <p className="mt-10 text-xs text-ash/70">{t('call_forced')}</p>}
          </>
        )}
      </div>
    </div>
  );
}

/** Starts the call the first time the story reaches it; never restarts a call already in progress or finished. */
export function startCallIfIdle() {
  const s = store.get(); if (s.call !== 'IDLE') return;
  // resume where the visitor left off: three declines already means she will not take no again
  go(s.declines >= 3 ? 'FORCED_CALL' : s.declines === 2 ? 'CALL_3' : s.declines === 1 ? 'CALL_2' : 'CALL_1');
}
