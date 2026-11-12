'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUS, DRIVER } from '@/lib/animation/director';
import { driverBack, driverFace, ghostBody, ghostHead } from '@/lib/three/textures';
import { useAssetTexture } from '@/hooks/useAssetTexture';
import { frame } from '@/lib/three/frame';

/** Hair sways from the bottom up; the top of the image stays fixed. */
function swayMaterial(map: THREE.Texture, uniforms: { uTime: { value: number }; uSway: { value: number } }) {
  const m = new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: .25, roughness: .9, side: THREE.DoubleSide, emissive: new THREE.Color('#2a2826'), emissiveMap: map, emissiveIntensity: .35 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uSway = uniforms.uSway;
    sh.vertexShader = 'uniform float uTime;\nuniform float uSway;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nfloat hang = 1.0 - uv.y;\ntransformed.x += sin(uTime * 1.6 + position.y * 5.0) * uSway * 0.05 * hang * hang;\ntransformed.z += cos(uTime * 1.1 + position.y * 3.0) * uSway * 0.03 * hang;',
    );
  };
  return m;
}

export default function Characters() {
  const bodyTex = useAssetTexture('ghostBody', ghostBody);
  const headTex = useAssetTexture('ghostHead', () => ghostHead(false));
  const lookTex = useAssetTexture('ghostHeadLook', () => ghostHead(true));
  const dBack = useAssetTexture('driverBack', driverBack);
  const dFace = useAssetTexture('driverFace', () => driverFace(false));

  const u = useMemo(() => ({ uTime: { value: 0 }, uSway: { value: .2 } }), []);
  const bodyMat = useMemo(() => swayMaterial(bodyTex, u), [bodyTex, u]);
  const headMat = useMemo(() => swayMaterial(headTex, u), [headTex, u]);

  const ghost = useRef<THREE.Group>(null);
  const headPivot = useRef<THREE.Group>(null);
  const driverHead = useRef<THREE.Mesh>(null);
  const driverMat = useRef<THREE.MeshStandardMaterial>(null);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const w = frame.world, cam = frame.camera; if (!w || !ghost.current) return;
    const g = w.ghost;
    u.uTime.value = state.clock.elapsedTime; u.uSway.value = g.sway;
    // she stays inside the bus while it approaches
    const busZ = w.busFront - BUS.front;
    ghost.current.visible = g.visible;
    const base = BUS.floor + (g.seated ? -.42 : g.y) + (g.seated ? 0 : Math.sin(state.clock.elapsedTime * 1.3) * .02);
    ghost.current.position.set(g.x, base, g.z + busZ);
    if (cam) { v.copy(cam.position).sub(ghost.current.position); ghost.current.rotation.y = Math.atan2(v.x, v.z); }
    const wantMap = g.look ? lookTex : headTex;
    if (headMat.map !== wantMap) { headMat.map = wantMap; headMat.emissiveMap = wantMap; headMat.needsUpdate = true; }
    if (headPivot.current) headPivot.current.rotation.z = g.headRot + (g.headRot > 0 ? Math.sin(state.clock.elapsedTime * 9) * .03 : 0);

    // driver: a card flip reads as the head turning; the face swaps in halfway
    if (driverHead.current && driverMat.current) {
      driverHead.current.position.z = DRIVER.z + busZ;
      const t = w.driverTurn;
      driverHead.current.scale.x = Math.max(.08, Math.abs(Math.cos(t * Math.PI)));
      const want = t > .5 ? dFace : dBack;
      if (driverMat.current.map !== want) { driverMat.current.map = want; driverMat.current.needsUpdate = true; }
    }
  });

  return (
    <group>
      <group ref={ghost}>
        <mesh position={[0, .78, 0]} material={bodyMat}><planeGeometry args={[.78, 1.56, 1, 12]} /></mesh>
        <group ref={headPivot} position={[0, 1.5, 0]}>
          <mesh position={[0, .12, .01]} material={headMat}><planeGeometry args={[.46, .69, 1, 12]} /></mesh>
        </group>
      </group>
      <mesh ref={driverHead} position={[DRIVER.x, DRIVER.head - .12, DRIVER.z]} rotation-y={Math.PI}>
        <planeGeometry args={[.62, .78]} />
        <meshStandardMaterial ref={driverMat} map={dBack} color="#9a948c" transparent alphaTest={.2} roughness={.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
