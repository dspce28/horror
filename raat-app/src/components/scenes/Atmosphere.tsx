'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { frame } from '@/lib/three/frame';
import { lerp } from '@/lib/animation/director';

/** Night light, fog and floating dust. Natural light only: sodium lamps, moon, tube lights. */
export default function Atmosphere({ quality }: { quality: 'high' | 'low' }) {
  const scene = useThree((s) => s.scene);
  const fog = useMemo(() => new THREE.FogExp2('#0c0d0e', .05), []);
  scene.fog = fog;
  scene.background = useMemo(() => new THREE.Color('#050506'), []);
  const amb = useRef<THREE.AmbientLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const dust = useRef<THREE.Points>(null);

  const dustGeo = useMemo(() => {
    const n = quality === 'low' ? 250 : 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 8; pos[i * 3 + 1] = Math.random() * 3.2; pos[i * 3 + 2] = (Math.random() - .5) * 12; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
  }, [quality]);

  useFrame((state, dt) => {
    const w = frame.world; if (!w) return;
    fog.density = lerp(fog.density, w.fog, Math.min(1, dt * 2));
    fog.color.setRGB(lerp(.047, .02, w.outsideVisible ? 0 : 1), lerp(.05, .02, w.outsideVisible ? 0 : 1), lerp(.055, .02, w.outsideVisible ? 0 : 1));
    if (amb.current) amb.current.intensity = .06 + w.warm * .25;
    if (moon.current) moon.current.intensity = w.outsideVisible ? .22 : 0;
    if (dust.current && frame.camera) {
      dust.current.position.copy(frame.camera.position);
      dust.current.rotation.y += dt * .02;
      dust.current.position.y = frame.camera.position.y - 1.6 + Math.sin(state.clock.elapsedTime * .2) * .1;
    }
  });

  return (
    <>
      <ambientLight ref={amb} intensity={.06} color="#b8b2a8" />
      <hemisphereLight args={['#22252c', '#0a0907', .14]} />
      <directionalLight ref={moon} position={[-30, 40, -60]} intensity={.22} color="#aeb6c4" />
      <points ref={dust} geometry={dustGeo}>
        <pointsMaterial size={.012} color="#d8cdb8" transparent opacity={.45} depthWrite={false} sizeAttenuation />
      </points>
    </>
  );
}
