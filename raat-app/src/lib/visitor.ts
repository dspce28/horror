import type { Key } from '@/data/translations';

/** Things the ghost "knows" about the person behind the screen. All read locally; nothing leaves the device. */
export function deviceKey(): Key {
  if (typeof navigator === 'undefined') return 'dev_generic';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'dev_iphone';
  if (/Android/i.test(ua)) return 'dev_android';
  if (/Macintosh/i.test(ua)) return navigator.maxTouchPoints > 1 ? 'dev_generic' : 'dev_mac';
  if (/Windows|Linux|CrOS/i.test(ua)) return 'dev_pc';
  return 'dev_generic';
}

export function localTime(): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
  } catch {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

interface BatteryLike { level: number }
export async function batteryLevel(): Promise<number | null> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    if (!nav.getBattery) return null;
    const b = await nav.getBattery();
    return Math.round(b.level * 100);
  } catch {
    return null;
  }
}
