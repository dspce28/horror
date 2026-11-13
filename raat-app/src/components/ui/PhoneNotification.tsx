'use client';
import { storyHour } from '@/lib/session';
import { useEffect, useMemo, useState } from 'react';
import { SCENES } from '@/data/stories/last-passenger';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useT';
import type { Key } from '@/data/translations';

/** Messages that land on the visitor's own screen, as if from an unknown number. */
export default function PhoneNotification() {
  const t = useT();
  const cueKey = useStore((s) => s.cueKey);
  const notice = useStore((s) => s.notice);
  const game = useStore((s) => s.game);
  const [shown, setShown] = useState<{ id: string; k: Key; from: string } | null>(null);

  const cue = useMemo(() => {
    const [sid, k] = cueKey.split(':');
    const c = SCENES.find((s) => s.id === sid)?.cues.find((x) => x.k === k);
    return c && c.who === 'phone' ? c : null;
  }, [cueKey]);

  useEffect(() => { if (cue) { const h = storyHour(); const k: Key = cue.k === 'fw_time' && h >= 5 && h < 21 ? 'fw_time_day' : cue.k; setShown({ id: cueKey, k, from: t('sp_unknown') }); } }, [cue, cueKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (notice) setShown({ id: `n${notice.id}`, k: notice.k as Key, from: notice.from === 'kokila' ? t('call_name') : t('sp_unknown') }); }, [notice]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => setShown(null), 4200);
    return () => window.clearTimeout(id);
  }, [shown]);

  if (!shown || game) return null;
  return (
    <div className="phone-note" role="status" key={shown.id}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-ash/70">
        <span className="inline-block h-2 w-2 rounded-full bg-blood" aria-hidden /> {shown.from} <span className="ml-auto normal-case tracking-normal">{t('note_now')}</span>
      </div>
      <p className="mt-1 text-[15px] font-semibold text-bone">{t(shown.k)}</p>
    </div>
  );
}
