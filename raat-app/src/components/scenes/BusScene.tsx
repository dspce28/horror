'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUS, DOOR_Z, lerp } from '@/lib/animation/director';
import { glow, grime, labelTexture, rexine } from '@/lib/three/textures';
import { frame } from '@/lib/three/frame';
import { live } from '@/lib/store';

const W = BUS.w, L = BUS.l, H = BUS.h, F = BUS.floor;
const HW = W / 2, HL = L / 2;
const DOOR_LOCAL = DOOR_Z - (BUS.front - HL); // door centre in bus-local z
const ROWS = Array.from({ length: 11 }, (_, i) => HL - 2.2 - i * .8);

export default function BusScene() {
  const red = useMemo(() => grime('#7c1d17', .5), []);
  const cream = useMemo(() => grime('#cdbf9f', .45), []);
  const metal = useMemo(() => grime('#8f8a7c', .5), []);
  const seat = useMemo(rexine, []);
  const head = useMemo(() => glow('255,236,200'), []);
  const tail = useMemo(() => glow('255,40,30'), []);
  const board = useMemo(() => labelTexture('અમદાવાદ · AHMEDABAD', { w: 1024, h: 128 }), []);
  const plate = useMemo(() => labelTexture('GJ-1-Z-1313', { w: 512, h: 112, bg: '#e8dfc6', fg: '#141210', font: 'bold 70px monospace' }), []);
  useEffect(() => () => { [red, cream, metal, seat, head, tail, board, plate].forEach((t) => t.dispose()); }, [red, cream, metal, seat, head, tail, board, plate]);

  const bus = useRef<THREE.Group>(null);
  const door = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const tubes = useRef<THREE.MeshStandardMaterial>(null);
  const tubeLights = useRef<(THREE.PointLight | null)[]>([]);
  const spotL = useRef<THREE.SpotLight>(null);
  const spotR = useRef<THREE.SpotLight>(null);
  const spotTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, .2, 40); return o; }, []);

  const seatBase = useRef<THREE.InstancedMesh>(null);
  const seatBack = useRef<THREE.InstancedMesh>(null);
  const rails = useRef<THREE.InstancedMesh>(null);

  // seats: a 3-seater on the driver side (-x), a 2-seater on the door side (+x)
  const seatSpecs = useMemo(() => {
    const out: { x: number; w: number; z: number }[] = [];
    ROWS.forEach((z) => { out.push({ x: -HW + .62, w: 1.0, z }); out.push({ x: HW - .45, w: .75, z }); });
    return out;
  }, []);

  useEffect(() => {
    const o = new THREE.Object3D();
    seatSpecs.forEach((s, i) => {
      o.position.set(s.x, F + .45, s.z); o.scale.set(s.w, .14, .48); o.rotation.set(0, 0, 0); o.updateMatrix(); seatBase.current?.setMatrixAt(i, o.matrix);
      o.position.set(s.x, F + .82, s.z - .25); o.scale.set(s.w, .7, .1); o.rotation.set(-.12, 0, 0); o.updateMatrix(); seatBack.current?.setMatrixAt(i, o.matrix);
      o.position.set(s.x, F + 1.2, s.z - .3); o.scale.set(s.w, .035, .035); o.rotation.set(0, 0, 0); o.updateMatrix(); rails.current?.setMatrixAt(i, o.matrix);
    });
    [seatBase, seatBack, rails].forEach((r) => { if (r.current) r.current.instanceMatrix.needsUpdate = true; });
  }, [seatSpecs]);

  useFrame((state, dt) => {
    const w = frame.world; if (!w || !bus.current) return;
    bus.current.visible = w.busFront > -380;
    bus.current.position.set(BUS.x, 0, w.busFront - HL);
    // gentle body roll while driving
    const t = state.clock.elapsedTime;
    const moving = Math.max(w.busSpeed, w.roadSpeed) / 14;
    bus.current.rotation.z = Math.sin(t * 1.3) * .006 * moving;
    bus.current.position.y = Math.sin(t * 7.1) * .006 * moving;
    if (door.current) door.current.rotation.y = -w.door * 1.45;
    frame.busWheel += Math.max(w.busSpeed, w.roadSpeed) * Math.min(dt, .05) / .5;
    if (wheels.current) wheels.current.children.forEach((c) => { c.rotation.x = frame.busWheel; });
    // tube lights: flicker comes from the FX loop; colour warms for the comedy
    const lvl = w.interior * live.flicker;
    if (tubes.current) {
      tubes.current.emissiveIntensity = 2.2 * lvl;
      tubes.current.emissive.setRGB(lerp(.82, 1, w.warm), lerp(.95, .82, w.warm), lerp(.85, .6, w.warm));
    }
    tubeLights.current.forEach((l, i) => { if (!l) return; l.intensity = (i === 0 ? 7 : 5) * lvl * (1 + w.warm * .5); l.color.setRGB(lerp(.85, 1, w.warm), lerp(.95, .8, w.warm), lerp(.88, .6, w.warm)); });
    const hl = w.busFront > -380 ? 1 : 0;
    if (spotL.current) spotL.current.intensity = 260 * hl;
    if (spotR.current) spotR.current.intensity = 260 * hl;
  });

  const wall = (props: { p: [number, number, number]; s: [number, number, number]; map?: THREE.Texture; color?: string }) => (
    <mesh position={props.p}>
      <boxGeometry args={props.s} />
      <meshStandardMaterial map={props.map} color={props.color ?? '#ffffff'} roughness={.85} metalness={.15} side={THREE.DoubleSide} />
    </mesh>
  );

  // window pillars along each side, leaving a gap for the door on +x
  const pillars: number[] = []; for (let z = -HL + .3; z <= HL - .1; z += 1.05) pillars.push(z);
  const doorA = DOOR_LOCAL - .55, doorB = DOOR_LOCAL + .55;

  return (
    <group ref={bus}>
      <primitive object={spotTarget} />
      {/* floor, roof */}
      {wall({ p: [0, F - .05, 0], s: [W, .1, L], color: '#2b2824' })}
      {wall({ p: [0, H - .05, 0], s: [W, .1, L], map: cream, color: '#bdb39c' })}
      {/* driver side (-x) */}
      {wall({ p: [-HW, .95, 0], s: [.06, 1.3, L], map: red })}
      {wall({ p: [-HW, 2.55, 0], s: [.06, .2, L], map: cream })}
      {wall({ p: [-HW, 2.85, 0], s: [.06, .4, L], map: red })}
      {pillars.map((z, i) => <group key={`l${i}`}>{wall({ p: [-HW, 2.0, z], s: [.07, .9, .12], map: metal })}</group>)}
      {/* door side (+x), split around the door */}
      {wall({ p: [HW, .95, (-HL + doorA) / 2], s: [.06, 1.3, doorA + HL], map: red })}
      {wall({ p: [HW, .95, (doorB + HL) / 2], s: [.06, 1.3, HL - doorB], map: red })}
      {wall({ p: [HW, 2.55, (-HL + doorA) / 2], s: [.06, .2, doorA + HL], map: cream })}
      {wall({ p: [HW, 2.85, 0], s: [.06, .4, L], map: red })}
      {pillars.filter((z) => z < doorA - .05 || z > doorB + .05).map((z, i) => <group key={`r${i}`}>{wall({ p: [HW, 2.0, z], s: [.07, .9, .12], map: metal })}</group>)}
      {/* cream stripe outside */}
      {wall({ p: [-HW - .01, 1.3, 0], s: [.02, .14, L], color: '#d8cba8' })}
      {/* rear */}
      {wall({ p: [0, .95, -HL], s: [W, 1.3, .06], map: red })}
      {wall({ p: [0, 2.7, -HL], s: [W, .7, .06], map: red })}
      {/* front: lower panel, board */}
      {wall({ p: [0, .9, HL], s: [W, 1.2, .06], map: red })}
      <mesh position={[0, 2.9, HL + .04]}><planeGeometry args={[W * .8, .22]} /><meshStandardMaterial map={board} emissive="#ffffff" emissiveMap={board} emissiveIntensity={1.4} /></mesh>
      <mesh position={[0, .55, HL + .04]}><planeGeometry args={[.7, .16]} /><meshStandardMaterial map={plate} roughness={.6} /></mesh>
      {/* windows: dirty glass */}
      {([[-HW, 0, L, 'x'], [HW, 0, L, 'x'], [0, HL, W, 'z']] as const).map(([x, z, len, axis], i) => (
        <mesh key={i} position={[x, 2.0 + (axis === 'z' ? .05 : 0), z]} rotation-y={axis === 'x' ? Math.PI / 2 : 0}>
          <planeGeometry args={[len, axis === 'z' ? 1.1 : .9]} />
          <meshStandardMaterial color="#1a1d1c" map={metal} transparent opacity={axis === 'z' ? .18 : .32} roughness={.15} metalness={.7} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {/* the door leaf, hinged at its front edge */}
      <group position={[HW, 0, doorB]} ref={door}>
        <mesh position={[0, (F + 2.45) / 2 + .1, -.55]}>
          <boxGeometry args={[.05, 2.45 - F + .2, 1.08]} />
          <meshStandardMaterial map={red} color="#d0b0a0" roughness={.8} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {wall({ p: [HW + .25, .42, DOOR_LOCAL], s: [.5, .08, 1.0], color: '#3a352e' })}
      {/* wheels */}
      <group ref={wheels}>
        {[[-HW + .05, 3.7], [HW - .05, 3.7], [-HW + .05, -3.6], [HW - .05, -3.6]].map(([x, z], i) => (
          <mesh key={i} position={[x, .5, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.5, .5, .3, 18]} /><meshStandardMaterial color="#121212" roughness={.9} /></mesh>
        ))}
      </group>
      {/* headlights and tail lights */}
      {[-.85, .85].map((x, i) => (
        <group key={i}>
          <mesh position={[x, .95, HL + .05]}><circleGeometry args={[.14, 16]} /><meshStandardMaterial emissive="#fff3d6" emissiveIntensity={4} color="#fff" /></mesh>
          <sprite position={[x, .95, HL + .25]} scale={[3.2, 3.2, 1]}><spriteMaterial map={head} transparent blending={THREE.AdditiveBlending} depthWrite={false} fog={false} /></sprite>
          <mesh position={[x, 1.0, -HL - .04]} rotation-y={Math.PI}><circleGeometry args={[.09, 12]} /><meshStandardMaterial emissive="#ff2a1a" emissiveIntensity={2.5} color="#600" /></mesh>
          <sprite position={[x, 1.0, -HL - .2]} scale={[1.1, 1.1, 1]}><spriteMaterial map={tail} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={.7} /></sprite>
        </group>
      ))}
      <spotLight ref={spotL} position={[-.85, 1.0, HL + .2]} target={spotTarget} angle={.42} penumbra={.6} distance={70} decay={1.5} color="#fff0d0" />
      <spotLight ref={spotR} position={[.85, 1.0, HL + .2]} target={spotTarget} angle={.42} penumbra={.6} distance={70} decay={1.5} color="#fff0d0" />

      {/* interior: seats, rails, racks, tubes, driver cabin */}
      <instancedMesh ref={seatBase} args={[undefined, undefined, seatSpecs.length]}><boxGeometry /><meshStandardMaterial map={seat} roughness={.55} color="#d07060" /></instancedMesh>
      <instancedMesh ref={seatBack} args={[undefined, undefined, seatSpecs.length]}><boxGeometry /><meshStandardMaterial map={seat} roughness={.55} color="#d07060" /></instancedMesh>
      <instancedMesh ref={rails} args={[undefined, undefined, seatSpecs.length]}><boxGeometry /><meshStandardMaterial color="#9a978e" metalness={.8} roughness={.35} /></instancedMesh>
      {[-HW + .35, HW - .35].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 2.55, -.5]}><boxGeometry args={[.5, .04, L - 2]} /><meshStandardMaterial color="#5f5a50" metalness={.6} roughness={.5} /></mesh>
          <mesh position={[x + (i ? -.24 : .24), 2.62, -.5]}><boxGeometry args={[.03, .12, L - 2]} /><meshStandardMaterial color="#5f5a50" metalness={.6} roughness={.5} /></mesh>
        </group>
      ))}
      {[3.2, .6, -2.0, -4.2].map((z, i) => (
        <mesh key={i} position={[0, H - .13, z]}><boxGeometry args={[.08, .05, 1.2]} /><meshStandardMaterial ref={i === 0 ? tubes : undefined} color="#e8eee4" emissive="#d8f0dc" emissiveIntensity={2} /></mesh>
      ))}
      <pointLight ref={(l) => { tubeLights.current[0] = l; }} position={[0, H - .35, 1.6]} distance={9} decay={1.8} />
      <pointLight ref={(l) => { tubeLights.current[1] = l; }} position={[0, H - .35, -3.2]} distance={9} decay={1.8} />
      {/* driver cabin partition, steering wheel, warm dashboard */}
      {wall({ p: [-HW + .65, F + .6, HL - 1.25], s: [1.3, 1.2, .05], color: '#4a4338' })}
      <mesh position={[-HW + .65, F + 1.05, HL - .55]} rotation-x={-1.1}><torusGeometry args={[.24, .025, 8, 24]} /><meshStandardMaterial color="#15130f" /></mesh>
      <mesh position={[-HW + .65, F + .75, HL - .3]}><boxGeometry args={[1.2, .25, .3]} /><meshStandardMaterial color="#1f1b16" emissive="#ff8a30" emissiveIntensity={.12} /></mesh>
      <pointLight position={[-HW + .65, F + 1.0, HL - .4]} color="#ff9440" intensity={1.2} distance={2.4} />
      {/* rear door-side hand pole */}
      <mesh position={[HW - .9, (F + H) / 2, doorA - .05]}><cylinderGeometry args={[.02, .02, H - F, 8]} /><meshStandardMaterial color="#b0ada3" metalness={.9} roughness={.3} /></mesh>
    </group>
  );
}
