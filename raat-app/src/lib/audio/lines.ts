// Which lines are spoken aloud, by whom, and how. Shared by the voice route (server) and the story (browser).
import type { Key } from '@/data/translations/en';

export type Who = 'kokila' | 'ramesh';
export type Style = 'normal' | 'whisper' | 'close' | 'phone';


/** every line a character says aloud, who says it and how */
export const VOICED: Partial<Record<Key, { who: Who; style: Style }>> = {
  b3: { who: 'ramesh', style: 'normal' }, b5: { who: 'ramesh', style: 'normal' }, b7: { who: 'ramesh', style: 'normal' },
  d4: { who: 'ramesh', style: 'normal' }, d7: { who: 'ramesh', style: 'normal' }, fw_watch: { who: 'ramesh', style: 'normal' }, r4: { who: 'ramesh', style: 'normal' },
  i_name: { who: 'kokila', style: 'whisper' }, i7: { who: 'kokila', style: 'whisper' }, i10: { who: 'kokila', style: 'whisper' },
  r6: { who: 'kokila', style: 'whisper' }, r8: { who: 'kokila', style: 'close' },
  call_line1: { who: 'kokila', style: 'phone' }, call_line2: { who: 'kokila', style: 'phone' },
  call_scare: { who: 'kokila', style: 'close' }, // the last line, "We'll meet again", is text only: no audio
};

/** keep letters, combining marks (Devanagari/Gujarati vowel signs), spaces, dots, apostrophes, hyphens; 32 chars max */
export function cleanName(raw: string | null): string {
  return (raw ?? '').normalize('NFC').replace(/[^\p{L}\p{M}\s.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 32);
}

