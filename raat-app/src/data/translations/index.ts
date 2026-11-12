import { en, type Dict, type Key } from './en';
import { hi } from './hi';
import { gu } from './gu';

export type Lang = 'en' | 'hi' | 'gu';
export type Gender = 'm' | 'f';
export type { Key };

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'hi', label: 'हिन्दी', short: 'हि' },
  { id: 'gu', label: 'ગુજરાતી', short: 'ગુ' },
];

const DICTS: Record<Lang, Dict> = { en, hi, gu };

export interface Vars {
  name: string;
  gender: Gender;
  time?: string;
  device?: string;
  batt?: number | null;
}

/** Look up a line, pick the [male|female] form and fill the visitor tokens. */
export function translate(lang: Lang, key: Key, v: Vars): string {
  const raw = DICTS[lang][key] ?? en[key];
  return raw
    .replace(/\[([^\]|]*)\|([^\]]*)\]/g, (_, m: string, f: string) => (v.gender === 'f' ? f : m))
    .replace(/\{N\}/g, v.name)
    .replace(/\{TIME\}/g, v.time ?? '')
    .replace(/\{DEVICE\}/g, v.device ?? '')
    .replace(/\{BATT\}/g, v.batt == null ? '' : String(v.batt));
}
