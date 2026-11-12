'use client';
import * as THREE from 'three';

// Procedural textures for the highway. Generated once in the browser; nothing to download.
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! }; }
function tex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** wet asphalt: dark, fine grain, cracks, darker puddles that read as reflective */
export function asphalt(): THREE.Texture {
  seed = 11; const { c, g } = canvas(512, 512);
  g.fillStyle = '#2a2b2d'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 30000; i++) { const v = 26 + rnd() * 34; g.fillStyle = `rgb(${v},${v + 1},${v + 3})`; g.fillRect(rnd() * 512, rnd() * 512, 1.4, 1.4); }
  for (let i = 0; i < 26; i++) { const x = rnd() * 512, y = rnd() * 512, r = 20 + rnd() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(8,10,14,.55)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); }
  g.strokeStyle = 'rgba(0,0,0,.45)';
  for (let i = 0; i < 14; i++) { g.lineWidth = .8 + rnd() * 1.6; g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (rnd() - .5) * 50; y += rnd() * 40; g.lineTo(x, y); } g.stroke(); }
  return tex(c, [2, 90]);
}

/** a roughness map: puddles are glossy, the rest is rough */
export function puddles(): THREE.Texture {
  seed = 23; const { c, g } = canvas(256, 256);
  g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { const x = rnd() * 256, y = rnd() * 256, r = 10 + rnd() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,150,150,.8)'); gr.addColorStop(1, 'rgba(150,150,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  return tex(c, [3, 120]);
}

export function dirt(): THREE.Texture {
  seed = 31; const { c, g } = canvas(256, 256);
  g.fillStyle = '#17150f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 18 + rnd() * 26; g.fillStyle = `rgba(${v + 6},${v + 3},${v - 4},.9)`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(28,34,20,${.4 + rnd() * .4})`; g.fillRect(rnd() * 256, rnd() * 256, 1, 4 + rnd() * 10); }
  return tex(c, [20, 160]);
}

/** a dark tree silhouette with alpha (babool / neem shapes) */
export function tree(kind: number): THREE.Texture {
  seed = 41 + kind * 97; const { c, g } = canvas(512, 512);
  g.strokeStyle = '#050605'; g.lineCap = 'round';
  const branch = (x: number, y: number, a: number, len: number, w: number, d: number) => {
    if (d > 6 || len < 6) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    const n = 2 + (rnd() > .6 ? 1 : 0);
    for (let i = 0; i < n; i++) branch(x2, y2, a + (rnd() - .5) * 1.25, len * (.64 + rnd() * .18), w * .66, d + 1);
    if (d >= 2) { g.fillStyle = 'rgba(6,8,6,.95)'; for (let k = 0; k < 10; k++) { g.beginPath(); g.ellipse(x2 + (rnd() - .5) * 46, y2 + (rnd() - .5) * 30, 12 + rnd() * 22, 7 + rnd() * 12, rnd() * 3, 0, Math.PI * 2); g.fill(); } }
  };
  branch(256, 512, -Math.PI / 2 + (rnd() - .5) * .2, 108, 18, 0);
  return tex(c);
}

/** soft round glow */
export function glow(rgb = '255,200,140'): THREE.Texture {
  const { c, g } = canvas(128, 128);
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(.15, `rgba(${rgb},.5)`); r.addColorStop(.45, `rgba(${rgb},.09)`); r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return tex(c);
}

/** a long, soft vertical streak: a light's reflection on wet road */
export function streak(rgb = '255,190,120'): THREE.Texture {
  const { c, g } = canvas(64, 256);
  const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, `rgba(${rgb},0)`); v.addColorStop(.25, `rgba(${rgb},.8)`); v.addColorStop(.55, `rgba(${rgb},.35)`); v.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = v; g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = 'destination-in';
  const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h; g.fillRect(0, 0, 64, 256);
  return tex(c);
}

/** wispy fog sheet */
export function fogSheet(): THREE.Texture {
  seed = 77; const { c, g } = canvas(512, 256);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 512, y = 60 + rnd() * 140, r = 30 + rnd() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  }
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t;
}
