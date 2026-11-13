import { en, type Dict, type Key } from './en';
import { hi } from './hi';
import { gu } from './gu';

export type Lang = 'en' | 'hi' | 'gu';
/** grammatical gender of the visitor: masculine, feminine, or neutral (respectful plural in Hindi/Gujarati, 'they' in English) */
export type Gender = 'm' | 'f' | 'n';
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
  start?: string;
}

/** Look up a line, pick the [male|female] form and fill the visitor tokens. */
export function translate(lang: Lang, key: Key, v: Vars): string {
  const raw = DICTS[lang][key] ?? en[key];
  return raw
    // [masculine|feminine|neutral]; a line with two forms uses the masculine one for neutral
    .replace(/\[([^\]|]*)\|([^\]|]*)(?:\|([^\]]*))?\]/g, (_, m: string, f: string, n?: string) => (v.gender === 'f' ? f : v.gender === 'n' ? (n ?? m) : m))
    .replace(/\{N\}/g, v.name)
    .replace(/\{TIME\}/g, v.time ?? '')
    .replace(/\{START\}/g, v.start ?? v.time ?? '')
    .replace(/\{DEVICE\}/g, v.device ?? '')
    .replace(/\{BATT\}/g, v.batt == null ? '' : String(v.batt));
}
