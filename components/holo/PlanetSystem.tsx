"use client";

import React, { useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { AdditiveBlending, Group as ThreeGroup } from "three";
// drei removed to avoid external asset/preset loading that can abort in some runtimes
import { playerStore } from "@/store/usePlayerStore";
import Planet from "@/components/holo/Planet";
import HeartPlanet from "@/components/holo/HeartPlanet";
import { computePlanetLayout } from "@/lib/planetLayout";
import { getEntriesByRing } from "@/lib/planetRegistry";

function InvalidateOnState() {
  const invalidate = useThree((s) => s.invalidate);
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { mainId, hoverId, songs, planetsVisible } = storeSnap;
  useEffect(() => {
    // Throttle invalidation to prevent excessive re-renders
    const timeout = setTimeout(() => {
      invalidate();
    }, 50);
    return () => clearTimeout(timeout);
  }, [mainId, hoverId, songs.length, planetsVisible]); // Include planetsVisible to trigger re-render when planets are toggled
  return null;
}

export default function PlanetSystem({ showAll = false, hideUntilPlaying = false }: { showAll?: boolean; hideUntilPlaying?: boolean }) {
  console.log("🌍 PlanetSystem rendering with showAll:", showAll, "songs count:", playerStore.getState().songs.length);
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { songs, mainId, prevMainId, hoverId, planetsVisible } = storeSnap as any;
  const focusId = showAll ? null : (mainId ?? songs[0]?.id);
  const focus = showAll ? null : (songs.find((s) => s.id === focusId) ?? songs[0]);
  
  // Context-aware planet visibility management
  // Note: We don't automatically show planets on homepage anymore
  // Let the user's toggle state (from start button) persist across views
  
  console.log("🌍 PlanetSystem state:", { showAll, planetsVisible, mainId, focusId, hideUntilPlaying, songsCount: songs.length });
  console.log("🌍 PlanetSystem songs:", songs.map(s => s.id));
  
  

  return (
    // Fill the parent (HUDPanel provides a fixed-height relative container)
    // Fade logic: when a song is selected (showAll=false) but not yet playing, hide the planets.
    <div 
      className="absolute inset-0"
      style={{
        opacity: (!showAll && hideUntilPlaying) ? 0 : 1,
        transition: 'opacity 400ms ease-in-out'
      }}
    >
      <Canvas
        className="absolute inset-0"
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
        // Pull the camera back and widen FOV so the full system fits
        // Much more horizontal viewpoint: lower camera height and pull back slightly
        // Zoom out a touch more on the homepage (showAll=true)
        // Zoom out a bit more on homepage (showAll) so the full system fits comfortably
        camera={{ position: [0.2, -0.2, showAll ? 100 : 20], fov: showAll ? 92 : 48 }}
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
        <ZoomOnChange focusId={focusId} />

        {/* Heart planet at the center - always on homepage (showAll) */}
        {showAll && <HeartPlanet />}
        
        {/* Removed debug helper sphere that was visible on the homepage */}

        {/* Very shallow tilt for near-horizontal horizon line */}
        {/* Render the full system: satellites first, focus planet last; previous main becomes a moon */}
        {/* Enlarge full-system view on homepage so it spans the blue display width */}
        <group scale={showAll ? 1.45 : 1}>
        <SystemGroup>
          {/* Orbit guides on homepage regardless of planetsVisible */}
          {showAll ? <OrbitGuides /> : null}
          {/* Show planets based on mode and visibility state */}
          {(() => {
            console.log("🌍 PlanetSystem rendering decision:", { planetsVisible, showAll, songsCount: songs.length });
            // On homepage (showAll), force planets visible regardless of planetsVisible state
            if (!showAll && !planetsVisible) {
              console.log("🌍 PlanetSystem: Not rendering planets - planetsVisible is false and not homepage");
              return null;
            }
            if (showAll) {
              console.log("🌍 PlanetSystem: Rendering", songs.length, "planets for homepage");
              return (
                <>
                  {songs.map((s, index) => {
                    console.log(`🌍 Rendering planet ${index + 1}/${songs.length}:`, s.id, s.title);
                    return (
                      <Planet key={s.id} song={s} isMain={false} isHover={hoverId === s.id} isMoon={false} isMuted={false} ringBaseOverride={44} />
                    );
                  })}
                </>
              );
            } else {
              // Individual song mode: show only the focused planet
              console.log("🌍 PlanetSystem: Individual song mode, focusId:", focusId);
              return focusId && songs.find(s => s.id === focusId) ? (
                <Planet 
                  key={focusId} 
                  song={songs.find(s => s.id === focusId)!} 
                  isMain={true} 
                  isHover={hoverId === focusId} 
                  isMoon={false} 
                  isMuted={false} 
                  ringBaseOverride={20} 
                />
              ) : null;
            }
          })()}
        </SystemGroup>
        </group>

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
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { songs } = storeSnap as any;
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
    <group ref={ref} rotation={[0.08, -0.04, 0]} position={[0, 0.1, 0]}>
      {children}
    </group>
  );
}

function ProjectionSweep() {
  // A tall, faint vertical stripe that sweeps left-to-right in front of the system
  const matRef = React.useRef<any>(null);
  useFrame((_, dt) => {
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
    <mesh position={[0, 0.1, 0.2]}>
      <planeGeometry args={[9, 6, 1, 1]} />
      {/* @ts-ignore */}
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={vs} fragmentShader={fs} transparent blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function ZoomOnChange({ focusId }: { focusId: string | null }) {
  // Subtle camera dolly + FOV ease when focus song changes
  const { camera, invalidate } = useThree();
  // Use different base values based on showAll mode - access via props context
  const isShowAll = focusId === null;
  // Match Canvas camera defaults; give more room in showAll to see every planet
  const base = React.useRef({ z: isShowAll ? 100 : 35, fov: isShowAll ? 92 : 65 });
  const anim = React.useRef<{ t: number; d: number; active: boolean }>({ t: 0, d: 0.8, active: false });

  React.useEffect(() => {
    // Update base values based on current mode
    base.current = { z: isShowAll ? 84 : 35, fov: isShowAll ? 85 : 65 };
    
    // Only restart zoom animation if we have a focusId (not in showAll/home mode)
    if (focusId) {
      anim.current.t = 0;
      anim.current.active = true;
      // kick a few frames to ensure animation starts in demand mode
      invalidate();
      invalidate();
    } else {
      // If no focusId (home mode), ensure camera is at base position
      anim.current.active = false;
      const camera_: any = camera;
      camera_.position.z = base.current.z;
      camera_.fov = base.current.fov;
      camera_.updateProjectionMatrix();
      invalidate();
    }
  }, [focusId, isShowAll, invalidate, camera]);

  useFrame((_, dt) => {
    if (!anim.current.active) return;
    // progress 0..1 with ease in/out
    const t = Math.min(1, anim.current.t / anim.current.d);
    const ease = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    // dolly closer at mid, then return - zoomed out slightly for better view
    const closeZ = 20;
    const closeFov = 46;
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
      const dMin = Math.min(size.width, size.height) < 640 ? 35 : 45; // px - increased for better spacing
      for (let i = 0; i < snapshot.length; i++) {
        const a = snapshot[i];
        const b = snapshot[(i + 1) % snapshot.length]; // neighbor with wrap
        const dx = a.pos.x - b.pos.x;
        const dy = a.pos.y - b.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < dMin) {
          const nudge = 0.025; // increased nudge for better separation
          // push apart by adjusting phases in opposite directions
          a.e.addPhase(+nudge);
          b.e.addPhase(-nudge);
        }
      }
    });
  });
  return null;
}
