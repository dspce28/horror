'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GHOSTS, interiorAt, type GhostPose } from '@/lib/film/interior';
import { LENS_FRAG, LENS_VERT, RELIEF_FRAG, RELIEF_VERT } from '@/lib/three/shaders';
import { texture } from '@/lib/three/textures';
import { glow } from '@/lib/film/textures';
import { live } from '@/lib/store';

THREE.ColorManagement.enabled = false;

/** how the source photos were shot: horizontal field of view and the depth range they cover */
const PHOTO = { tanX: Math.tan(THREE.MathUtils.degToRad(42)), aspect: 941 / 1672, near: 1.05, far: 15 };

/** the interior state for this frame, shared by all pieces */
const now = { f: interiorAt(0, 0), flick: 1 };

/** One photograph rebuilt as 3D space around the camera. */
function Relief({ name, yaw, small }: { name: string; yaw: number; small: boolean }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: RELIEF_VERT, fragmentShader: RELIEF_FRAG, extensions: { derivatives: true } as never,
    uniforms: {
      uMap: { value: null }, uDepth: { value: null }, uHas: { value: 0 }, uLight: { value: 1 }, uEdge: { value: .85 },
      uTan: { value: new THREE.Vector2(PHOTO.tanX, PHOTO.tanX * PHOTO.aspect) }, uNear: { value: PHOTO.near }, uFar: { value: PHOTO.far },
    },
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const map = texture(`/raat/scenes/${name}${small ? '-m' : ''}.webp`), d = texture(`/raat/scenes/${name}-d.webp`, false);
    const u = mat.uniforms; u.uMap.value = map; u.uDepth.value = d; u.uHas.value = map && d ? 1 : 0; u.uLight.value = now.flick;
  });
  return (
    <mesh material={mat} rotation-y={yaw} frustumCulled={false}>
      <planeGeometry args={[1, 1, small ? 160 : 288, small ? 90 : 162]} />
    </mesh>
  );
}

/** Dark walls, ceiling and window band that fill the gaps between the two photographs while turning. */
function Shell() {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh renderOrder={-1} position={[s * 1.25, -.35, -2]} rotation-y={-s * Math.PI / 2}><planeGeometry args={[18, 2.2]} /><meshBasicMaterial color="#0e0a08" depthWrite={false} depthTest={false} /></mesh>
          <mesh renderOrder={-1} position={[s * 1.24, .25, -2]} rotation-y={-s * Math.PI / 2}><planeGeometry args={[18, .8]} /><meshBasicMaterial color="#18202a" depthWrite={false} depthTest={false} /></mesh>
        </group>
      ))}
      {Array.from({ length: 16 }, (_, i) => -11 + i * .9).map((z) => [-1, 1].map((s) => (
        <mesh key={`${z}${s}`} renderOrder={-1} position={[s * .78, -.72, z]}><boxGeometry args={[.82, .62, .08]} /><meshBasicMaterial color="#1a0907" depthWrite={false} depthTest={false} /></mesh>
      )))}
      <mesh renderOrder={-1} position={[0, .95, -2]} rotation-x={Math.PI / 2}><planeGeometry args={[2.5, 18]} /><meshBasicMaterial color="#14100c" depthWrite={false} depthTest={false} /></mesh>
      <mesh renderOrder={-1} position={[0, -1.5, -2]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.5, 18]} /><meshBasicMaterial color="#0d0b09" depthWrite={false} depthTest={false} /></mesh>
    </group>
  );
}

/** Streetlights sweeping past the windows once the bus is moving. */
function PassingLights() {
  const g = useMemo(() => glow('255,170,90'), []);
  useEffect(() => () => g.dispose(), [g]);
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const lights = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ side: i % 2 ? 1 : -1, phase: i / 6 })), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime, m = now.f.moving;
    refs.current.forEach((s, i) => {
      if (!s) return; const l = lights[i];
      const k = ((t * .45 * (.6 + m * .4) + l.phase) % 1);
      s.position.set(l.side * 1.6, .35, 6 - k * 22);
      s.scale.set(3.4, 2.4, 1);
      (s.material as THREE.SpriteMaterial).opacity = m * .5 * Math.sin(k * Math.PI);
    });
  });
  return (
    <>
      {lights.map((_, i) => (
        <sprite key={i} ref={(s) => { refs.current[i] = s; }} renderOrder={5}>
          <spriteMaterial map={g} transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </>
  );
}

/** Her. Three cut-outs, one per pose; she only ever moves while you're not looking. */
function Ghost({ small }: { small: boolean }) {
  const refs = useRef<Partial<Record<GhostPose, THREE.Mesh | null>>>({});
  useFrame(({ camera }) => {
    (Object.keys(GHOSTS) as Exclude<GhostPose, 'none'>[]).forEach((k) => {
      const m = refs.current[k]; if (!m) return;
      const g = GHOSTS[k], mat = m.material as THREE.MeshBasicMaterial;
      const tx = texture(`/raat/cutouts/${g.url}${small ? '-m' : ''}.webp`);
      if (tx && mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
      const on = now.f.ghost === k && !!tx;
      m.visible = on;
      if (!on) return;
      // she moves closer each time the visitor scrolls back to check on her
      const closer = k === 'behind' ? Math.min(live.lookBacks, 2) * .55 : 0;
      m.position.set(g.pos[0], g.pos[1] + g.h / 2, g.pos[2] + closer);
      m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
      mat.opacity = now.f.ghostAlpha;
      mat.color.setScalar(Math.min(1.1, now.flick * 1.05));
    });
  });
  return (
    <>
      {(Object.keys(GHOSTS) as Exclude<GhostPose, 'none'>[]).map((k) => (
        <mesh key={k} ref={(m) => { refs.current[k] = m; }} renderOrder={2}>
          <planeGeometry args={[GHOSTS[k].h * GHOSTS[k].aspect, GHOSTS[k].h]} />
          <meshBasicMaterial transparent alphaTest={.35} />
        </mesh>
      ))}
    </>
  );
}

/** Dust in the tube light. */
function Dust({ count }: { count: number }) {
  const geo = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - .5) * 2.2; p[i * 3 + 1] = (Math.random() - .5) * 2; p[i * 3 + 2] = -Math.random() * 6 + 2; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef<THREE.Points>(null);
  useFrame((s, dt) => { if (ref.current) { ref.current.rotation.y += dt * .015; ref.current.position.y = Math.sin(s.clock.elapsedTime * .3) * .05; } });
  return <points ref={ref} geometry={geo} renderOrder={6}><pointsMaterial size={.012} color="#e2d6c0" transparent opacity={.5} depthWrite={false} /></points>;
}

/** Camera, flicker and the lens pass. */
function Director({ reduced, progress }: { reduced: boolean; progress: () => number }) {
  const { gl, scene, camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const dpr = useThree((s) => s.viewport.dpr), setDpr = useThree((s) => s.setDpr);
  const rt = useMemo(() => new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true }), []);
  const lens = useMemo(() => {
    const mat = new THREE.ShaderMaterial({ vertexShader: LENS_VERT, fragmentShader: LENS_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uSpeed: { value: 0 }, uGlitch: { value: 0 }, uReduced: { value: 0 } } });
    const s = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); s.add(q);
    return { mat, s, q, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [rt]);
  useEffect(() => { rt.setSize(Math.round(size.width * dpr), Math.round(size.height * dpr)); lens.mat.uniforms.uRes.value.set(size.width * dpr, size.height * dpr); }, [size, dpr, rt, lens]);
  useEffect(() => () => { rt.dispose(); lens.mat.dispose(); lens.q.geometry.dispose(); }, [rt, lens]);
  const st = useMemo(() => ({ dip: 0, next: 0, glitch: 0, lastGhost: 'none' as GhostPose, n: 0, sum: 0, level: 0 }), []);

  useFrame((state, delta) => {
    st.sum += delta; st.n++;
    if (st.n === 90) { if (st.sum / st.n > 1 / 38 && st.level < 2) { st.level++; setDpr(st.level === 1 ? 1 : .75); } st.n = 0; st.sum = 0; }
    const t = progress(), f = interiorAt(t, live.lookBacks), ms = performance.now();
    now.f = f;
    // tube lights: occasional dips, chaos at the end
    let fl = 1;
    if (f.flicker) {
      if (ms > st.next) { st.dip = ms + 40 + Math.random() * (f.flicker === 2 ? 220 : 110); st.next = ms + (f.flicker === 2 ? 120 + Math.random() * 500 : 1600 + Math.random() * 3800); }
      if (ms < st.dip) fl = f.flicker === 2 ? Math.random() * .3 : .3 + Math.random() * .3;
    }
    if (reduced) fl = Math.max(.7, fl);
    now.flick = fl * (t > .965 ? 0 : 1); live.flicker = fl;
    // she changes place: the lens glitches
    if (f.ghost !== st.lastGhost) { st.glitch = 1; st.lastGhost = f.ghost; }
    st.glitch = Math.max(0, st.glitch - Math.min(delta, .05) * 2.6);

    const vib = reduced ? 0 : f.moving * .006;
    const px = reduced ? 0 : live.pointer.x * .04, py = reduced ? 0 : -live.pointer.y * .03;
    cam.position.set(Math.sin(state.clock.elapsedTime * 13) * vib, f.height + Math.sin(state.clock.elapsedTime * 9.3) * vib, -f.dolly * Math.cos(f.yaw) * (f.yaw < .2 ? 1 : 0));
    cam.rotation.set(f.pitch + py, -f.yaw + px, 0, 'YXZ');
    if (Math.abs(cam.fov - f.fov) > .01) { cam.fov = f.fov; cam.updateProjectionMatrix(); }

    gl.setRenderTarget(rt); gl.setClearColor('#050506', 1); gl.clear(); gl.render(scene, cam); gl.setRenderTarget(null);
    const u = lens.mat.uniforms; u.uTime.value = state.clock.elapsedTime; u.uSpeed.value = reduced ? f.turnSpeed * .3 : f.turnSpeed; u.uGlitch.value = reduced ? st.glitch * .3 : st.glitch; u.uReduced.value = reduced ? 1 : 0;
    gl.render(lens.s, lens.cam);
  }, 1);
  return null;
}

/**
 * The inside of the bus as a real space: the back of the bus in front of you, the driver's cabin
 * behind you, rebuilt in 3D from two photographs and their depth maps.
 */
export default function BusInterior({ small, reduced, progress }: { small: boolean; reduced: boolean; progress: () => number }) {
  return (
    <Canvas className="!absolute inset-0" dpr={small ? [1, 1.5] : [1, 1.75]} flat linear
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 58, near: .05, far: 60, position: [0, 0, 0] }} aria-hidden>
      <Shell />
      <Relief name="inside-empty" yaw={0} small={small} />
      <Relief name="cabin" yaw={Math.PI} small={small} />
      <Ghost small={small} />
      <PassingLights />
      <Dust count={small ? 150 : 400} />
      <Director reduced={reduced} progress={progress} />
    </Canvas>
  );
}
