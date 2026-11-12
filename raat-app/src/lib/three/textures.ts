'use client';
import * as THREE from 'three';

// Procedural stand-ins. Every one of these can be replaced by a real image through src/lib/assets.ts.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
}
function tex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function asphalt() {
  const { c, g } = canvas(512, 1024);
  g.fillStyle = '#1b1a19'; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 26000; i++) { const v = 20 + rnd() * 30; g.fillStyle = `rgb(${v},${v - 1},${v - 3})`; g.fillRect(rnd() * 512, rnd() * 1024, 1.5, 1.5); }
  for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1 + rnd() * 2; g.beginPath(); let x = rnd() * 512, y = rnd() * 1024; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 60; y += rnd() * 50; g.lineTo(x, y); } g.stroke(); }
  // worn centre dashes and edge lines
  g.fillStyle = 'rgba(205,195,170,.55)';
  for (let y = 0; y < 1024; y += 256) g.fillRect(250, y + 30, 12, 130);
  g.fillStyle = 'rgba(205,195,170,.35)'; g.fillRect(14, 0, 8, 1024); g.fillRect(490, 0, 8, 1024);
  return tex(c, [1, 40]);
}

export function dirt() {
  const { c, g } = canvas(256, 256);
  g.fillStyle = '#211c16'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 25 + rnd() * 35; g.fillStyle = `rgba(${v + 8},${v},${v - 8},.8)`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(40,45,25,${.3 + rnd() * .4})`; g.fillRect(rnd() * 256, rnd() * 256, 1, 4 + rnd() * 8); }
  return tex(c, [8, 120]);
}

/** a babool / neem silhouette with alpha */
export function tree(kind: number) {
  const { c, g } = canvas(512, 512);
  seed = 31 + kind * 101;
  g.strokeStyle = '#0b0a08'; g.lineCap = 'round';
  const branch = (x: number, y: number, a: number, len: number, w: number, d: number) => {
    if (d > 6 || len < 6) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    const n = 2 + (rnd() > .6 ? 1 : 0);
    for (let i = 0; i < n; i++) branch(x2, y2, a + (rnd() - .5) * 1.3, len * (.62 + rnd() * .2), w * .66, d + 1);
    if (d >= 3) { g.fillStyle = 'rgba(12,13,10,.92)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(x2 + (rnd() - .5) * 40, y2 + (rnd() - .5) * 26, 10 + rnd() * 18, 6 + rnd() * 10, rnd() * 3, 0, Math.PI * 2); g.fill(); } }
  };
  branch(256, 512, -Math.PI / 2 + (rnd() - .5) * .2, 150, 22, 0);
  return tex(c);
}

export function glow(color = '255,190,120') {
  const { c, g } = canvas(128, 128);
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, `rgba(${color},1)`); r.addColorStop(.2, `rgba(${color},.45)`); r.addColorStop(.55, `rgba(${color},.08)`); r.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return tex(c);
}

export function fogPuff() {
  const { c, g } = canvas(256, 256);
  for (let i = 0; i < 40; i++) {
    const x = 128 + (rnd() - .5) * 120, y = 128 + (rnd() - .5) * 60, r = 30 + rnd() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  return tex(c);
}

export function labelTexture(text: string, opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string } = {}) {
  const { w = 512, h = 96, bg = '#140d05', fg = '#ffb347', font = 'bold 64px "Noto Sans Gujarati", "Noto Sans Devanagari", sans-serif' } = opts;
  const { c, g } = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
  return tex(c);
}

export function rexine() {
  const { c, g } = canvas(128, 128);
  g.fillStyle = '#5c1414'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .25})`; g.fillRect(rnd() * 128, rnd() * 128, 2, 2); }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; for (let x = 16; x < 128; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  g.fillStyle = 'rgba(255,220,200,.06)'; g.fillRect(0, 0, 128, 10);
  return tex(c);
}

export function grime(base: string, amount = .35) {
  const { c, g } = canvas(256, 256);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { const x = rnd() * 256, y = rnd() * 256, r = 10 + rnd() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(30,20,10,${amount * rnd()})`); gr.addColorStop(1, 'rgba(30,20,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,12,6,${amount * .6})`; g.fillRect(rnd() * 256, rnd() * 256, 1, 20 + rnd() * 60); }
  return tex(c, [2, 2]);
}

/* ---------- character stand-ins ---------- */

/** ghost body without head: white sari, hair falling over the shoulders */
export function ghostBody() {
  const { c, g } = canvas(512, 1024);
  seed = 909;
  // sari
  const s = g.createLinearGradient(0, 0, 512, 0); s.addColorStop(0, '#9c958a'); s.addColorStop(.35, '#ddd6c8'); s.addColorStop(.6, '#cfc7b8'); s.addColorStop(1, '#8a847a');
  g.fillStyle = s;
  g.beginPath(); g.moveTo(170, 60); g.quadraticCurveTo(256, 30, 342, 60); g.lineTo(372, 380); g.quadraticCurveTo(400, 700, 420, 1010); g.lineTo(92, 1010); g.quadraticCurveTo(112, 700, 140, 380); g.closePath(); g.fill();
  // folds and dirt
  for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(60,55,48,${.15 + rnd() * .2})`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); const x = 150 + rnd() * 210; g.moveTo(x, 300 + rnd() * 200); g.quadraticCurveTo(x + (rnd() - .5) * 60, 700, x + (rnd() - .5) * 90, 1010); g.stroke(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(70,50,30,${rnd() * .18})`; g.beginPath(); g.ellipse(120 + rnd() * 280, 600 + rnd() * 400, 6 + rnd() * 30, 4 + rnd() * 16, 0, 0, Math.PI * 2); g.fill(); }
  // pallu across the chest
  g.fillStyle = 'rgba(230,224,212,.85)'; g.beginPath(); g.moveTo(170, 70); g.lineTo(342, 300); g.lineTo(330, 360); g.lineTo(160, 140); g.closePath(); g.fill();
  // arms
  g.fillStyle = '#b9b2a6';
  g.beginPath(); g.moveTo(150, 90); g.quadraticCurveTo(110, 300, 128, 520); g.lineTo(150, 520); g.quadraticCurveTo(150, 300, 176, 110); g.fill();
  g.beginPath(); g.moveTo(362, 90); g.quadraticCurveTo(402, 300, 384, 520); g.lineTo(362, 520); g.quadraticCurveTo(362, 300, 336, 110); g.fill();
  // fingers
  g.strokeStyle = '#a49c90'; g.lineWidth = 4; for (const x of [130, 138, 146, 368, 376, 384]) { g.beginPath(); g.moveTo(x, 515); g.lineTo(x + (x > 256 ? 2 : -2), 570); g.stroke(); }
  // hair down the back and shoulders
  for (let i = 0; i < 420; i++) {
    const side = rnd() > .5 ? 1 : -1, x0 = 256 + side * (20 + rnd() * 70);
    g.strokeStyle = `rgba(5,5,6,${.45 + rnd() * .5})`; g.lineWidth = 1 + rnd() * 2.5; g.beginPath(); g.moveTo(x0, 0);
    g.bezierCurveTo(x0 + side * rnd() * 40, 120, x0 + side * rnd() * 30, 260, x0 + (rnd() - .5) * 50, 200 + rnd() * 260); g.stroke();
  }
  return tex(c);
}

/** head with hair hanging over the face; eyes faintly visible when `look` is true */
export function ghostHead(look: boolean) {
  const { c, g } = canvas(512, 768);
  seed = look ? 77 : 55;
  // face underneath
  g.fillStyle = '#b8b2a8'; g.beginPath(); g.ellipse(256, 230, 92, 122, 0, 0, Math.PI * 2); g.fill();
  if (look) {
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(222, 222, 20, 13, -.1, 0, Math.PI * 2); g.ellipse(292, 222, 20, 13, .1, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(232, 300, 50, 6);
  }
  // hair
  const part = look ? 70 : 6;
  for (let i = 0; i < 900; i++) {
    const t = rnd(), x0 = 256 + (t - .5) * 220, side = x0 < 256 ? -1 : 1;
    const xt = x0 + side * part * (1 - Math.abs(x0 - 256) / 110);
    g.strokeStyle = `rgba(4,4,5,${.55 + rnd() * .45})`; g.lineWidth = 1 + rnd() * 2.6; g.beginPath(); g.moveTo(256 + (t - .5) * 140, 90);
    g.bezierCurveTo(x0, 160, xt, 380, xt + (rnd() - .5) * 60, 500 + rnd() * 260); g.stroke();
  }
  g.fillStyle = '#060607'; g.beginPath(); g.ellipse(256, 120, 120, 70, 0, Math.PI, Math.PI * 2); g.fill();
  return tex(c);
}

/** the jump-scare face (also used behind lines of text) */
export function ghostFaceDataUrl(): string {
  const { c, g } = canvas(512, 640);
  seed = 13;
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 640);
  const f = g.createRadialGradient(256, 300, 30, 256, 300, 240); f.addColorStop(0, '#cfc9bd'); f.addColorStop(.6, '#8f897f'); f.addColorStop(1, '#000');
  g.fillStyle = f; g.beginPath(); g.ellipse(256, 310, 170, 230, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(190, 280, 42, 30, -.15, 0, Math.PI * 2); g.ellipse(322, 280, 42, 30, .15, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,.65)'; g.beginPath(); g.ellipse(256, 450, 46, 22, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(60,20,20,.5)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); const x = 150 + rnd() * 210; g.moveTo(x, 330); g.lineTo(x + (rnd() - .5) * 30, 360 + rnd() * 60); g.stroke(); }
  for (let i = 0; i < 900; i++) { const x0 = 256 + (rnd() - .5) * 340, side = x0 < 256 ? -1 : 1; g.strokeStyle = `rgba(0,0,0,${.5 + rnd() * .5})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(256 + (rnd() - .5) * 200, 40); g.bezierCurveTo(x0 + side * 60, 200, x0 + side * 120, 400, x0 + side * (100 + rnd() * 80), 640); g.stroke(); }
  return c.toDataURL('image/jpeg', .85);
}

/** driver seen from behind: cap, hair, khaki collar */
export function driverBack() {
  const { c, g } = canvas(512, 640);
  seed = 404;
  g.fillStyle = '#4a4130'; g.beginPath(); g.moveTo(60, 640); g.quadraticCurveTo(80, 420, 256, 400); g.quadraticCurveTo(432, 420, 452, 640); g.fill();
  g.fillStyle = '#5a4f3a'; g.fillRect(200, 380, 112, 60);
  g.fillStyle = '#2a1d14'; g.beginPath(); g.ellipse(256, 270, 105, 130, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7b6a55'; g.beginPath(); g.ellipse(256, 380, 70, 26, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${10 + rnd() * 30},${10 + rnd() * 20},10,.6)`; g.fillRect(170 + rnd() * 170, 160 + rnd() * 200, 2, 6); }
  g.fillStyle = '#3e3a30'; g.beginPath(); g.ellipse(256, 175, 112, 60, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(144, 170, 224, 18);
  return tex(c);
}

/** driver's face: pale, black eyes, ash at the mouth. `alive` gives the 1999 version for the flashback */
export function driverFace(alive = false) {
  const { c, g } = canvas(512, 640);
  seed = alive ? 222 : 303;
  g.fillStyle = alive ? '#5b4a36' : '#4a4130'; g.beginPath(); g.moveTo(60, 640); g.quadraticCurveTo(80, 440, 256, 420); g.quadraticCurveTo(432, 440, 452, 640); g.fill();
  const skin = alive ? '#9a6b4b' : '#a39d93';
  g.fillStyle = skin; g.beginPath(); g.ellipse(256, 280, 100, 132, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(256, 360, 90, 60, 0, 0, Math.PI); g.fill();
  if (alive) { g.fillStyle = '#1a1210'; g.beginPath(); g.ellipse(215, 258, 14, 8, 0, 0, Math.PI * 2); g.ellipse(297, 258, 14, 8, 0, 0, Math.PI * 2); g.fill(); }
  else { g.fillStyle = '#000'; g.beginPath(); g.ellipse(215, 258, 24, 16, -.1, 0, Math.PI * 2); g.ellipse(297, 258, 24, 16, .1, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#1b1612'; g.beginPath(); g.moveTo(196, 330); g.quadraticCurveTo(256, 312, 316, 330); g.quadraticCurveTo(256, 350, 196, 330); g.fill();
  if (!alive) { for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${60 + rnd() * 60},${60 + rnd() * 55},${55 + rnd() * 50},.55)`; g.beginPath(); g.arc(256 + (rnd() - .5) * 120, 360 + (rnd() - .5) * 40, 1 + rnd() * 3, 0, Math.PI * 2); g.fill(); } }
  g.fillStyle = '#3e3a30'; g.beginPath(); g.ellipse(256, 175, 112, 60, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(144, 170, 224, 18); g.fillRect(170, 180, 172, 14);
  return tex(c);
}

export function motorbike() {
  const { c, g } = canvas(512, 320);
  g.fillStyle = '#0d0d0e'; g.strokeStyle = '#141416'; g.lineWidth = 16;
  g.beginPath(); g.arc(110, 230, 70, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(400, 230, 70, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(110, 230); g.lineTo(200, 150); g.lineTo(330, 140); g.lineTo(400, 230); g.lineTo(300, 230); g.closePath(); g.fill();
  g.fillRect(190, 120, 120, 30); g.fillRect(330, 90, 14, 70); g.fillRect(320, 84, 60, 10);
  g.fillStyle = '#26221d'; g.fillRect(200, 112, 100, 14);
  return tex(c);
}

/** the 1999 photograph, front */
export function photoFront(): string {
  const { c, g } = canvas(900, 640);
  seed = 1999;
  const bg = g.createLinearGradient(0, 0, 0, 640); bg.addColorStop(0, '#7b6a52'); bg.addColorStop(1, '#3d3326'); g.fillStyle = bg; g.fillRect(0, 0, 900, 640);
  // bus side
  g.fillStyle = '#6e2c22'; g.fillRect(40, 220, 820, 300); g.fillStyle = '#c9b48f'; g.fillRect(40, 300, 820, 34);
  g.fillStyle = '#2b2620'; for (let x = 70; x < 840; x += 120) g.fillRect(x, 232, 96, 60);
  g.fillStyle = '#1a1612'; g.beginPath(); g.arc(170, 530, 54, 0, Math.PI * 2); g.arc(720, 530, 54, 0, Math.PI * 2); g.fill();
  // number plate
  g.fillStyle = '#e6d9b8'; g.fillRect(612, 452, 176, 40); g.fillStyle = '#1b1712'; g.font = 'bold 26px monospace'; g.fillText('GJ-1-Z-1313', 622, 481);
  // couple
  const person = (x: number, w: number, h: number, col: string, sari: boolean) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w, 600); g.quadraticCurveTo(x - w * .8, 600 - h * .7, x, 600 - h); g.quadraticCurveTo(x + w * .8, 600 - h * .7, x + w, 600); g.fill();
    g.fillStyle = '#8a6448'; g.beginPath(); g.ellipse(x, 600 - h - 30, 26, 34, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1310'; g.beginPath(); g.ellipse(x, 600 - h - 48, 28, 20, 0, Math.PI, Math.PI * 2); g.fill();
    if (sari) { g.fillStyle = 'rgba(160,30,30,.85)'; g.beginPath(); g.moveTo(x - w, 600); g.lineTo(x + w * .3, 600 - h); g.lineTo(x + w * .6, 600 - h + 30); g.lineTo(x - w * .4, 600); g.fill(); }
  };
  person(330, 70, 300, '#5a4b36', false);
  person(450, 66, 270, '#b9905a', true);
  // her bangle (clue)
  g.strokeStyle = '#e2c25a'; g.lineWidth = 6; g.beginPath(); g.ellipse(402, 470, 14, 6, 0, 0, Math.PI * 2); g.stroke();
  // garlands
  g.strokeStyle = '#d98e2a'; g.lineWidth = 10; g.setLineDash([8, 6]); g.beginPath(); g.arc(330, 340, 40, .2, Math.PI - .2); g.stroke(); g.beginPath(); g.arc(450, 370, 36, .2, Math.PI - .2); g.stroke(); g.setLineDash([]);
  // fade, scratches
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${200 + rnd() * 55},${180 + rnd() * 50},${130 + rnd() * 40},${rnd() * .06})`; g.fillRect(rnd() * 900, rnd() * 640, 2, 2); }
  for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(240,225,190,${rnd() * .25})`; g.lineWidth = 1; g.beginPath(); const x = rnd() * 900; g.moveTo(x, 0); g.lineTo(x + (rnd() - .5) * 40, 640); g.stroke(); }
  const v = g.createRadialGradient(450, 320, 200, 450, 320, 560); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,10,0,.75)'); g.fillStyle = v; g.fillRect(0, 0, 900, 640);
  g.fillStyle = 'rgba(255,170,60,.85)'; g.font = 'bold 22px monospace'; g.fillText("'99 5 12", 770, 610);
  return c.toDataURL('image/jpeg', .9);
}
