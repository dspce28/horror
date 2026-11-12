'use client';
import * as THREE from 'three';

// Textures load once and stay cached for the session; scenes ask by URL every frame.
const cache = new Map<string, THREE.Texture | null>();
const loader = new THREE.TextureLoader();

export function texture(url: string | null, color = true): THREE.Texture | null {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;
  cache.set(url, null);
  loader.load(url, (t) => {
    // colours pass straight through (no colour management), so photos look exactly as exported
    t.colorSpace = THREE.NoColorSpace; void color;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.anisotropy = 4; t.needsUpdate = true;
    cache.set(url, t);
  });
  return null;
}

export function disposeTextures() { cache.forEach((t) => t?.dispose()); cache.clear(); }

export function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,240,215,1)'); r.addColorStop(.18, 'rgba(255,222,175,.45)'); r.addColorStop(.5, 'rgba(255,205,150,.08)'); r.addColorStop(1, 'rgba(255,205,150,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
