'use client';
import { useEffect, useMemo, useState } from 'react';
import { Share2, RotateCcw } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { live, store, useStore } from '@/lib/store';
import { audio } from '@/lib/audio/engine';
import { scroll } from '@/lib/scroll';
import { clearSession } from '@/lib/session';
import { ghostFace } from '@/components/fx/Overlays';
import type { Key } from '@/data/translations';

type Badge = { title: Key; desc: Key };
function badgeFor(): Badge {
  const s = store.get();
  if (s.results.hunt === 'win' && s.results.photo === 'win') return { title: 'ach_detective', desc: 'ach_detective_d' };
  if (s.callAccepted === true) return { title: 'ach_fool', desc: 'ach_fool_d' };
  if (s.results.hunt === 'lose' || (s.results.hunt !== 'win' && s.results.photo !== 'win')) return { title: 'ach_magnet', desc: 'ach_magnet_d' };
  return { title: 'ach_survivor', desc: 'ach_survivor_d' };
}

export default function EndingCard() {
  const t = useT();
  const finished = useStore((s) => s.finished);
  const name = useStore((s) => s.name);
  const [msg, setMsg] = useState('');
  // worked out when the story finishes, from the results at that moment
  const b = useMemo<Badge>(() => badgeFor(), [finished]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (finished) audio.chime(); }, [finished]);
  if (!finished) return null;

  const share = async () => {
    const blob = await resultImage(t('survived'), t(b.title), t(b.desc), name.trim() || t('default_name'), t('ep'));
    const url = window.location.origin + window.location.pathname;
    const file = blob ? new File([blob], 'raat-last-passenger.png', { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: t('share_text'), url }); return; }
      if (navigator.share) { await navigator.share({ text: t('share_text'), url }); return; }
    } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(`${t('share_text')} ${url}`); setMsg(t('share_copied')); } catch { /* no clipboard */ }
    if (blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'raat-last-passenger.png'; a.click(); setMsg((m) => (m ? `${m} · ${t('share_saved')}` : t('share_saved'))); }
  };
  const again = () => {
    store.set({ results: {}, callAccepted: null, callOpen: false, finished: false, game: null, call: 'IDLE', declines: 0 });
    clearSession(); live.lookBacks = 0;
    scroll.toProgress(0);
  };

  return (
    <section className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#09090B]/95 px-4 py-16" aria-labelledby="end-title">
      <div className="end-card w-full max-w-md text-center">
        <p className="font-display text-5xl tracking-[.4em] text-bone">RAAT</p>
        <p className="mt-1 text-[11px] uppercase tracking-[.3em] text-ash/70">{t('ep')}</p>
        <h2 id="end-title" className="mt-10 font-display text-3xl text-bone sm:text-4xl">{t('survived')}</h2>
        <div className="mx-auto mt-8 max-w-sm border border-ash/15 bg-[#171619] p-6">
          <p className="text-[11px] uppercase tracking-[.3em] text-ash/70">{t('ach_title')}</p>
          <p className="mt-2 font-display text-3xl text-[#b3262f]">{t(b.title)}</p>
          <p className="mt-2 text-sm text-ash">{t(b.desc)}</p>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={share} className="enter-btn flex items-center gap-2"><Share2 size={15} />{t('share')}</button>
          <button type="button" onClick={again} className="ghost-btn flex items-center gap-2"><RotateCcw size={15} />{t('again')}</button>
        </div>
        {msg && <p className="mt-3 text-xs text-ash" role="status">{msg}</p>}
        <p className="mt-10 text-xs text-ash/60">{t('next_ep')}</p>
      </div>
    </section>
  );
}

async function resultImage(title: string, badge: string, desc: string, name: string, ep: string): Promise<Blob | null> {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = '#09090B'; g.fillRect(0, 0, 1080, 1350);
  const face = new Image(); face.src = ghostFace();
  await new Promise<void>((r) => { face.onload = () => r(); face.onerror = () => r(); });
  g.globalAlpha = .18; g.drawImage(face, 140, 220, 800, 1000); g.globalAlpha = 1;
  const v = g.createRadialGradient(540, 675, 200, 540, 675, 800); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.9)'); g.fillStyle = v; g.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(212,200,181,${Math.random() * .05})`; g.fillRect(Math.random() * 1080, Math.random() * 1350, 2, 2); }
  g.textAlign = 'center'; g.fillStyle = '#D4C8B5';
  g.font = '600 120px "Cormorant Garamond", serif'; g.fillText('R A A T', 540, 220);
  g.font = '28px Inter, sans-serif'; g.fillStyle = '#B6A99A'; g.fillText(ep.toUpperCase(), 540, 280);
  g.font = '600 64px "Cormorant Garamond", "Noto Sans Devanagari", "Noto Sans Gujarati", serif'; g.fillStyle = '#D4C8B5';
  wrap(g, title, 540, 620, 900, 76);
  g.font = '36px Inter, "Noto Sans Devanagari", "Noto Sans Gujarati", sans-serif'; g.fillStyle = '#B6A99A'; g.fillText(name, 540, 820);
  g.font = '700 72px "Cormorant Garamond", "Noto Sans Devanagari", "Noto Sans Gujarati", serif'; g.fillStyle = '#b3262f'; g.fillText(badge, 540, 940);
  g.font = '32px Inter, "Noto Sans Devanagari", "Noto Sans Gujarati", sans-serif'; g.fillStyle = '#B6A99A'; wrap(g, desc, 540, 1010, 860, 44);
  g.font = '26px Inter, sans-serif'; g.fillStyle = '#6f665c'; g.fillText(window.location.host, 540, 1290);
  return new Promise((r) => c.toBlob((b) => r(b), 'image/png'));
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' '); let line = ''; let yy = y;
  words.forEach((w) => { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = test; });
  if (line) g.fillText(line, x, yy);
}
