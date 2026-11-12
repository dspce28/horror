'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { asphalt, dirt, fogPuff, glow, motorbike, tree } from '@/lib/three/textures';
import { frame } from '@/lib/three/frame';

const LOOP = 320; // roadside props repeat every LOOP metres while the bus drives
const NEAR = 30;

interface Props { quality: 'high' | 'low' }

export default function HighwayScene({ quality }: Props) {
  const roadTex = useMemo(asphalt, []);
  const dirtTex = useMemo(dirt, []);
  const fogTex = useMemo(fogPuff, []);
  const lampGlow = useMemo(() => glow('255,170,90'), []);
  const bikeTex = useMemo(motorbike, []);
  const treeTex = useMemo(() => [0, 1, 2].map(tree), []);
  useEffect(() => () => { [roadTex, dirtTex, fogTex, lampGlow, bikeTex, ...treeTex].forEach((t) => t.dispose()); }, [roadTex, dirtTex, fogTex, lampGlow, bikeTex, treeTex]);

  const group = useRef<THREE.Group>(null);
  const staticProps = useRef<THREE.Group>(null);
  const treeMeshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const poles = useRef<THREE.Group>(null);
  const fogs = useRef<THREE.Group>(null);

  // tree placements: [x, z, scale, kind]; nearer rows are larger and move faster past the camera
  const trees = useMemo(() => {
    const out: [number, number, number, number][] = [];
    let s = 99; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const count = quality === 'low' ? 70 : 150;
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1, far = r();
      const x = side > 0 ? 6.5 + far * 26 : -5.5 - far * 26;
      out.push([x, NEAR - r() * LOOP, 5 + r() * 5 + far * 3, Math.floor(r() * 3)]);
    }
    return out;
  }, [quality]);

  const poleZ = useMemo(() => [-14, -74, -134, -194, -254], []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const fogPlanes = useMemo(() => Array.from({ length: quality === 'low' ? 6 : 14 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (2 + (i * 3.7) % 9), z: 8 - i * 9, s: 14 + (i * 5) % 10, v: .25 + (i % 5) * .08 })), [quality]);

  const placeTrees = (offset: number) => {
    const per: number[] = [0, 0, 0];
    trees.forEach(([x, z0, sc, k]) => {
      const m = treeMeshes.current[k]; if (!m) return;
      let z = z0 + offset; z = ((z - NEAR) % LOOP + LOOP) % LOOP - LOOP + NEAR;
      tmp.position.set(x, sc / 2 - .2, z); tmp.scale.set(sc, sc, 1); tmp.rotation.set(0, 0, 0); tmp.updateMatrix();
      m.setMatrixAt(per[k]++, tmp.matrix);
    });
    treeMeshes.current.forEach((m) => { if (m) m.instanceMatrix.needsUpdate = true; });
  };

  useEffect(() => { placeTrees(0); }); // eslint-disable-line react-hooks/exhaustive-deps

  const lastOffset = useRef(-1);
  useFrame((state, dt) => {
    const w = frame.world; if (!w || !group.current) return;
    group.current.visible = w.outsideVisible;
    frame.roadOffset += w.roadSpeed * Math.min(dt, .05);
    const off = frame.roadOffset;
    roadTex.offset.y = -off / (600 / 40);
    dirtTex.offset.y = -off / (600 / 120);
    if (Math.abs(off - lastOffset.current) > .001) {
      placeTrees(off);
      if (poles.current) poles.current.children.forEach((p, i) => { const z = poleZ[i] + off; p.position.z = ((z - NEAR) % (LOOP * .94) + LOOP * .94) % (LOOP * .94) - LOOP * .94 + NEAR; });
      if (staticProps.current) staticProps.current.position.z = off;
      lastOffset.current = off;
    }
    if (fogs.current) {
      fogs.current.visible = frame.camera ? frame.camera.position.x > 3 || frame.camera.position.z > -11 : true;
      const t = state.clock.elapsedTime;
      fogs.current.children.forEach((f, i) => { const d = fogPlanes[i]; f.position.x = d.x + Math.sin(t * d.v * .3 + i) * 3; f.position.z = ((d.z + off * .6 - 12) % 130 + 130) % 130 - 120; });
    }
  });

  return (
    <group ref={group}>
      {/* road and verges */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -260]} receiveShadow>
        <planeGeometry args={[7.5, 600]} />
        <meshStandardMaterial map={roadTex} roughness={.95} metalness={0} color="#77726c" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -.02, -260]}>
        <planeGeometry args={[80, 600]} />
        <meshStandardMaterial map={dirtTex} roughness={1} color="#4a443b" />
      </mesh>

      {/* trees: three silhouettes, instanced */}
      {treeTex.map((t, k) => (
        <instancedMesh key={k} ref={(m) => { treeMeshes.current[k] = m; }} args={[undefined, undefined, trees.filter((x) => x[3] === k).length]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial map={t} transparent alphaTest={.35} color="#151513" roughness={1} side={THREE.DoubleSide} depthWrite />
        </instancedMesh>
      ))}

      {/* sodium streetlights; only the first carries a real light */}
      <group ref={poles}>
        {poleZ.map((z, i) => (
          <group key={i} position={[5.2, 0, z]}>
            <mesh position={[0, 3.6, 0]}><cylinderGeometry args={[.06, .09, 7.2, 6]} /><meshStandardMaterial color="#2a2826" roughness={.8} metalness={.4} /></mesh>
            <mesh position={[-.8, 7.1, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.04, .04, 1.6, 6]} /><meshStandardMaterial color="#2a2826" /></mesh>
            <mesh position={[-1.55, 7.0, 0]}><boxGeometry args={[.5, .12, .25]} /><meshStandardMaterial color="#ffb060" emissive="#ff9a40" emissiveIntensity={i === 0 ? 3 : 1.6} /></mesh>
            <sprite position={[-1.55, 6.9, 0]} scale={[4, 4, 1]}><spriteMaterial map={lampGlow} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} opacity={.8} /></sprite>
            {i < 2 && <pointLight position={[-1.55, 6.6, 0]} color="#ffa552" intensity={i === 0 ? 60 : 30} distance={26} decay={1.6} />}
          </group>
        ))}
      </group>

      {/* the broken motorcycle */}
      <group ref={staticProps}>
        <mesh position={[4.9, .62, -8.6]} rotation-y={-.5}>
          <planeGeometry args={[2.0, 1.25]} />
          <meshStandardMaterial map={bikeTex} transparent alphaTest={.2} roughness={.7} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* drifting fog banks */}
      <group ref={fogs}>
        {fogPlanes.map((f, i) => (
          <mesh key={i} position={[f.x, 1.4, f.z]}>
            <planeGeometry args={[f.s, f.s * .35]} />
            <meshBasicMaterial map={fogTex} transparent opacity={.28} depthWrite={false} color="#6f6b64" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
