'use client';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/hooks/useT';

/** Shared frame for the mini-games: title card, the game itself, and the result card. Always escapable. */
export function GameShell({ title, onExit, children, label }: { title: string; onExit: () => void; children: ReactNode; label: string }) {
  const t = useT();
  return (
    <section className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      {children}
      <h2 className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 font-display text-lg uppercase tracking-[.3em] text-bone/80 sm:text-2xl">{title}</h2>
      <button type="button" onClick={onExit} className="hud-btn absolute right-4 top-3 z-10" aria-label={t('back_story')}><X size={16} /></button>
    </section>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="game-card w-full max-w-md text-center">{children}</div>
    </div>
  );
}
