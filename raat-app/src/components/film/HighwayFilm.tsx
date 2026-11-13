'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { film } from '@/lib/film/clock';
import { DOOR_SHOT, WORLD, busAt, cameraAt } from '@/lib/film/highway';
import { asphalt, dirt, fogSheet, glow, puddles, streak, tree } from '@/lib/film/textures';
import { LENS_FRAG, LENS_VERT, PHOTO_FRAG, PHOTO_VERT } from '@/lib/three/shaders';
import { texture } from '@/lib/three/textures';
import { range, smooth } from '@/lib/animation/director';
import { live } from '@/lib/store';

// colours are used exactly as written: no linear conversion, no output encoding (matches the photos)
THREE.ColorManagement.enabled = false;
const FOG = new THREE.Color('#1b222b');
const ROAD_LEN = 700;
const useDispose = (...items: { dispose: () => void }[]) => useEffect(() => () => items.forEach((i) => i.dispose()), items); // eslint-disable-line react-hooks/exhaustive-deps

/* ---------------- the road ---------------- */
function Road() {
  const map = useMemo(asphalt, []), rough = useMemo(puddles, []), verge = useMemo(dirt, []);
  useDispose(map, rough, verge);
  const dashes = useRef<THREE.InstancedMesh>(null);
  const n = Math.floor(ROAD_LEN / 9);
  useEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { o.position.set(0, .012, 20 - i * 9); o.rotation.set(-Math.PI / 2, 0, 0); o.updateMatrix(); dashes.current?.setMatrixAt(i, o.matrix); }
    if (dashes.current) dashes.current.instanceMatrix.needsUpdate = true;
  }, [n]);
  const w = WORLD.roadWidth;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 20 - ROAD_LEN / 2]}>
        <planeGeometry args={[w, ROAD_LEN]} />
        <meshStandardMaterial map={map} roughnessMap={rough} roughness={1} metalness={0} color="#a3a8b0" />
      </mesh>
      <instancedMesh ref={dashes} args={[undefined, undefined, n]}>
        <planeGeometry args={[.16, 3.2]} />
        <meshStandardMaterial color="#d7d0bf" roughness={.55} />
      </instancedMesh>
      {[-1, 1].map((s) => (
        <mesh key={s} rotation-x={-Math.PI / 2} position={[s * (w / 2 - .25), .011, 20 - ROAD_LEN / 2]}>
          <planeGeometry args={[.14, ROAD_LEN]} />
          <meshStandardMaterial color="#b9b2a2" roughness={.6} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, -.02, 20 - ROAD_LEN / 2]}>
        <planeGeometry args={[160, ROAD_LEN]} />
        <meshStandardMaterial map={verge} roughness={1} color="#6f6a5e" />
      </mesh>
    </group>
  );
}

/* ---------------- trees at many depths ---------------- */
function Trees({ count }: { count: number }) {
  const maps = useMemo(() => [0, 1, 2].map(tree), []);
  useDispose(...maps);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const items = useMemo(() => {
    let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: count }, (_, i) => {
      const side = i % 2 ? 1 : -1, far = Math.pow(r(), 1.6);
      return { x: side * (WORLD.roadWidth / 2 + 5.5 + far * 34), z: 16 - r() * (ROAD_LEN - 120), s: 5 + r() * 4 + far * 7, k: Math.floor(r() * 3), flip: r() > .5 };
    });
  }, [count]);
  useEffect(() => {
    const o = new THREE.Object3D(); const idx = [0, 0, 0];
    items.forEach((it) => { o.position.set(it.x, it.s / 2 - .3, it.z); o.scale.set(it.flip ? -it.s : it.s, it.s, 1); o.updateMatrix(); refs.current[it.k]?.setMatrixAt(idx[it.k]++, o.matrix); });
    refs.current.forEach((m) => { if (m) m.instanceMatrix.needsUpdate = true; });
  }, [items]);
  // trees turn with the camera so they never show their edge
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ camera }) => {
    const o = tmp; const idx = [0, 0, 0];
    items.forEach((it) => { o.position.set(it.x, it.s / 2 - .3, it.z); o.rotation.y = Math.atan2(camera.position.x - it.x, camera.position.z - it.z); o.scale.set(it.flip ? -it.s : it.s, it.s, 1); o.updateMatrix(); refs.current[it.k]?.setMatrixAt(idx[it.k]++, o.matrix); });
    refs.current.forEach((m) => { if (m) m.instanceMatrix.needsUpdate = true; });
  });
  return (
    <>
      {maps.map((m, k) => (
        <instancedMesh key={k} ref={(el) => { refs.current[k] = el; }} args={[undefined, undefined, items.filter((i) => i.k === k).length]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={m} transparent alphaTest={.3} color="#2c3136" side={THREE.DoubleSide} />
        </instancedMesh>
      ))}
    </>
  );
}

/* ---------------- sodium lamps with beams and wet reflections ---------------- */
function Lamps() {
  const g = useMemo(() => glow('255,176,96'), []), s = useMemo(() => streak('255,170,90'), []);
  useDispose(g, s);
  const beam = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#ffae5c') }, uAmt: { value: .16 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uAmt; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.6) * (1. - abs(vUv.x * 2. - 1.)) * uAmt; gl_FragColor = vec4(uColor * a, a); }',
  }), []);
  useDispose(beam);
  const zs = useMemo(() => [6, -36, WORLD.hero.z + 3, -120, -162, -204, -246, -288, -330, -372, -414], []);
  return (
    <group>
      {zs.map((z, i) => {
        const x = z === WORLD.hero.z + 3 ? 6.4 : i % 2 ? -5.6 : 5.6, arm = x > 0 ? -1.5 : 1.5;
        const near = Math.abs(z - WORLD.hero.z) < 30 || i < 2;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 3.7, 0]}><cylinderGeometry args={[.06, .09, 7.4, 6]} /><meshStandardMaterial color="#1c1c1c" roughness={.8} /></mesh>
            <mesh position={[arm / 2, 7.3, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.04, .04, 1.5, 6]} /><meshStandardMaterial color="#1c1c1c" /></mesh>
            <mesh position={[arm, 7.2, 0]}><boxGeometry args={[.5, .12, .25]} /><meshBasicMaterial color="#ffd29a" /></mesh>
            <sprite position={[arm, 7.1, 0]} scale={[5, 5, 1]}><spriteMaterial map={g} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={.9} /></sprite>
            {/* light falling through the fog */}
            <mesh position={[arm, 3.6, 0]} material={beam}><coneGeometry args={[2.6, 7.2, 24, 1, true]} /></mesh>
            {/* its reflection on the wet road, stretched towards the viewer */}
            <mesh position={[arm * .6, .02, 4]} rotation-x={-Math.PI / 2}><planeGeometry args={[.9, 9]} /><meshBasicMaterial map={s} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={.3} /></mesh>
            {near && <pointLight position={[arm, 6.6, 0]} color="#ff9e4a" intensity={70} distance={30} decay={1.6} />}
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- fog at many depths ---------------- */
function FogLayers({ count }: { count: number }) {
  const map = useMemo(fogSheet, []);
  useDispose(map);
  const grp = useRef<THREE.Group>(null);
  const layers = useMemo(() => Array.from({ length: count }, (_, i) => ({ z: 4 - i * (300 / count), y: 1.4 + (i % 3) * .9, w: 60 + (i % 4) * 14, v: .12 + (i % 5) * .05, o: .16 + (i % 3) * .07 })), [count]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    grp.current?.children.forEach((m, i) => {
      const l = layers[i]; (m as THREE.Mesh).position.x = Math.sin(t * l.v * .3 + i) * 6;
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial; mat.map!.offset.x = t * l.v * .01;
      m.rotation.y = Math.atan2(state.camera.position.x - m.position.x, state.camera.position.z - m.position.z) * .6;
    });
  });
  return (
    <group ref={grp}>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, l.y, l.z]}>
          <planeGeometry args={[l.w, 9]} />
          <meshBasicMaterial map={map} transparent opacity={l.o} depthWrite={false} color="#6c7580" fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- rain around the camera ---------------- */
function Rain({ count }: { count: number }) {
  const geo = useMemo(() => {
    const p = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) { const x = (Math.random() - .5) * 26, y = Math.random() * 12, z = -Math.random() * 40 + 4; p.set([x, y, z, x - .05, y - .5, z], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g;
  }, [count]);
  useDispose(geo);
  const ref = useRef<THREE.LineSegments>(null);
  useFrame(({ camera }, dt) => {
    const a = geo.getAttribute('position') as THREE.BufferAttribute, p = a.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const o = i * 6; const fall = Math.min(dt, .05) * 15;
      p[o + 1] -= fall; p[o + 4] -= fall; p[o] -= fall * .1; p[o + 3] -= fall * .1;
      if (p[o + 4] < 0) { const x = (Math.random() - .5) * 26, z = -Math.random() * 40 + 4, y = 11 + Math.random(); p.set([x, y, z, x - .05, y - .5, z], o); }
    }
    a.needsUpdate = true;
    ref.current?.position.set(camera.position.x, 0, camera.position.z);
  });
  return <lineSegments ref={ref} geometry={geo}><lineBasicMaterial color="#9aa3ad" transparent opacity={.32} /></lineSegments>;
}

/* ---------------- the visitor ---------------- */
function Visitor({ gender, small }: { gender: 'm' | 'f'; small: boolean }) {
  const ref = useRef<THREE.Mesh>(null), phone = useRef<THREE.Sprite>(null);
  const g = useMemo(() => glow('190,215,255'), []);
  useDispose(g);
  const url = `/raat/cutouts/hero-${gender}${small ? '-m' : ''}.webp`;
  const aspect = gender === 'f' ? .621 : .627, h = WORLD.hero.h, w = h * aspect;
  useFrame(({ camera }, dt) => {
    const m = ref.current; if (!m) return;
    const tx = texture(url, true); const mat = m.material as THREE.MeshBasicMaterial;
    if (tx && mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
    m.visible = !!tx;
    m.rotation.y = Math.atan2(camera.position.x - WORLD.hero.x, camera.position.z - WORLD.hero.z);
    // the phone screen breathes, then flares when the message arrives
    const t = film.t, flare = t > 25.2 && t < 27 ? 1.6 : 1;
    if (phone.current) { const k = (.5 + Math.sin(performance.now() / 900) * .1) * flare; phone.current.scale.set(.5 * k, .5 * k, 1); }
    void dt;
  });
  return (
    <group position={[WORLD.hero.x, 0, WORLD.hero.z]}>
      <mesh ref={ref} position={[0, h / 2, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial transparent alphaTest={.4} color="#e2dcd2" />
        <sprite ref={phone} position={[(.95 - .5) * w, (.5 - .22) * h, .02]}><spriteMaterial map={g} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={.8} /></sprite>
      </mesh>
    </group>
  );
}

/* ---------------- the bus ---------------- */
function Bus({ small }: { small: boolean }) {
  const grp = useRef<THREE.Group>(null), body = useRef<THREE.Mesh>(null);
  const hl = useMemo(() => glow('255,236,200'), []), refl = useMemo(() => streak('255,226,180'), []);
  useDispose(hl, refl);
  const beam = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uAmt: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uAmt; varying vec2 vUv; void main(){ float a = pow(vUv.y, 2.2) * (1. - abs(vUv.x * 2. - 1.)) * uAmt; gl_FragColor = vec4(vec3(1., .9, .74) * a, a); }',
  }), []);
  useDispose(beam);
  const sprites = useRef<(THREE.Sprite | null)[]>([]), spots = useRef<(THREE.SpotLight | null)[]>([]), streaks = useRef<(THREE.Mesh | null)[]>([]);
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0, 30); return o; }, []);
  const H = WORLD.busHeight, W = H * 1.079;
  const lights: [number, number][] = [[.253, .713], [.853, .713]];
  const url = `/raat/cutouts/bus-front${small ? '-m' : ''}.webp`;

  useFrame((state) => {
    const t = film.t, b = busAt(t), g = grp.current; if (!g) return;
    g.visible = b.visible;
    g.position.set(WORLD.busLane, 0, b.z);
    // nose dips as it brakes, settles after
    g.rotation.x = Math.sin(b.braking * Math.PI) * .025;
    g.position.y = Math.sin(state.clock.elapsedTime * 9) * .01 * (1 - b.braking);
    const tx = texture(url, true), m = body.current;
    if (m) { const mat = m.material as THREE.MeshBasicMaterial; if (tx && mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; } m.visible = !!tx; }
    const L = b.lights, far = range(-b.z, 120, 430);
    sprites.current.forEach((s) => { if (!s) return; const k = (1.2 + far * 5) * (.6 + L * .4); s.scale.set(k, k, 1); (s.material as THREE.SpriteMaterial).opacity = L; });
    spots.current.forEach((s) => { if (s) s.intensity = 55 * L; });
    streaks.current.forEach((s) => { if (!s) return; (s.material as THREE.MeshBasicMaterial).opacity = L * .7; s.scale.y = 1 + far * 2; });
    beam.uniforms.uAmt.value = .22 * L;
  });

  return (
    <group ref={grp}>
      <primitive object={target} />
      <mesh ref={body} position={[0, H / 2, 0]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial transparent alphaTest={.35} color="#d2d2d2" />
      </mesh>
      {lights.map(([u, v], i) => {
        const x = (u - .5) * W, y = (.5 - v) * H + H / 2;
        return (
          <group key={i} position={[x, y, .05]}>
            <sprite ref={(s) => { sprites.current[i] = s; }}><spriteMaterial map={hl} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></sprite>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0, 13]} material={beam}><coneGeometry args={[2.4, 26, 24, 1, true]} /></mesh>
            <spotLight ref={(s) => { spots.current[i] = s; }} target={target} angle={.38} penumbra={.7} distance={90} decay={1.4} color="#fff1d8" />
            <mesh ref={(m) => { streaks.current[i] = m; }} rotation-x={-Math.PI / 2} position={[0, -y + .02, 7]}><planeGeometry args={[.9, 14]} /><meshBasicMaterial map={refl} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- the last shot: the bus door, a photograph in depth, far from the road ---------------- */
const DOOR_ORIGIN = new THREE.Vector3(2000, 0, 0);
function DoorShot({ small }: { small: boolean }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PHOTO_VERT, fragmentShader: PHOTO_FRAG, transparent: true,
    uniforms: {
      uMap: { value: null }, uDepth: { value: null }, uHasMap: { value: 0 }, uHasDepth: { value: 0 }, uDepthScale: { value: 1.5 },
      uMix: { value: 1 }, uLight: { value: 1 }, uWarm: { value: 0 }, uFog: { value: .6 }, uTime: { value: 0 }, uDissolve: { value: 0 }, uFade: { value: 1 },
      uDof: { value: 1.2 }, uFocus: { value: new THREE.Vector2(.84, .45) }, uFogColor: { value: new THREE.Color('#14161a') },
      uDoor: { value: new THREE.Vector4(.117, .385, .188, .739) }, uDoorOpen: { value: 0 }, uFill: { value: 0 },
    },
  }), []);
  useDispose(mat);
  useFrame((state) => {
    const u = mat.uniforms, map = texture(`/raat/scenes/bus-side${small ? '-m' : ''}.webp`), d = texture('/raat/scenes/bus-side-d.webp', false);
    u.uMap.value = map; u.uHasMap.value = map ? 1 : 0; u.uDepth.value = d; u.uHasDepth.value = d ? 1 : 0; u.uTime.value = state.clock.elapsedTime;
    u.uDoorOpen.value = smooth(range(film.t, 39.0, 40.4)); u.uFill.value = smooth(range(film.t, 44.0, 45));
  });
  return <mesh material={mat} position={DOOR_ORIGIN.toArray()}><planeGeometry args={[16, 9, 192, 108]} /></mesh>;
}

/* ---------------- camera, cuts and the lens ---------------- */
function FilmCamera({ reduced }: { reduced: boolean }) {
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
  useEffect(() => { scene.fog = new THREE.FogExp2(FOG.getHex(), .024); scene.background = FOG; return () => { scene.fog = null; }; }, [scene]);
  const perf = useMemo(() => ({ n: 0, sum: 0, level: 0, lastShot: '' }), []);

  useFrame((state, delta) => {
    perf.sum += delta; perf.n++;
    if (perf.n === 90) { if (perf.sum / perf.n > 1 / 38 && perf.level < 2) { perf.level++; setDpr(perf.level === 1 ? 1 : .75); } perf.n = 0; perf.sum = 0; }
    const t = film.t, portrait = size.width < size.height;
    const shot = t >= DOOR_SHOT.from ? 'door' : 'road';
    if (shot !== perf.lastShot) { film.glitch = Math.max(film.glitch, .8); perf.lastShot = shot; }
    film.glitch = Math.max(0, film.glitch - Math.min(delta, .05) * 2.4);
    film.shake = Math.max(0, film.shake - Math.min(delta, .05) * 1.5);
    const sh = reduced ? 0 : film.shake * .06;
    const px = reduced ? 0 : live.pointer.x * .12, py = reduced ? 0 : -live.pointer.y * .06;

    if (shot === 'road') {
      const c = cameraAt(t, portrait);
      cam.position.set(c.pos[0] + px + (Math.random() - .5) * sh, c.pos[1] + py + (Math.random() - .5) * sh, c.pos[2]);
      cam.lookAt(c.look[0], c.look[1], c.look[2]);
      if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
      if (scene.fog) (scene.fog as THREE.FogExp2).density = .028;
    } else {
      // push in on the door: the photo plane is 16 × 9, the door sits near its right edge
      // walk to the door, then up its steps: the frame closes on the lit doorway
      const k = smooth(range(t, DOOR_SHOT.from, 42)) * .45 + smooth(range(t, 41.5, 45)) * 2.9;
      const aspect = size.width / size.height, cover = aspect > 16 / 9 ? 16 / aspect : 9;
      const hv = cover / (1.1 + k) * .86, wv = hv * aspect;
      const step = Math.max(0, Math.sin((t - 42.2) * Math.PI * 1.6)) * .05 * range(t, 42.2, 44.5);
      const fx = (.152 - .5) * 16, fy = (.5 - .56) * 9 + step; // the open door (left: Indian buses open on the roadside)
      const cx = THREE.MathUtils.clamp(fx, -(16 - wv) / 2, (16 - wv) / 2), cy = THREE.MathUtils.clamp(fy, -(9 - hv) / 2, (9 - hv) / 2);
      const fov = 40, dist = hv / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
      cam.position.set(DOOR_ORIGIN.x + cx + px * 2, DOOR_ORIGIN.y + cy + py * 2, dist);
      cam.lookAt(DOOR_ORIGIN.x + cx, DOOR_ORIGIN.y + cy, .6);
      if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      if (scene.fog) (scene.fog as THREE.FogExp2).density = 0;
    }
    gl.setRenderTarget(rt); gl.setClearColor(FOG, 1); gl.clear(); gl.render(scene, cam); gl.setRenderTarget(null);
    const u = lens.mat.uniforms; u.uTime.value = state.clock.elapsedTime; u.uGlitch.value = reduced ? film.glitch * .3 : film.glitch; u.uSpeed.value = 0; u.uReduced.value = reduced ? 1 : 0;
    gl.render(lens.s, lens.cam);
  }, 1);
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={.22} color="#9aa6b6" />
      <hemisphereLight args={['#3a4656', '#0e0c09', .5]} />
      <directionalLight position={[-40, 60, -80]} intensity={.18} color="#aab6c8" />
    </>
  );
}

/** The highway as a real 3D place: road, lamps, trees, fog, rain, the visitor and the bus. */
export default function HighwayFilm({ gender, small, reduced }: { gender: 'm' | 'f'; small: boolean; reduced: boolean }) {
  return (
    <Canvas className="!absolute inset-0" dpr={small ? [1, 1.5] : [1, 1.75]} flat linear
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 44, near: .1, far: 600, position: [0, 1.6, 8] }} aria-hidden>
      <Lights />
      <Road />
      <Trees count={small ? 120 : 260} />
      <Lamps />
      <FogLayers count={small ? 8 : 16} />
      <Rain count={small ? 500 : 1200} />
      <Visitor gender={gender} small={small} />
      <Bus small={small} />
      <DoorShot small={small} />
      <FilmCamera reduced={reduced} />
    </Canvas>
  );
}
