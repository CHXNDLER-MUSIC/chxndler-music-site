"use client";

import React, { useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { AdditiveBlending, Group as ThreeGroup } from "three";
// drei removed to avoid external asset/preset loading that can abort in some runtimes
import { playerStore } from "@/store/usePlayerStore";
import Planet from "@/components/holo/Planet";
import HeartPlanet from "@/components/holo/HeartPlanet";
import { computePlanetLayout } from "@/lib/planetLayout";
import { buildPlanetSongs } from "@/lib/planets";
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
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { songs, mainId, prevMainId, hoverId, planetsVisible, planetDisplayMode } = storeSnap as any;
  
  
  // Use planetDisplayMode for clean state management, but prioritize showAll prop for homepage
  const shouldShowAll = planetDisplayMode === 'all';
  const shouldShowSingle = planetDisplayMode === 'single';
  const shouldHide = planetDisplayMode === 'hidden';
  
  // Treat "showAll" as homepage-only when no main selection exists
  const isHomeOverview = !!showAll && !mainId;
  // FORCE homepage mode only for real home overview
  const actualShouldShowAll = isHomeOverview ? true : shouldShowAll;
  const actualShouldHide = isHomeOverview ? false : shouldHide; // Never hide in real home overview
  
  // EMERGENCY FIX: Force store state only during true home overview
  if (isHomeOverview) {
    try {
      const currentState = playerStore.getState();
      if (currentState.planetDisplayMode !== 'all' || !currentState.planetsVisible) {
        currentState.setPlanetDisplayMode('all');
        currentState.setPlanetsVisible(true);
      }
    } catch {}
  }
  
  
  
  const focusId = shouldShowSingle ? mainId : null;
  const focus = shouldShowSingle ? songs.find((s) => s.id === focusId) : null;

  // Safety: ensure songs are initialized if not already populated
  React.useEffect(() => {
    try {
      const currentSongs = playerStore.getState().songs;
      // Force correct planet state when on homepage
      if (isHomeOverview) {
        playerStore.getState().setPlanetDisplayMode('all');
        playerStore.getState().setPlanetsVisible(true);
      }
      if (!currentSongs || currentSongs.length === 0) {
        const { holoSongs } = buildPlanetSongs();
        if (holoSongs.length > 0) {
          playerStore.getState().initSongs(holoSongs as any);
          // Force re-render after songs are loaded
          setStoreSnap(playerStore.getState());
        }
      }
    } catch {}
  }, [showAll]);
  
  // Also ensure songs are loaded after any store updates
  React.useEffect(() => {
    if ((!songs || songs.length === 0) && isHomeOverview) {
      try {
        const { holoSongs } = buildPlanetSongs();
        if (holoSongs.length > 0) {
          playerStore.getState().initSongs(holoSongs as any);
        }
      } catch {}
    }
  }, [songs, showAll, isHomeOverview]);
  
  // Context-aware planet visibility management
  // Note: We don't automatically show planets on homepage anymore
  // Let the user's toggle state (from start button) persist across views
  
  
  
  // CRITICAL: Override planetsVisible when showAll is true (homepage mode) 
  // Always show planets on homepage regardless of store state
  const effectivePlanetsVisible = showAll ? true : planetsVisible;
  
  // Debug planet visibility state
  
  
  

  return (
    // Fill the parent (HUDPanel provides a fixed-height relative container)
    // Fade logic: when a song is selected (showAll=false) but not yet playing, hide the planets.
    <div
      className="absolute inset-0"
      style={{
        // Hide completely when planetDisplayMode is 'hidden', but ALWAYS show when showAll is true (homepage)
        // Homepage (showAll=true) always shows planets regardless of other state
        // CRITICAL FIX: Force opacity=1 when showAll=true (homepage)
        opacity: isHomeOverview ? 1 : (actualShouldHide || (!effectivePlanetsVisible && !isHomeOverview)) ? 0 : 1,
        transition: 'opacity 400ms ease-in-out'
      }}
    >
      <Canvas
        className="absolute inset-0"
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
        // Pull the camera back and widen FOV so the full system fits
        // Elevated viewpoint: camera positioned above to look down at the planet system
        // Zoom out more when showing all planets for better overview
        camera={{ position: [0.2, 18, actualShouldShowAll ? 180 : 80], fov: actualShouldShowAll ? 120 : 75 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          // Lift exposure so emissive and additive layers pop without bloom
          // @ts-ignore three typings vary by version
          gl.toneMappingExposure = 1.6;
        }}
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
        <ZoomOnChange focusId={actualShouldShowAll ? null : focusId} />

        {/* Heart planet at the center - only show when displaying all planets */}
        {actualShouldShowAll && <HeartPlanet />}
        
        {/* Very shallow tilt for near-horizontal horizon line */}
        {/* Render the full system: satellites first, focus planet last; previous main becomes a moon */}
        {/* Enlarge full-system view when showing all planets */}
        <group scale={actualShouldShowAll ? 1.45 : 1}>
        <SystemGroup>
          {/* Orbit guides when showing all planets */}
          {actualShouldShowAll ? <OrbitGuides /> : null}
          
          {/* Clean planet rendering based on planetDisplayMode */}
          {(() => {
            // CRITICAL FIX: Never hide when showAll=true (homepage)
            if (actualShouldHide && !showAll) {
              return null;
            }
            
            if (actualShouldShowAll) {
              // Homepage mode: Show ALL song planets using proper Planet components
              
              if (songs.length === 0) {
                // Force load songs if not available
                try {
                  const { holoSongs } = buildPlanetSongs();
                  if (holoSongs.length > 0) {
                    playerStore.getState().initSongs(holoSongs as any);
                    // Use the emergency loaded songs for this render
                    const layout = computePlanetLayout(holoSongs);
                    
                    return holoSongs.map((song) => {
                      const planetLayout = layout[song.id];
                      if (!planetLayout) return null;
                      
                      return (
                        <Planet
                          key={song.id}
                          song={song}
                          isMain={mainId === song.id}
                          isHover={hoverId === song.id}
                          isMoon={false}
                          isMuted={false}
                          ringBaseOverride={planetLayout.orbitRadius}
                        />
                      );
                    });
                  }
                } catch (e) {
                  console.error("🌍 PlanetSystem: Emergency song load failed:", e);
                }
                return null;
              }
              
              // Render actual Planet components with proper layout
              const layout = computePlanetLayout(songs);
              
              const renderedPlanets = songs.map((song) => {
                const planetLayout = layout[song.id];
                if (!planetLayout) return null;
                
                return (
                  <Planet
                    key={song.id}
                    song={song}
                    isMain={mainId === song.id}
                    isHover={hoverId === song.id}
                    isMoon={false}
                    isMuted={false}
                    ringBaseOverride={planetLayout.orbitRadius}
                  />
                );
              });
              
              return renderedPlanets;
            }
            
            if (shouldShowSingle && focusId) {
              // Individual song mode: show only the focused planet
              const focusedSong = songs.find(s => s.id === focusId);
              if (focusedSong) {
                return (
                  <Planet 
                    key={focusId} 
                    song={focusedSong} 
                    isMain={true} 
                    isHover={hoverId === focusId} 
                    isMoon={false} 
                    isMuted={false} 
                    ringBaseOverride={20} 
                  />
                );
              } else {
                return null;
              }
            }
            
            return null;
          })()}
        </SystemGroup>
        </group>

        {/* Projection sweep removed to avoid left-to-right light flashes */}

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

// Projection sweep component removed

function ZoomOnChange({ focusId }: { focusId: string | null }) {
  // Subtle camera dolly + FOV ease when focus song changes
  const { camera, invalidate } = useThree();
  // Use different base values based on showAll mode - access via props context
  const isShowAll = focusId === null;
  // Match Canvas camera defaults; give more room in showAll to see every planet
  const base = React.useRef({ z: isShowAll ? 180 : 80, fov: isShowAll ? 120 : 75 });
  const anim = React.useRef<{ t: number; d: number; active: boolean }>({ t: 0, d: 0.8, active: false });

  React.useEffect(() => {
    // Update base values based on current mode
    base.current = { z: isShowAll ? 180 : 80, fov: isShowAll ? 120 : 75 };
    
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
      camera_.position.x = 0.2;
      camera_.position.y = 18;
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
    const closeZ = 50;
    const closeFov = 65;
    // use a bell curve around 0.5
    const bell = Math.sin(Math.PI * ease);
    (camera as any).position.x = 0.2;
    (camera as any).position.y = 18;
    (camera as any).position.z = base.current.z - (base.current.z - closeZ) * bell;
    (camera as any).fov = base.current.fov - (base.current.fov - closeFov) * bell;
    (camera as any).updateProjectionMatrix();
    anim.current.t += dt;
    if (anim.current.t >= anim.current.d) {
      anim.current.active = false;
      (camera as any).position.x = 0.2;
      (camera as any).position.y = 18;
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
