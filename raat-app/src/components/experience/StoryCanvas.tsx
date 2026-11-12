'use client';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import SceneDirector from './SceneDirector';
import HighwayScene from '@/components/scenes/HighwayScene';
import BusScene from '@/components/scenes/BusScene';
import Characters from '@/components/scenes/Characters';
import Atmosphere from '@/components/scenes/Atmosphere';
import { useStore } from '@/lib/store';

/** The single, continuous 3D world. Loaded with a dynamic import so the landing screen is light. */
export default function StoryCanvas() {
  const quality = useStore((s) => s.quality);
  const hidden = useStore((s) => s.sceneIndex >= 7);
  return (
    <Canvas
      className="!fixed inset-0"
      style={{ position: 'fixed', inset: 0, opacity: hidden ? 0 : 1, transition: 'opacity 1.2s ease' }}
      dpr={quality === 'low' ? [1, 1.25] : [1, 1.75]}
      frameloop={hidden ? 'never' : 'always'}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 55, near: .05, far: 400, position: [3, 1.65, 14] }}
      aria-hidden
    >
      <SceneDirector />
      <Atmosphere quality={quality} />
      <HighwayScene quality={quality} />
      <BusScene />
      <Characters />
    </Canvas>
  );
}
