'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { SCENES, cueAt } from '@/data/stories/last-passenger';
import { cameraShot, world, type V3 } from '@/lib/animation/director';
import { frame } from '@/lib/three/frame';
import { live, store } from '@/lib/store';

const GAME_EYE: V3 = [1.7, 2.3, -13.3];

/** Runs first every frame: decides the world state, light flicker and camera. */
export default function SceneDirector() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  frame.camera = camera;
  const tgt = useMemo(() => new THREE.Vector3(0, 1.5, -40), []);
  const want = useMemo(() => new THREE.Vector3(), []);
  const wantT = useMemo(() => new THREE.Vector3(), []);
  const nextDip = useMemo(() => ({ t: 0, until: 0 }), []);

  useFrame((state, dt) => {
    const s = store.get();
    const scene = SCENES[live.sceneIndex];
    const t = live.local;
    const w = world(scene.id, t, live.lookBacks);
    frame.world = w;
    const now = state.clock.elapsedTime;
    live.time = now;

    // tube-light flicker
    let f = 1;
    if (scene.id === 'inside' || scene.id === 'driver') {
      if (now > nextDip.t) { nextDip.until = now + .04 + Math.random() * .12; nextDip.t = now + 1.5 + Math.random() * 4; }
      if (now < nextDip.until) f = .25 + Math.random() * .3;
      if (scene.id === 'inside' && t > .84 && t < .93) f = Math.random() > .5 ? 1.2 : .05;
    } else if (scene.id === 'encounter') {
      f = t > .93 ? .55 : Math.random() > .35 ? .4 + Math.random() * .9 : .03;
    } else if (scene.id === 'twist') f = 1.05;
    if (s.reduced) f = Math.max(.6, Math.min(1, f));
    live.flicker = f;

    // camera
    const dts = Math.min(dt, .05);
    let fov: number;
    if (s.game === 'hunt') {
      want.set(...GAME_EYE);
      wantT.set(GAME_EYE[0] + Math.sin(live.gameYaw), GAME_EYE[1] + Math.sin(live.gamePitch), GAME_EYE[2] - Math.cos(live.gameYaw));
      camera.position.lerp(want, 1 - Math.exp(-dts * 6));
      tgt.lerp(wantT, 1 - Math.exp(-dts * 10));
      fov = 62;
    } else {
      const cue = cueAt(scene, t);
      const shot = cameraShot(scene.id, t, cue ? cue.who : null);
      const par = s.reduced ? .05 : .22;
      want.set(shot.pos[0] + live.pointer.x * par * .4, shot.pos[1] - live.pointer.y * par * .25, shot.pos[2]);
      wantT.set(shot.tgt[0] + live.pointer.x * par * 2.2, shot.tgt[1] - live.pointer.y * par * 1.2, shot.tgt[2]);
      const k = shot.snap ? 9 : 4;
      camera.position.lerp(want, 1 - Math.exp(-dts * k));
      tgt.lerp(wantT, 1 - Math.exp(-dts * k));
      fov = shot.fov;
    }
    live.shake = Math.max(0, live.shake - dts * 1.6);
    const sh = s.reduced ? 0 : (w.shake + live.shake) * .045;
    camera.lookAt(tgt.x + (Math.random() - .5) * sh, tgt.y + (Math.random() - .5) * sh, tgt.z);
    if (Math.abs(camera.fov - fov) > .01) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-dts * 4)); camera.updateProjectionMatrix(); }
  }, -1);
  return null;
}
