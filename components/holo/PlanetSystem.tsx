"use client";

import React, { useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { AdditiveBlending, Group as ThreeGroup } from "three";
// drei removed to avoid external asset/preset loading that can abort in some runtimes
import { usePlayerStore } from "@/store/usePlayerStore";
import Planet from "@/components/holo/Planet";
import { usePlanetLayout, computePlanetLayout } from "@/lib/planetLayout";
import ReactDOM from "react-dom";
import { getEntriesByRing } from "@/lib/planetRegistry";

function InvalidateOnState() {
  const invalidate = useThree((s) => s.invalidate);
  const { mainId, hoverId, songs } = usePlayerStore();
  useEffect(() => {
    invalidate();
  }, [mainId, hoverId, songs.length, invalidate]);
  return null;
}

export default function PlanetSystem({ showAll = false }: { showAll?: boolean }) {
  const { songs, mainId, prevMainId, hoverId } = usePlayerStore();
  const focusId = showAll ? null : (mainId ?? songs[0]?.id);
  const focus = showAll ? null : (songs.find((s) => s.id === focusId) ?? songs[0]);

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
        {/* Simple lighting without external env presets */}
        <hemisphereLight skyColor={"#bfefff"} groundColor={"#0a1e24"} intensity={0.26} />
        <ambientLight intensity={0.18} />
        <directionalLight position={[3, 6, 5]} intensity={0.5} color={"#9ff"} />
        <pointLight position={[-4, 2, 4]} intensity={0.35} color={"#4ff"} />
        {/* Console-emitted cyan from below */}
        <pointLight position={[0, -1.4, 0.6]} intensity={1.1} color={"#19E3FF"} distance={9} />
        {/* Very soft magenta secondary glow for depth */}
        <pointLight position={[0.8, -1.0, -0.4]} intensity={0.26} color={"#FC54AF"} distance={7.5} />
        <InvalidateOnState />
        <ZoomOnChange />

        {/* Very shallow tilt for near-horizontal horizon line */}
        {/* Render the full system: satellites first, focus planet last; previous main becomes a moon */}
        <SystemGroup>
          <OrbitGuides />
          {showAll ? (
            <>
              {songs.map((s) => (
                <Planet key={s.id} song={s} isMain={false} isHover={hoverId === s.id} isMoon={false} />
              ))}
            </>
          ) : (
            (() => {
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
            })()
          )}
        </SystemGroup>

        {/* Subtle vertical projection sweep across the HUD area */}
        <ProjectionSweep />

        {/* Bloom skipped (package not installed). Using stronger glow shells instead. */}


        {/* Controls removed; system slowly orbits programmatically */}
        <OverlapManager />
      </Canvas>
    </div>
  );
}

function OrbitGuides() {
  const { songs } = usePlayerStore();
  const layout = React.useMemo(() => computePlanetLayout(songs as any), [songs]);
  const rings = React.useMemo(() => {
    const map = new Map<number, { r: number; tiltDeg: number }>();
    for (const id in layout) {
      const l = layout[id];
      const prev = map.get(l.ringIndex);
      if (!prev || l.orbitRadius > prev.r) map.set(l.ringIndex, { r: l.orbitRadius, tiltDeg: l.tiltDeg });
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [layout]);
  return (
    <group>
      {rings.map((r, i) => (
        <group key={i} rotation={[-Math.PI / 2 + (r.tiltDeg * Math.PI/180), 0, 0]}>
          <mesh>
            <ringGeometry args={[Math.max(0, r.r - 0.01), r.r + 0.01, 96]} />
            <meshBasicMaterial color={'#19E3FF'} transparent opacity={0.12} depthWrite={false} blending={AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SystemGroup({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<ThreeGroup>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useFrame((_, dt) => {
    if (!ref.current || reduced) return;
    // slow idle auto-orbit around Y
    ref.current.rotation.y += 0.02 * dt;
  });
  return (
    <group ref={ref} rotation={[0.08, -0.04, 0]} position={[0, 0.35, 0]}>
      {children}
    </group>
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
    (camera as any).position.z = base.current.z - (base.current.z - closeZ) * bell;
    (camera as any).fov = base.current.fov - (base.current.fov - closeFov) * bell;
    (camera as any).updateProjectionMatrix();
    anim.current.t += dt;
    if (anim.current.t >= anim.current.d) {
      anim.current.active = false;
      (camera as any).position.z = base.current.z;
      (camera as any).fov = base.current.fov;
      (camera as any).updateProjectionMatrix();
    } else {
      // request next frame while animating (frameloop is demand)
      invalidate();
    }
  });
  return null;
}

function OverlapManager() {
  const { size, camera } = useThree();
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toScreen = (p: any) => {
    const vec = p.clone().project(camera);
    return { x: (vec.x * 0.5 + 0.5) * size.width, y: ( -vec.y * 0.5 + 0.5) * size.height };
  };
  useFrame(() => {
    if (reduced) return;
    const byRing = getEntriesByRing();
    byRing.forEach((list) => {
      if (list.length < 2) return;
      // Snapshot angles and positions
      const snapshot = list.map((e) => {
        const wp = e.getWorldPosition();
        return { e, theta: e.getAngle(), pos: toScreen(wp) };
      });
      // Sort by angle within ring for nearest-neighbor checks
      snapshot.sort((a, b) => a.theta - b.theta);
      const dMin = Math.min(size.width, size.height) < 640 ? 22 : 28; // px
      for (let i = 0; i < snapshot.length; i++) {
        const a = snapshot[i];
        const b = snapshot[(i + 1) % snapshot.length]; // neighbor with wrap
        const dx = a.pos.x - b.pos.x;
        const dy = a.pos.y - b.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < dMin) {
          const nudge = 0.01;
          // push apart by adjusting phases in opposite directions
          a.e.addPhase(+nudge);
          b.e.addPhase(-nudge);
        }
      }
    });
  });
  return null;
}
