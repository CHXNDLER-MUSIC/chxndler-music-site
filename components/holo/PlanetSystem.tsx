"use client";

import React, { useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import { Html, OrbitControls, Environment } from "@react-three/drei";
import { usePlayerStore } from "@/store/usePlayerStore";
import Planet from "@/components/holo/Planet";

function InvalidateOnState() {
  const invalidate = useThree((s) => s.invalidate);
  const { mainId, hoverId, songs } = usePlayerStore();
  useEffect(() => {
    invalidate();
  }, [mainId, hoverId, songs.length, invalidate]);
  return null;
}

export default function PlanetSystem() {
  const { songs, mainId, prevMainId, hoverId } = usePlayerStore();
  const focusId = mainId ?? songs[0]?.id;
  const focus = songs.find((s) => s.id === focusId) ?? songs[0];

  return (
    // Fill the parent (HUDPanel provides a fixed-height relative container)
    <div className="absolute inset-0 holo-inset">
      <Canvas
        className="absolute inset-0"
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
        // Pull the camera back and widen FOV so the full system fits
        // Much more horizontal viewpoint: lower camera height and pull back slightly
        camera={{ position: [0.2, 0.6, 15.5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        frameloop="demand"
      >
        {/* Transparent background; parent provides holographic blue backdrop */}
        {/* HDR environment for realistic reflections */}
        <Environment preset="sunset" background={false} blur={0.3} />
        <hemisphereLight skyColor={"#bfefff"} groundColor={"#0a1e24"} intensity={0.35} />
        <ambientLight intensity={0.22} />
        <directionalLight position={[3, 6, 5]} intensity={0.6} color={"#9ff"} />
        <pointLight position={[-4, 2, 4]} intensity={0.4} color={"#4ff"} />
        {/* Console-emitted cyan from below */}
        <pointLight position={[0, -1.4, 0.6]} intensity={1.3} color={"#19E3FF"} distance={9} />
        {/* Very soft magenta secondary glow for depth */}
        <pointLight position={[0.8, -1.0, -0.4]} intensity={0.3} color={"#FC54AF"} distance={7.5} />
        <InvalidateOnState />
        <ZoomOnChange />

        {/* Very shallow tilt for near-horizontal horizon line */}
        {/* Render the full system: satellites first, focus planet last; previous main becomes a moon */}
        <group rotation={[0.08, -0.04, 0]} position={[0, 0.35, 0]}>
          {(() => {
            const satellites = songs.filter((s) => s.id !== focusId);
            return (
              <>
                {satellites.map((s) => (
                  <Planet key={s.id} song={s} isMain={false} isHover={hoverId === s.id} isMoon={false} />
                ))}
                {/* Never apply hover inflation to main planet to avoid perceived zoom-in */}
                {focus ? <Planet key={`main-${focus.id}`} song={focus} isMain={true} isHover={false} isMoon={false} /> : null}
                {prevMainId && prevMainId !== focusId ? (
                  (() => {
                    const prev = songs.find((s) => s.id === prevMainId);
                    return prev ? <Planet key={`moon-${prev.id}`} song={prev} isMain={false} isHover={prev.id === hoverId} isMoon={true} /> : null;
                  })()
                ) : null}
              </>
            );
          })()}
        </group>

        {/* Subtle vertical projection sweep across the HUD area */}
        <ProjectionSweep />

        {/* Bloom skipped (package not installed). Using stronger glow shells instead. */}


        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={[0, 0.35, 0]} />
      </Canvas>
    </div>
  );
}

function ProjectionSweep() {
  // A tall, faint vertical stripe that sweeps left-to-right in front of the system
  const matRef = React.useRef<any>(null);
  useFrame((state, dt) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += dt;
  });
  const uniforms = React.useMemo(() => ({ uTime: { value: 0 } }), []);
  const vs = `
    varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `;
  const fs = `
    uniform float uTime; varying vec2 vUv;
    // narrow gaussian band moving along x
    float gaussian(float x, float m, float s){ float d = (x - m)/s; return exp(-0.5*d*d); }
    void main(){
      // center stripe position cycles slowly
      float pos = fract(uTime * 0.08);
      // map uv.x from 0..1; widen domain by repeating 2x for soft entry/exit
      float x = vUv.x;
      float band = gaussian(x, pos, 0.06) * 0.9 + gaussian(x, pos*0.7, 0.02) * 0.5;
      float alpha = band * 0.16; // fainter
      vec3 col = vec3(0.65, 1.0, 1.0) * band; // cyan-white
      gl_FragColor = vec4(col, alpha);
    }
  `;
  return (
    <mesh position={[0, 0.35, 0.2]}>
      <planeGeometry args={[9, 6, 1, 1]} />
      {/* @ts-ignore */}
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={vs} fragmentShader={fs} transparent blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function ZoomOnChange() {
  // Subtle camera dolly + FOV ease when main song changes
  const { mainId } = usePlayerStore();
  const { camera, invalidate } = useThree();
  const base = React.useRef({ z: 15.5, fov: 40 });
  const anim = React.useRef<{ t: number; d: number; active: boolean }>({ t: 0, d: 0.8, active: false });

  React.useEffect(() => {
    // restart zoom animation on main change
    anim.current.t = 0;
    anim.current.active = true;
    // kick a few frames to ensure animation starts in demand mode
    invalidate();
    invalidate();
  }, [mainId, invalidate]);

  useFrame((state, dt) => {
    if (!anim.current.active) return;
    // progress 0..1 with ease in/out
    const t = Math.min(1, anim.current.t / anim.current.d);
    const ease = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    // dolly closer at mid, then return
    const closeZ = 13.3;
    const closeFov = 36;
    // use a bell curve around 0.5
    const bell = Math.sin(Math.PI * ease);
    camera.position.z = base.current.z - (base.current.z - closeZ) * bell;
    camera.fov = base.current.fov - (base.current.fov - closeFov) * bell;
    camera.updateProjectionMatrix();
    anim.current.t += dt;
    if (anim.current.t >= anim.current.d) {
      anim.current.active = false;
      camera.position.z = base.current.z;
      camera.fov = base.current.fov;
      camera.updateProjectionMatrix();
    } else {
      // request next frame while animating (frameloop is demand)
      invalidate();
    }
  });
  return null;
}
