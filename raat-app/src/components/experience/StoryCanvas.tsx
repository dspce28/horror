'use client';
import { useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import PhotoWorld, { PLANE_H, PLANE_W } from '@/components/scenes/PhotoWorld';
import { LENS_FRAG, LENS_VERT } from '@/lib/three/shaders';
import { disposeTextures } from '@/lib/three/textures';
import { anchors, stage, tick } from '@/lib/animation/stageState';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
import { live, store } from '@/lib/store';

const FOV = 40;

/**
 * Runs last every frame: advances the stage, flies the camera, renders the world into a
 * target and draws it through the lens.
 */
function CameraAndLens() {
  const { gl, scene, camera, size } = useThree();
  const setDpr = useThree((st) => st.setDpr);
  const perf = useMemo(() => ({ n: 0, sum: 0, level: 0 }), []);
  const cam = camera as THREE.PerspectiveCamera;
  const rt = useMemo(() => new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false }), []);
  const lens = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: LENS_VERT, fragmentShader: LENS_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uSpeed: { value: 0 }, uGlitch: { value: 0 }, uReduced: { value: 0 } },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const s = new THREE.Scene(); s.add(quad);
    return { mat, scene: s, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad };
  }, [rt]);
  const pos = useMemo(() => new THREE.Vector3(0, 0, 12), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const wantP = useMemo(() => new THREE.Vector3(), []);
  const wantT = useMemo(() => new THREE.Vector3(), []);

  const dpr = useThree((st) => st.viewport.dpr);
  useEffect(() => {
    rt.setSize(Math.round(size.width * dpr), Math.round(size.height * dpr));
    lens.mat.uniforms.uRes.value.set(size.width * dpr, size.height * dpr);
  }, [size, dpr, rt, lens]);
  useEffect(() => () => { rt.dispose(); lens.mat.dispose(); lens.quad.geometry.dispose(); disposeTextures(); }, [rt, lens]);

  useFrame((state, delta) => {
    const dt = Math.min(.05, delta);
    // slow device: lower the render resolution rather than stutter
    perf.sum += delta; perf.n++;
    if (perf.n === 90) {
      if (perf.sum / perf.n > 1 / 38 && perf.level < 2) { perf.level++; setDpr(perf.level === 1 ? 1 : .75); }
      perf.n = 0; perf.sum = 0;
    }
    const o = tick(performance.now(), dt);
    const f = o.frame, s = store.get();

    // frame the photo like a camera operator: zoom = dolly in, focus = where we look
    const aspect = size.width / size.height, tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const cover = aspect > PLANE_W / PLANE_H ? PLANE_W / aspect : PLANE_H;
    const hv = cover / f.zoom * .85; // visible height on the photo plane, with room for parallax
    const wv = hv * aspect;
    const cx = THREE.MathUtils.clamp((f.x - .5) * PLANE_W, -(PLANE_W - wv) / 2, (PLANE_W - wv) / 2);
    const cy = THREE.MathUtils.clamp((.5 - f.y) * PLANE_H, -(PLANE_H - hv) / 2, (PLANE_H - hv) / 2);
    const dist = hv / (2 * tan);
    // the pointer moves the camera, not the picture: near things slide past far things
    const par = s.reduced ? .15 : 1, look = hv / PLANE_H;
    wantP.set(cx + live.pointer.x * .42 * look * par + o.shakeX * .25, cy - live.pointer.y * .26 * look * par + o.shakeY * .25, dist);
    wantT.set(cx + o.shakeX * .1, cy + o.shakeY * .1, .6);
    const k = 1 - Math.exp(-dt * (f.warm ? 9 : 5));
    pos.lerp(wantP, k); tgt.lerp(wantT, k);
    cam.position.copy(pos); cam.lookAt(tgt);
    // Part 2: {N}'s name on the doll follows the photograph as the camera moves
    const nm = f.name;
    if (nm && f.nameAmt > 0) {
      cam.updateMatrixWorld();
      _v.set((nm[0] - .5) * PLANE_W, (.5 - nm[1]) * PLANE_H, .9).project(cam);
      _w.set((nm[0] - .5) * PLANE_W, (.5 - nm[1] - nm[3]) * PLANE_H, .9).project(cam);
      anchors.name.x = (_v.x * .5 + .5) * size.width; anchors.name.y = (.5 - _v.y * .5) * size.height;
      anchors.name.px = Math.abs(_v.y - _w.y) * .5 * size.height; anchors.name.rot = nm[2];
      anchors.name.amt = f.nameAmt * Math.min(1, o.light + .2);
    } else anchors.name.amt = 0;

    // world → target, then the lens to the screen
    gl.setRenderTarget(rt); gl.setClearColor('#000000', 1); gl.clear(); gl.render(scene, cam);
    gl.setRenderTarget(null);
    const u = lens.mat.uniforms;
    u.uTime.value = state.clock.elapsedTime; u.uSpeed.value = o.speed; u.uGlitch.value = o.glitch; u.uReduced.value = s.reduced ? 1 : 0;
    gl.render(lens.scene, lens.cam);
  }, 1);
  return null;
}

/** The 3D stage. Loaded with a dynamic import so the landing screen stays light. */
export default function StoryCanvas({ small }: { small: boolean }) {
  useEffect(() => { stage.small = small; }, [small]);
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={small ? [1, 1.5] : [1, 1.75]}
      flat linear
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: FOV, near: .1, far: 100, position: [0, 0, 12] }}
      aria-hidden
    >
      <PhotoWorld small={small} />
      <CameraAndLens />
    </Canvas>
  );
}
