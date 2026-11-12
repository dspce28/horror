import type * as THREE from 'three';
import type { WorldState } from '@/lib/animation/director';

/** Shared per-frame state written by the scene director and read by every 3D component. */
export const frame: { world: WorldState | null; camera: THREE.PerspectiveCamera | null; roadOffset: number; busWheel: number } = {
  world: null, camera: null, roadOffset: 0, busWheel: 0,
};
