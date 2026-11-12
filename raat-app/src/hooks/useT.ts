'use client';
import { useCallback, useMemo } from 'react';
import { translate, type Key } from '@/data/translations';
import { useStore } from '@/lib/store';
import { deviceKey, localTime } from '@/lib/visitor';

/** Translator bound to the visitor's language, name and gender. */
export function useT() {
  const lang = useStore((s) => s.lang);
  const rawName = useStore((s) => s.name);
  const gender = useStore((s) => s.gender);
  const batt = useStore((s) => s.batt);
  const name = useMemo(() => rawName.trim() || translate(lang, 'default_name', { name: '', gender }), [rawName, lang, gender]);
  const device = useMemo(() => translate(lang, deviceKey(), { name, gender }), [lang, name, gender]);
  return useCallback((k: Key) => translate(lang, k, { name, gender, time: localTime(), device, batt }), [lang, name, gender, device, batt]);
}
