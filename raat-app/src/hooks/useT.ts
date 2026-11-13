'use client';
import { useCallback, useMemo } from 'react';
import { translate, type Key } from '@/data/translations';
import { useStore } from '@/lib/store';
import { deviceKey } from '@/lib/visitor';
import { storyTime } from '@/lib/session';

/** Translator bound to the visitor's language, name and gender. */
export function useT() {
  const lang = useStore((s) => s.lang);
  const rawName = useStore((s) => s.name);
  const gender = useStore((s) => s.gender);
  const batt = useStore((s) => s.batt);
  const sessionStart = useStore((s) => s.sessionStart);
  const name = useMemo(() => rawName.trim() || translate(lang, 'default_name', { name: '', gender }), [rawName, lang, gender]);
  const device = useMemo(() => translate(lang, deviceKey(), { name, gender }), [lang, name, gender]);
  // {START}: the moment they boarded; {TIME}: the live clock, formatted the same way
  return useCallback((k: Key) => translate(lang, k, { name, gender, time: storyTime('now', lang), start: storyTime('start', lang), device, batt }), [lang, name, gender, device, batt, sessionStart]);
}
