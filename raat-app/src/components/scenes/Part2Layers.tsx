'use client';
// Part 2 layers on the photographs: Kokila standing in the scene, the eleven figures in the banyan, the diya,
// the circle of water, the haveli door opening by itself and concrete falling. All placed in image space on the
// 16 × 9 photo plane, a little in front of it, so the camera's movement gives them real parallax.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { glowTexture, texture } from '@/lib/three/textures';
import { stage } from '@/lib/animation/stageState';
import { store } from '@/lib/store';

const PW = 16, PH = 9, DS = 1.5;
const at = (x: number, y: number, z = DS * .4): [number, number, number] => [(x - .5) * PW, (.5 - y) * PH, z];

/* ---------- Kokila in the photograph ---------- */
const FIG_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform float uAmt; uniform float uFar; uniform float uTime; uniform vec3 uFog;
varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  // her hair and the hem of her saree move a little; nothing else does
  float top = smoothstep(.62, 1., uv.y), hem = 1. - smoothstep(0., .28, uv.y);
  uv.x += sin(uTime * 1.3 + uv.y * 7.) * .006 * top + sin(uTime * 1.9 + uv.y * 11.) * .004 * hem;
  vec4 c = texture2D(uMap, uv);
  // night: cooler, darker; far away she is mostly fog
  vec3 col = c.rgb * vec3(.78, .82, .9);
  col = mix(col, uFog, uFar * .6);
  float a = c.a * uAmt * (1. - uFar * .25);
  if (a < .02) discard;
  gl_FragColor = vec4(col, a);
}`;
const FIG_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';

function Figure() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: FIG_VERT, fragmentShader: FIG_FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uMap: { value: null }, uAmt: { value: 0 }, uFar: { value: 0 }, uTime: { value: 0 }, uFog: { value: new THREE.Color('#2a3038') } } }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    const o = stage.out, m = ref.current; if (!o || !m) return;
    const f = o.frame.fig;
    const tx = f ? texture(f.url) : null;
    m.visible = !!f && !!tx && f.amt > .01;
    if (!f || !tx || !m.visible) return;
    if (mat.uniforms.uMap.value !== tx) mat.uniforms.uMap.value = tx;
    const img = tx.image as HTMLImageElement, aspect = img?.naturalWidth ? img.naturalWidth / img.naturalHeight : .33;
    const h = f.h * PH, w = h * aspect;
    const [x, y] = at(f.x, f.y);
    // nearer = further out of the photograph, towards the lens
    m.position.set(x, y + h / 2, DS * (.25 + (1 - f.far) * .55));
    m.scale.set(w, h, 1);
    const tt = state.clock.elapsedTime;
    mat.uniforms.uTime.value = Math.floor(tt * 4) / 4; // she moves on a stepped clock, as in Part 1
    mat.uniforms.uAmt.value = f.amt * Math.min(1, o.light + .25);
    mat.uniforms.uFar.value = f.far;
  });
  return <mesh ref={ref} material={mat} renderOrder={3}><planeGeometry args={[1, 1]} /></mesh>;
}

/* ---------- eleven figures in the banyan ---------- */
/** a hanging figure, drawn as a soft silhouette (no detail, no injury): head bowed, arms down, feet pointing down */
function silhouette(v: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 384; const g = c.getContext('2d')!;
  // mist lit from somewhere behind it, so the shape reads against the leaves
  const halo = g.createRadialGradient(64, 220, 8, 64, 220, 150);
  halo.addColorStop(0, 'rgba(170,184,200,.5)'); halo.addColorStop(.55, 'rgba(140,152,168,.2)'); halo.addColorStop(1, 'rgba(110,120,135,0)');
  g.fillStyle = halo; g.fillRect(0, 0, 128, 384);
  const w = 1 + (v - 1) * .12, lean = (v - 1) * 3;
  g.fillStyle = '#060607'; g.strokeStyle = 'rgba(8,8,9,.9)';
  g.lineWidth = 1.6; g.beginPath(); g.moveTo(64, 0); g.lineTo(64 + lean * .3, 90); g.stroke();                       // rope
  g.save(); g.translate(64 + lean * .4, 104); g.rotate(.18 + lean * .02);
  g.beginPath(); g.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2); g.fill(); g.restore();                                    // head, bowed
  if (v === 2) { g.beginPath(); g.moveTo(54, 100); g.bezierCurveTo(46, 150, 50, 190, 56, 214); g.lineTo(72, 214); g.bezierCurveTo(78, 180, 80, 140, 74, 98); g.fill(); } // long hair
  g.beginPath();                                                                                                        // shoulders, body, a long garment
  g.moveTo(58, 117); g.bezierCurveTo(44 * w, 122, 40 * w, 128, 41 * w, 140);
  g.bezierCurveTo(43, 185, 45, 230, 42 - (v === 2 ? 6 : 0), 286);
  g.lineTo(86 + (v === 2 ? 6 : 0), 286); g.bezierCurveTo(83, 230, 85, 185, 87 + (w - 1) * 40, 140);
  g.bezierCurveTo(88, 128, 84, 122, 70, 117); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(41, 138); g.bezierCurveTo(37, 180, 37, 214, 40, 238); g.lineTo(46, 238); g.bezierCurveTo(46, 210, 47, 176, 49, 146); g.fill(); // arms
  g.beginPath(); g.moveTo(87, 138); g.bezierCurveTo(91, 180, 91, 214, 88, 238); g.lineTo(82, 238); g.bezierCurveTo(82, 210, 81, 176, 79, 146); g.fill();
  g.beginPath(); g.moveTo(54, 284); g.lineTo(60, 284); g.lineTo(60, 344); g.bezierCurveTo(60, 356, 56, 362, 55, 352); g.closePath(); g.fill();          // feet, pointing down
  g.beginPath(); g.moveTo(68, 284); g.lineTo(74, 284); g.lineTo(73, 350); g.bezierCurveTo(72, 360, 68, 360, 68, 348); g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
}
// rope top (x, y) and length (fraction of image height); counted left to right
const HANG: [number, number, number][] = [
  [.15, .18, .27], [.21, .04, .23], [.27, .24, .28], [.33, .08, .22], [.39, .01, .2], [.62, .03, .2],
  [.67, .15, .25], [.72, .02, .22], [.77, .23, .27], [.82, .08, .23], [.86, .26, .26],
];
function Hanging() {
  const texs = useMemo(() => (typeof document === 'undefined' ? null : [silhouette(1), silhouette(2), silhouette(1.6)]), []);
  const tex = texs?.[0] ?? null;
  const mats = useMemo(() => HANG.map(() => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, opacity: 0 })), []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useEffect(() => () => { texs?.forEach((t) => t.dispose()); mats.forEach((m) => m.dispose()); }, [texs, mats]);
  useFrame((state) => {
    const o = stage.out; if (!o || !tex) return;
    const n = o.frame.hangN, tt = state.clock.elapsedTime;
    HANG.forEach(([x, y, len], i) => {
      const g = groups.current[i]; if (!g) return;
      const a = Math.min(1, Math.max(0, n - i));
      g.visible = a > .01;
      if (!g.visible) return;
      const m = mats[i], tx = texs![i % 3]; if (m.map !== tx) { m.map = tx; m.needsUpdate = true; }
      // further back = smaller and more lost in the mist
      const depth = i % 3; m.color.setScalar(1 - depth * .12);
      m.opacity = a * Math.min(1, o.light + .35) * (1 - depth * .18);
      const [px, py] = at(x, y, DS * (.35 + (i % 3) * .12));
      g.position.set(px, py, DS * (.35 + (i % 3) * .12));
      const h = len * PH;
      g.scale.set(h / 3, h, 1);
      // they sway, barely; one of them turns
      g.rotation.z = Math.sin(tt * .55 + i * 1.7) * .025;
      const turn = i === 7 ? o.frame.hangTurn : 0;
      g.scale.x = (h / 3) * (1 - turn * .55 * Math.abs(Math.sin(turn * Math.PI)) - turn * .2);
    });
  });
  if (!tex) return null;
  return (
    <>
      {HANG.map((_, i) => (
        <group key={i} ref={(g) => { groups.current[i] = g; }} renderOrder={3}>
          <mesh material={mats[i]} position={[0, -.5, 0]} renderOrder={3}><planeGeometry args={[1, 1]} /></mesh>
        </group>
      ))}
    </>
  );
}

/* ---------- the diya ---------- */
function flameTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 92, 2, 32, 80, 40);
  gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.35, 'rgba(255,190,90,.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 8); g.bezierCurveTo(54, 60, 50, 112, 32, 116); g.bezierCurveTo(14, 112, 10, 60, 32, 8); g.fill();
  return new THREE.CanvasTexture(c);
}
function darkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(6,5,4,1)'); gr.addColorStop(.6, 'rgba(6,5,4,.85)'); gr.addColorStop(1, 'rgba(6,5,4,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function Diya() {
  const flame = useMemo(() => (typeof document === 'undefined' ? null : flameTexture()), []);
  const dark = useMemo(() => (typeof document === 'undefined' ? null : darkTexture()), []);
  const halo = useMemo(glowTexture, []);
  const f = useRef<THREE.Mesh>(null), h = useRef<THREE.Sprite>(null), d = useRef<THREE.Mesh>(null);
  useEffect(() => () => { flame?.dispose(); dark?.dispose(); halo.dispose(); }, [flame, dark, halo]);
  useFrame((state) => {
    const o = stage.out; if (!o || !f.current || !h.current || !d.current) return;
    const dy = o.frame.diya, amt = o.frame.diyaAmt;
    const on = !!dy && amt > .01;
    f.current.visible = on; h.current.visible = on; d.current.visible = !!dy && amt < .99;
    if (!dy) return;
    const [x, y, size] = dy, tt = state.clock.elapsedTime;
    const p = at(x, y, DS * .5), s = size * .45;
    // the wind blows towards the visitor; the flame leans the other way, and won't settle
    const flick = 1 + Math.sin(tt * 23) * .08 + Math.sin(tt * 37) * .05 + (Math.random() - .5) * .06;
    f.current.position.set(p[0], p[1] + s * .55, p[2]); f.current.scale.set(s * .42, s * flick, 1);
    f.current.rotation.z = .22 + Math.sin(tt * 3.1) * .05;
    (f.current.material as THREE.MeshBasicMaterial).opacity = amt * .95;
    h.current.position.set(p[0], p[1] + s * .4, p[2]); h.current.scale.set(s * 5 * flick, s * 5 * flick, 1);
    (h.current.material as THREE.SpriteMaterial).opacity = amt * .45;
    // when it dies, the photo's own flame goes dark too
    d.current.position.set(p[0], p[1] + s * .25, p[2] - .01); d.current.scale.set(s * 2.4, s * 2.4, 1);
    (d.current.material as THREE.MeshBasicMaterial).opacity = 1 - amt;
  });
  if (!flame || !dark) return null;
  return (
    <>
      <mesh ref={d} renderOrder={3}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={dark} transparent depthTest={false} depthWrite={false} /></mesh>
      <sprite ref={h} renderOrder={4}><spriteMaterial map={halo} color="#ffb060" transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      <mesh ref={f} renderOrder={4}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={flame} transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </>
  );
}

/* ---------- the circle of water: slow rings across its surface ---------- */
function ringTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(200,215,230,.9)'; g.lineWidth = 3; g.filter = 'blur(2px)';
  g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke(); return new THREE.CanvasTexture(c);
}
function Ripples() {
  const tex = useMemo(() => (typeof document === 'undefined' ? null : ringTexture()), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useEffect(() => () => tex?.dispose(), [tex]);
  useFrame((state) => {
    const o = stage.out; if (!o) return;
    const c = o.frame.circle, tt = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return; m.visible = !!c; if (!c) return;
      const ph = ((tt * .18 + i / 3) % 1), [x, y] = at(c[0], c[1], DS * .3);
      m.position.set(x, y, DS * .3); m.scale.set(c[2] * PW * 2 * (.25 + ph * .7), c[3] * PH * 2 * (.25 + ph * .7), 1);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(ph * Math.PI) * .07 * Math.min(1, o.light + .2);
    });
  });
  if (!tex) return null;
  return <>{[0, 1, 2].map((i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} renderOrder={3}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>)}</>;
}

/* ---------- the haveli door, opening by itself ---------- */
function gapTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.12, 'rgba(2,2,2,1)'); gr.addColorStop(.88, 'rgba(2,2,2,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 8); return new THREE.CanvasTexture(c);
}
function DoorGap() {
  const tex = useMemo(() => (typeof document === 'undefined' ? null : gapTexture()), []);
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => () => tex?.dispose(), [tex]);
  useFrame(() => {
    const o = stage.out, m = ref.current; if (!o || !m) return;
    const d = o.frame.door, k = o.frame.doorOpen;
    m.visible = !!d && k > .005; if (!d || !m.visible) return;
    const cx = (d[0] + d[2]) / 2, cy = (d[1] + d[3]) / 2, w = (d[2] - d[0]) * PW * k * .96, h = (d[3] - d[1]) * PH * .97;
    const [x, y] = at(cx, cy);
    m.position.set(x, y, DS * .42); m.scale.set(Math.max(.01, w), h, 1);
  });
  if (!tex) return null;
  return <mesh ref={ref} renderOrder={3}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} /></mesh>;
}

/* ---------- concrete falling inside the building ---------- */
function Debris() {
  const N = 36;
  const seeds = useMemo(() => Array.from({ length: N }, () => ({ dx: (Math.random() - .5) * .5, v: .6 + Math.random() * .8, s: .03 + Math.random() * .07, delay: Math.random() * .12 })), []);
  const geo = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)), []);
  const pts = useRef<THREE.Points>(null), dust = useRef<THREE.Sprite>(null);
  const halo = useMemo(glowTexture, []);
  useEffect(() => () => { geo.dispose(); halo.dispose(); }, [geo, halo]);
  useFrame(() => {
    const o = stage.out; if (!o || !pts.current || !dust.current) return;
    const d = o.frame.debris, u = o.frame.debrisT;
    const on = !!d && u > .02 && u < .7;
    pts.current.visible = on; dust.current.visible = !!d && u > .1 && u < .9;
    if (!d) return;
    const [x, y] = at(d[0], d[1], DS * .5), arr = geo.attributes.position.array as Float32Array;
    seeds.forEach((s, i) => {
      const t = Math.max(0, u * 2.2 - s.delay);
      arr[i * 3] = x + s.dx * t * 2; arr[i * 3 + 1] = y + 1.2 - 9 * t * t * s.v; arr[i * 3 + 2] = DS * .5;
    });
    geo.attributes.position.needsUpdate = true;
    const k = Math.min(1, Math.max(0, (u - .1) / .4));
    dust.current.position.set(x, y - 1.6, DS * .5); dust.current.scale.set(2 + k * 5, 1 + k * 2.5, 1);
    (dust.current.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI) * .25;
  });
  return (
    <>
      <points ref={pts} geometry={geo} renderOrder={4}><pointsMaterial size={.07} color="#6d665c" transparent depthTest={false} depthWrite={false} sizeAttenuation /></points>
      <sprite ref={dust} renderOrder={4}><spriteMaterial map={halo} color="#9c968a" transparent depthTest={false} depthWrite={false} /></sprite>
    </>
  );
}

/** Part 2's layers. Each one shows only when the current shot asks for it. */
export default function Part2Layers() {
  const reduced = store.get().reduced;
  void reduced;
  return (
    <>
      <Ripples />
      <Diya />
      <DoorGap />
      <Figure />
      <Hanging />
      <Debris />
    </>
  );
}
