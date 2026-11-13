'use client';
import { useEffect, useRef } from 'react';
import { live, store, useStore } from '@/lib/store';
import { storyTime } from '@/lib/session';
import { useT } from '@/hooks/useT';
import { range } from '@/lib/animation/director';
import { SCENES } from '@/data/stories/last-passenger';

const W = 760, H = 400, S = 2; // ticket paper drawn at W×H, burn mask computed at 1/S resolution
// scroll progress at which each line of the ticket writes itself on: header, time line, five rows, the stamp
const LINE_AT = [.05, .1, .15, .2, .25, .3, .35, .46];
const smoothK = (k: number) => k * k * (3 - 2 * k);

/** The ticket floats in the dark; scrolling reveals the last line and then burns it from the edges. */
export default function TicketScene() {
  const t = useT();
  const scene = useStore((s) => s.sceneIndex);
  const name = useStore((s) => s.name);
  const lang = useStore((s) => s.lang);
  const ref = useRef<HTMLCanvasElement>(null);
  const lines = useRef<(HTMLElement | null)[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const active = SCENES[scene]?.id === 'ticket';

  useEffect(() => {
    if (!active) return;
    const c = ref.current!, g = c.getContext('2d')!;
    const paper = document.createElement('canvas'); paper.width = W; paper.height = H; const pg = paper.getContext('2d')!;
    const small = document.createElement('canvas'); small.width = W / S; small.height = H / S; const sg = small.getContext('2d', { willReadFrequently: true })!;
    c.width = W; c.height = H;
    let last = -1;
    const tex = new Image(); tex.onload = () => { last = -1; }; tex.src = '/raat/scenes/ticket.webp';
    // value noise for the burn front
    const nw = W / S, nh = H / S, field = new Float32Array(nw * nh);
    const grid = 9, gw = Math.ceil(nw / grid) + 2, gh = Math.ceil(nh / grid) + 2, rnd = Array.from({ length: gw * gh }, () => Math.random());
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const gx = x / grid, gy = y / grid, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const a = rnd[y0 * gw + x0], b = rnd[y0 * gw + x0 + 1], cc = rnd[(y0 + 1) * gw + x0], d = rnd[(y0 + 1) * gw + x0 + 1];
      const n = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
      const edge = Math.min(x / nw, 1 - x / nw, y / nh * .55, (1 - y / nh) * .55) * 2;
      field[y * nw + x] = n * .55 + edge * .9;
    }

    const drawPaper = () => {
      pg.clearRect(0, 0, W, H);
      if (tex.complete && tex.naturalWidth) {
        // the real aged ticket, cropped to its paper (it has a dark border in the photo)
        const sw = tex.naturalWidth, sh = tex.naturalHeight;
        pg.drawImage(tex, sw * .03, sh * .06, sw * .94, sh * .88, 0, 0, W, H);
        pg.fillStyle = 'rgba(235,215,175,.35)'; pg.fillRect(W * .25, H * .14, W * .55, H * .72);
      } else {
        const bg = pg.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#d9ccb0'); bg.addColorStop(1, '#bfae8c'); pg.fillStyle = bg; pg.fillRect(0, 0, W, H);
      }
    };

    let raf = 0;
    const loop = () => {
      const p = live.local;
      if (Math.abs(p - last) > .0005) {
        last = p;
        drawPaper();
        // the text is real HTML on the paper: each line writes itself on, left to right, as you scroll
        lines.current.forEach((el, i) => {
          if (!el) return;
          const at = LINE_AT[i] ?? .5, k = range(p, at, at + .06);
          el.style.opacity = String(Math.min(1, k * 1.6) * (1 - range(p, .72, .86)));
          el.style.clipPath = `inset(-20% ${((1 - k) * 100).toFixed(1)}% -20% 0)`;
          el.style.transform = i === LINE_AT.length - 1 ? `translate(-50%, -50%) rotate(-3deg) scale(${(1.25 - .25 * smoothK(k)).toFixed(3)})` : '';
        });
        const burn = range(p, .7, .97);
        sg.clearRect(0, 0, nw, nh); sg.drawImage(paper, 0, 0, nw, nh);
        if (burn > 0) {
          const img = sg.getImageData(0, 0, nw, nh), d = img.data, thr = burn * 1.25;
          for (let i = 0; i < nw * nh; i++) {
            const f = field[i] - thr;
            if (f < 0) d[i * 4 + 3] = 0;
            else if (f < .04) { d[i * 4] = 255; d[i * 4 + 1] = 120 + f * 2000; d[i * 4 + 2] = 30; }
            else if (f < .1) { const k = (f - .04) / .06; d[i * 4] *= k * .7; d[i * 4 + 1] *= k * .6; d[i * 4 + 2] *= k * .5; }
          }
          sg.putImageData(img, 0, 0);
        }
        g.clearRect(0, 0, W, H);
        if (burn > 0) { g.drawImage(small, 0, 0, W, H); } else g.drawImage(paper, 0, 0);
        if (wrap.current) {
          const inA = range(p, 0, .12), outA = 1 - range(p, .93, 1);
          wrap.current.style.opacity = String(inA * outA);
          wrap.current.style.transform = `translateY(${(1 - inA) * 40}px) rotateX(${8 + Math.sin(performance.now() / 1300) * 3}deg) rotateZ(${-3 + Math.sin(performance.now() / 1700) * 1.5}deg)`;
        }
      } else if (wrap.current) {
        wrap.current.style.transform = `rotateX(${8 + Math.sin(performance.now() / 1300) * 3}deg) rotateZ(${-3 + Math.sin(performance.now() / 1700) * 1.5}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  const passenger = (name.trim() || t('default_name')).toUpperCase();
  const rows: [string, string][] = [[t('tk_pass'), passenger], [t('tk_dest'), t('tk_dest_v')], [t('tk_status'), t('tk_status_v')], [t('tk_return'), t('tk_return_v')], [t('tk_fare'), t('tk_fare_v')]];
  const set = (i: number) => (el: HTMLElement | null) => { lines.current[i] = el; };
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-4" style={{ perspective: '1000px' }} aria-label={t('sc_ticket')} role="img">
      <div ref={wrap} className="ticket-wrap relative w-full max-w-[760px]">
        <canvas ref={ref} className="h-auto w-full drop-shadow-[0_30px_60px_rgba(0,0,0,.8)]" />
        <div className="ticket-text" lang={lang}>
          <p ref={set(0)} className="tk-head" style={{ left: '32.9%', top: '17%' }}>{t('tk_head')}</p>
          <p ref={set(1)} className="tk-sub" style={{ left: '32.9%', top: '24%' }}>{storyTime('start', lang)} · {t('tk_seat')} · No. 001313</p>
          {rows.map(([k, v], i) => (
            <p key={k} ref={set(2 + i)} className="tk-row" style={{ left: '32.9%', top: `${32 + i * 8.6}%` }}>
              <span className="tk-k">{k}</span><span className="tk-v">{v}</span>
            </p>
          ))}
          <p ref={set(7)} className="tk-stamp" style={{ left: '57%', top: '79%' }}>{t('tk_next')}</p>
        </div>
      </div>
    </div>
  );
}
