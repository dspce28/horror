'use client';
import { useMemo } from 'react';
import { SCENES } from '@/data/stories/last-passenger';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useT';
import { ghostFace } from '@/components/fx/Overlays';
import type { Key } from '@/data/translations';
import RevealText from './RevealText';

/** Narration as large cinematic type; dialogue as subtitles with the speaker's name. */
export default function StoryText() {
  const t = useT();
  const cueKey = useStore((s) => s.cueKey);
  const game = useStore((s) => s.game);
  const batt = useStore((s) => s.batt);
  const name = useStore((s) => s.name);
  const callOpen = useStore((s) => s.call !== 'IDLE' && s.call !== 'DONE');
  const finished = useStore((s) => s.finished || s.p2done);
  const cue = useMemo(() => {
    const [sid, k] = cueKey.split(':');
    const scene = SCENES.find((s) => s.id === sid);
    return scene?.cues.find((c) => c.k === k) ?? null;
  }, [cueKey]);
  if (!cue || game || callOpen || finished || cue.who === 'phone') return null;

  const k: Key = cue.k === 'fw_batt' && batt == null ? 'fw_nobatt' : cue.k;
  const text = t(k);
  const speaker = cue.who === 'you' ? (name.trim() || t('default_name')) : cue.who === 'driver' ? t('sp_driver') : cue.who === 'her' ? t('sp_her') : cue.who === 'kokila' ? t('sp_kokila') : null;
  const isBig = cue.who === 'big';
  const isNar = cue.who === 'nar';

  return (
    <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4" style={{ bottom: isBig ? '38%' : isNar ? '16%' : '9%' }} aria-live="polite">
      {cue.behind && <img src={ghostFace()} alt="" className="behind-face" key={`b-${cueKey}`} />}
      <p key={cueKey} className={`story-line ${isBig ? 'big' : isNar ? 'nar' : 'dialogue'} ${cue.direct ? 'direct' : ''}`}>
        {speaker && <span className={`speaker sp-${cue.who}`}>{speaker}</span>}
        <span className="words">{isBig || cue.direct || cue.who === 'driver' || cue.who === 'her' ? <RevealText key={text} text={text} ms={isBig ? 1300 : 650} /> : text}</span>
      </p>
    </div>
  );
}
