'use client';
import { useEffect, useRef } from 'react';
import { useT } from '@/hooks/useT';
import { live, useStore } from '@/lib/store';
import { anchors } from '@/lib/animation/stageState';
import { SCENES } from '@/data/stories/last-passenger';

/** {N}'s real name, written on the doll in something dark and red. Real text (any script), pinned to the photograph. */
export function DollName() {
  const t = useT();
  const name = useStore((s) => s.name);
  const part = useStore((s) => s.part);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (part !== 2) return;
    let raf = 0;
    const loop = () => {
      const el = ref.current, a = anchors.name;
      if (el) {
        const on = SCENES[live.sceneIndex]?.id === 'p2house' && a.amt > .01;
        el.style.opacity = on ? String(a.amt * .92) : '0';
        if (on) { el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%) rotate(${a.rot}deg)`; el.style.fontSize = `${Math.max(14, a.px)}px`; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [part]);
  if (part !== 2) return null;
  return <div ref={ref} className="doll-name" aria-hidden>{name.trim() || t('default_name')}</div>;
}

/** The fuel gauge, close: the needle on E. */
export function FuelGauge() {
  const part = useStore((s) => s.part);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (part !== 2) return;
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        const on = SCENES[live.sceneIndex]?.id === 'p2pump', l = live.local;
        const k = on ? Math.min(1, Math.max(0, (l - .7) / .03)) * (1 - Math.min(1, Math.max(0, (l - .86) / .03))) : 0;
        el.style.opacity = String(k); el.style.visibility = k > 0 ? 'visible' : 'hidden';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [part]);
  if (part !== 2) return null;
  return (
    <div ref={ref} className="fuel-gauge" aria-hidden>
      <svg viewBox="0 0 200 130" width="100%" height="100%">
        <defs><radialGradient id="fg" cx="50%" cy="85%" r="80%"><stop offset="0" stopColor="#1d1f22" /><stop offset="1" stopColor="#060607" /></radialGradient></defs>
        <rect x="0" y="0" width="200" height="130" rx="14" fill="url(#fg)" />
        <path d="M30 110 A72 72 0 0 1 170 110" fill="none" stroke="#5c5a55" strokeWidth="3" />
        {[0, 1, 2, 3, 4].map((i) => { const a = Math.PI * (1 - i / 4), x1 = 100 + Math.cos(a) * 70, y1 = 110 - Math.sin(a) * 70, x2 = 100 + Math.cos(a) * 60, y2 = 110 - Math.sin(a) * 60; return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i === 0 ? '#b3262f' : '#8a867c'} strokeWidth="3" />; })}
        <text x="24" y="104" fill="#b3262f" fontSize="16" fontFamily="sans-serif">E</text>
        <text x="166" y="104" fill="#8a867c" fontSize="16" fontFamily="sans-serif">F</text>
        <line className="fuel-needle" x1="100" y1="110" x2="34" y2="104" stroke="#e8e2d4" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="110" r="7" fill="#2a2a2a" />
        <circle className="fuel-warn" cx="100" cy="64" r="6" fill="#d8a23a" />
      </svg>
    </div>
  );
}
