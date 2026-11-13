'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PHOTO_FRAG, PHOTO_VERT } from '@/lib/three/shaders';
import { glowTexture, texture } from '@/lib/three/textures';
import { store } from '@/lib/store';
import { sceneUrl, stage } from '@/lib/animation/stageState';
import { lifeFor } from '@/lib/animation/life';

/** The photograph plane is 16 × 9 world units, centred on the origin, facing the camera. */
export const PLANE_W = 16, PLANE_H = 9, DEPTH_SCALE = 1.5;

/** One photograph pushed into depth by its depth map. Two of these cross-dissolve on every cut. */
function PhotoSurface({ role, segments }: { role: 'cur' | 'prev'; segments: [number, number] }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PHOTO_VERT, fragmentShader: PHOTO_FRAG, transparent: true, depthWrite: false, depthTest: false,
    uniforms: {
      uMap: { value: null }, uDepth: { value: null }, uHasMap: { value: 0 }, uHasDepth: { value: 0 }, uDepthScale: { value: DEPTH_SCALE },
      uMix: { value: 1 }, uLight: { value: 1 }, uWarm: { value: 0 }, uFog: { value: .3 }, uTime: { value: 0 }, uDissolve: { value: role === 'cur' ? 1 : 0 },
      uFade: { value: 1 }, uDof: { value: 1 }, uFocus: { value: new THREE.Vector2(.5, .5) }, uFogColor: { value: new THREE.Color('#14161a') },
      uLife: { value: 0 }, uHeadA: { value: new THREE.Vector4() }, uHeadB: { value: new THREE.Vector4() }, uBodyA: { value: new THREE.Vector4() }, uBodyB: { value: new THREE.Vector4() }, uHairA: { value: new THREE.Vector4() }, uRowsOut: { value: 0 }, uVanish: { value: 0 },
    },
  }), [role]);
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state) => {
    const o = stage.out; if (!o) return;
    const name = role === 'cur' ? o.cur : o.prev;
    const u = mat.uniforms;
    const map = name ? texture(sceneUrl(name, stage.small)) : null;
    const depth = name ? texture(sceneUrl(name, false, 'depth'), false) : null;
    u.uMap.value = map; u.uHasMap.value = map ? 1 : 0;
    u.uDepth.value = depth; u.uHasDepth.value = depth ? 1 : 0;
    // cutting to black: the old picture fades out instead of lingering
    u.uFade.value = role === 'prev' && !o.cur ? 1 - o.mix : 1;
    u.uMix.value = o.mix; u.uLight.value = o.light; u.uWarm.value = o.frame.warm ? 1 : 0;
    u.uFog.value = o.frame.fog; u.uDof.value = o.frame.dof; u.uTime.value = state.clock.elapsedTime;
    u.uFocus.value.set(o.frame.fx, 1 - o.frame.fy);
    // the people in the picture breathe (off for reduced motion)
    const l = lifeFor(name);
    u.uLife.value = store.get().reduced ? 0 : l.amp;
    u.uRowsOut.value = role === 'cur' ? o.frame.rowsOut : 0;
    u.uVanish.value = role === 'cur' ? o.frame.vanish : 0;
    u.uHeadA.value.set(...l.headA); u.uHeadB.value.set(...l.headB); u.uBodyA.value.set(...l.bodyA); u.uBodyB.value.set(...l.bodyB); u.uHairA.value.set(...l.hair);
  });

  return (
    <mesh material={mat} renderOrder={role === 'cur' ? 2 : 1}>
      <planeGeometry args={[PLANE_W, PLANE_H, segments[0], segments[1]]} />
    </mesh>
  );
}

/** Headlights coming through the fog, placed on the photograph. */
function Headlight() {
  const tex = useMemo(glowTexture, []);
  const ref = useRef<THREE.Sprite>(null);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((state) => {
    const o = stage.out, s = ref.current; if (!o || !s) return;
    const g = o.frame.glow;
    s.visible = !!g;
    if (!g) return;
    const r = 1 + o.frame.glowAmt * 7;
    s.position.set((g[0] - .5) * PLANE_W, (.5 - g[1]) * PLANE_H, DEPTH_SCALE * .4);
    s.scale.set(r, r, 1);
    (s.material as THREE.SpriteMaterial).opacity = .3 + o.frame.glowAmt * .6 + Math.sin(state.clock.elapsedTime * 11) * .03;
  });
  return (
    <sprite ref={ref} renderOrder={3}>
      <spriteMaterial map={tex} transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/** Her reflection in the glass: faint, mirrored, cold, and only where the shot asks for it. She is behind you. */
function Reflection() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(.62, .74, .86), opacity: 0 }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    const o = stage.out, m = ref.current; if (!o || !m) return;
    const r = o.frame.reflection, amt = o.frame.reflectAmt * Math.min(1, o.light + .2);
    m.visible = !!r && amt > .01;
    if (!r || !m.visible) return;
    const tex = texture('/raat/cutouts/her-look.webp');
    if (!tex) { m.visible = false; return; } // still loading: never show an empty plane
    if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
    const img = tex?.image as HTMLImageElement | undefined;
    const aspect = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : .45;
    const h = r[2] * PLANE_H;
    m.scale.set(-h * aspect, h, 1); // mirrored, like a reflection
    m.position.set((r[0] - .5) * PLANE_W, (.5 - r[1]) * PLANE_H, DEPTH_SCALE * .3);
    // rain on the glass breaks the reflection up a little
    mat.opacity = amt * (.55 + Math.sin(state.clock.elapsedTime * 2.3) * .06 + Math.sin(state.clock.elapsedTime * 17) * .03);
  });
  return <mesh ref={ref} material={mat} renderOrder={3}><planeGeometry args={[1, 1]} /></mesh>;
}

/** Dust hanging in the air between the camera and the picture: real 3D parallax. */
function Dust({ count }: { count: number }) {
  const geo = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - .5) * 18; p[i * 3 + 1] = (Math.random() - .5) * 10; p[i * 3 + 2] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g;
  }, [count]);
  const mat = useRef<THREE.PointsMaterial>(null);
  const pts = useRef<THREE.Points>(null);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((state, dt) => {
    const o = stage.out; if (!o || !pts.current || !mat.current) return;
    // the cloud always spans from just in front of the photo to just in front of the lens
    const camZ = state.camera.position.z;
    pts.current.position.z = DEPTH_SCALE + .1;
    pts.current.scale.z = Math.max(.1, camZ - 1.2 - (DEPTH_SCALE + .1));
    pts.current.position.x = state.camera.position.x * .3;
    pts.current.position.y = state.camera.position.y * .3 + Math.sin(state.clock.elapsedTime * .2) * .3;
    pts.current.rotation.z = Math.sin(state.clock.elapsedTime * .05) * .05;
    mat.current.opacity = (o.cur ? .55 : .25) * Math.min(1, o.light + .2);
  });
  return (
    <points ref={pts} geometry={geo} renderOrder={4}>
      <pointsMaterial ref={mat} size={.028} color="#d8cdb8" transparent depthTest={false} depthWrite={false} sizeAttenuation />
    </points>
  );
}

export default function PhotoWorld({ small }: { small: boolean }) {
  const seg: [number, number] = small ? [128, 72] : [256, 144];
  return (
    <>
      <PhotoSurface role="prev" segments={seg} />
      <PhotoSurface role="cur" segments={seg} />
      <Headlight />
      <Reflection />
      <Dust count={small ? 220 : 600} />
    </>
  );
}
