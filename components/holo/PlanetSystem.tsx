"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { AdditiveBlending, Group as ThreeGroup, SRGBColorSpace, Vector3, SpriteMaterial, Sprite, MeshBasicMaterial, PlaneGeometry, DoubleSide, TextureLoader } from "three";
import { playerStore } from "@/store/usePlayerStore";
import Planet from "@/components/holo/Planet";
import HeartStarPlanet from "@/components/HeartStarPlanet";
import { computePlanetLayout } from "@/lib/planetLayout";
import { buildPlanetSongs } from "@/lib/planets";
import { getEntriesByRing, getPlanetEntry } from "@/lib/planetRegistry";
import { Html } from "@react-three/drei";
import PlanetMinimap from "@/components/holo/PlanetMinimap";
import { PLANET_CONFIGS, getPlanetsByType, getPlanetsByElement, getPlanetsByParent, ELEMENT_POSITIONS, ELEMENT_COLORS, type ElementType } from "@/lib/planetConfig";

// DIAGNOSTIC MODE - Set to true to show orbit rings, bounding boxes, and labels
const SHOW_ORBITS = false;

// Get element planet configs from unified config
const ELEMENT_PLANETS = getPlanetsByType('element');

// Type guard for element codes
function isElementCode(code: string): code is ElementType {
  return ["heart", "water", "lightning", "darkness"].includes(code);
}

// Type alias for compatibility
type ElementCode = ElementType;

// Element colors and glows
const elementColors: Record<ElementCode, string> = ELEMENT_COLORS;
const elementGlows: Record<ElementCode, string> = {
  heart: "#FC54AF",
  water: "#38B6FF", 
  lightning: "#F2EF1D",
  darkness: "#6A4C93"
};

const elementOrbitRadius = 120; // Increased for better visibility 
// Import orbit radius from config
import { SONG_ORBIT_RADIUS } from "@/lib/planetConfig";
const songOrbitRadius = SONG_ORBIT_RADIUS * 3; // Increased song orbit radius



// Song orbit group that rotates around an element planet
function SongOrbitGroup({ 
  cards, 
  elementCode, 
  elementPosition,
  mainId,
  hoverId,
  highlightedPlanetId
}: { 
  cards: any[]; 
  elementCode: ElementType; 
  elementPosition: [number, number, number];
  mainId: string | null;
  hoverId: string | null;
  highlightedPlanetId: string | null;
}) {
  const orbitRef = useRef<ThreeGroup>(null);
  
  // Rotate song planets around their element at different speeds for each element
  useFrame(() => {
    if (orbitRef.current) {
      // Different rotation speeds per element for variety
      const speed = elementCode === 'lightning' ? 0.0015 : 
                   elementCode === 'water' ? 0.0012 : 
                   elementCode === 'heart' ? 0.0010 : 
                   0.0008; // darkness
      orbitRef.current.rotation.y += speed;
    }
  });
  
  if (cards.length === 0) return null;
  
  const angleStep = (2 * Math.PI) / cards.length;
  
  return (
    <group ref={orbitRef} name={`song-orbit-${elementCode}`}>
      {/* Diagnostic orbit ring */}
      {SHOW_ORBITS && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
          <ringGeometry args={[songOrbitRadius - 0.1, songOrbitRadius + 0.1, 32]} />
          <meshBasicMaterial 
            color={ELEMENT_COLORS[elementCode]} 
            transparent={true} 
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {cards.map((card, index) => {
        const angle = index * angleStep;
        const x = Math.cos(angle) * songOrbitRadius;
        const z = Math.sin(angle) * songOrbitRadius;
        const y = (Math.sin(angle + index) * 3); // More interesting y variation based on position
        
        return (
          <group key={card.id} position={[x, y, z]}>
            <mesh renderOrder={3}>
              <Planet
                song={card}
                isMain={mainId === card.id}
                isHover={hoverId === card.id}
                isMoon={false}
                isMuted={false}
                ringBaseOverride={1.0} // Increased ring visibility
                isHighlighted={highlightedPlanetId === card.id}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Orbital elemental system with proper hierarchy
function OrbitalElementalSystem({ songs, mainId, hoverId, highlightedPlanetId }: { songs: any[]; mainId: string | null; hoverId: string | null; highlightedPlanetId: string | null }) {
  const systemRef = useRef<ThreeGroup>(null);
  
  // Group cards by element using song.planet.element
  const cardsByElement: Record<ElementCode, any[]> = React.useMemo(() => {
    const grouped: Record<ElementCode, any[]> = {
      heart: [],
      water: [],
      lightning: [],
      darkness: [],
    };
    
    // Only process released songs
    const releasedSongs = songs.filter(song => song.status !== "locked" && song.status !== "coming_soon");
    
    releasedSongs.forEach(song => {
      const element = song.planet?.element ?? "heart";
      if (isElementCode(element)) {
        grouped[element].push(song);
      } else {
        grouped.heart.push(song);
      }
    });
    
    return grouped;
  }, [songs]);
  
  // Elemental planets orbit around the center heart
  useFrame(() => {
    if (systemRef.current) {
      systemRef.current.rotation.y += 0.0003; // Much slower orbit for better visibility and less motion sickness
    }
  });
  
  console.log("🚀 OrbitalElementalSystem rendering:", { 
    songCount: songs.length, 
    cardsByElement: Object.keys(cardsByElement).map(k => ({ [k]: cardsByElement[k as ElementCode].length }))
  });
  
  return (
    <group ref={systemRef} name="OrbitalElementalSystem">
      {/* Central Heartverse Planet */}
      <group position={[0, 0, 0]} name="CenterHeart">
        <mesh renderOrder={6}>
          <sphereGeometry args={[25, 32, 32]} />
          <meshStandardMaterial 
            color="#FC54AF"
            emissive="#FC54AF"
            emissiveIntensity={2.5}
            metalness={0.2}
            roughness={0.3}
          />
        </mesh>
        <sprite scale={[60, 60, 1]} renderOrder={5}>
          <spriteMaterial
            transparent={true}
            color="#FC54AF"
            opacity={0.3}
            blending={AdditiveBlending}
          />
        </sprite>
        <Html position={[0, 35, 0]} center>
          <div style={{ 
            color: "#FC54AF", 
            fontSize: "18px", 
            fontWeight: "bold",
            textShadow: "0 0 20px #FC54AF",
            pointerEvents: "none",
            textAlign: "center"
          }}>
            💖 HEARTVERSE
          </div>
        </Html>
      </group>

      {/* Orbiting elemental planets */}
      {ELEMENT_PLANETS.map((element, index) => {
        const cardsForThisElement = cardsByElement[element.element!];
        
        // Evenly spaced around center (90 degrees apart) - keep on same plane
        const angle = (index / 4) * Math.PI * 2;
        const x = Math.cos(angle) * elementOrbitRadius;
        const z = Math.sin(angle) * elementOrbitRadius;
        const y = 0; // Keep all elemental planets on same plane
        
        console.log(`🪐 Rendering ${element.element} planet at orbital position [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}] with ${cardsForThisElement.length} songs`);
        
        return (
          <group key={element.id} name={`element-orbit-${element.element}`}>
            {/* Individual elemental planet at calculated orbital position */}
            <group position={[x, y, z]} name={`element-${element.element}`}>
              {/* Elemental planet */}
              <mesh renderOrder={4}>
                <sphereGeometry args={[8, 32, 32]} />
                <meshStandardMaterial 
                  color={element.color}
                  emissive={element.color}
                  emissiveIntensity={element.element === 'darkness' ? 3.0 : 4.0}
                  metalness={element.element === 'water' ? 0.8 : element.element === 'darkness' ? 0.9 : 0.3}
                  roughness={element.element === 'lightning' ? 0.8 : element.element === 'water' ? 0.1 : 0.4}
                />
              </mesh>
              
              {/* Elemental planet glow */}
              <sprite scale={[40, 40, 1]} renderOrder={3}>
                <spriteMaterial
                  transparent={true}
                  color={elementGlows[element.element!]}
                  opacity={element.element === 'lightning' ? 0.6 : 0.4}
                  blending={AdditiveBlending}
                />
              </sprite>
              
              {/* Element label */}
              <Html position={[0, 18, 0]} center>
                <div style={{ 
                  color: element.color, 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  textShadow: `0 0 15px ${element.color}`,
                  pointerEvents: 'none',
                  textAlign: 'center'
                }}>
                  {element.name?.toUpperCase()}
                </div>
              </Html>
              
              {/* Song planets orbiting this element */}
              <SongOrbitGroup
                cards={cardsForThisElement}
                elementCode={element.element!}
                elementPosition={[0, 0, 0]}
                mainId={mainId}
                hoverId={hoverId}
                highlightedPlanetId={highlightedPlanetId}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}


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
  const [isMinimapVisible, setIsMinimapVisible] = React.useState(true);
  const [highlightedPlanetId, setHighlightedPlanetId] = React.useState<string | null>(null);
  const [currentZoomLevel, setCurrentZoomLevel] = React.useState(0);
  console.log("🌟🌟🌟 HOLO PLANETSYSTEM.TSX IS RENDERING!!! 🌟🌟🌟", { showAll, hideUntilPlaying });
  // Mark 3D system as active so global key handlers can avoid interfering
  React.useEffect(() => {
    try { (window as any).__CHX_3D_ACTIVE = true; } catch {}
    return () => { try { (window as any).__CHX_3D_ACTIVE = false; } catch {} };
  }, []);
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { songs, mainId, prevMainId, hoverId, planetsVisible, planetDisplayMode } = storeSnap as any;
  
  // FORCE PLANETS TO BE VISIBLE - DEBUG
  React.useEffect(() => {
    try {
      const state = playerStore.getState();
      state.setPlanetsVisible(true);
      state.setPlanetDisplayMode('all');
    } catch (e) {
      console.error("Failed to set planet visibility:", e);
    }
  }, []);
  
  
  // Use planetDisplayMode for clean state management, but prioritize showAll prop for homepage
  const shouldShowAll = planetDisplayMode === 'all';
  const shouldShowSingle = planetDisplayMode === 'single';
  const shouldHide = planetDisplayMode === 'hidden';
  
  // Treat "showAll" as homepage-only when no main selection exists
  const isHomeOverview = !!showAll && !mainId;
  // FORCE homepage mode only for real home overview
  const actualShouldShowAll = isHomeOverview; // Show all only on homepage when no main selection
  const actualShouldHide = hideUntilPlaying && !planetsVisible; // Hide planets until playing starts
  
  // DEBUG: Log the visibility conditions  
  console.log("🔥 Planet visibility debug:", {
    showAll,
    planetDisplayMode,
    shouldShowAll,
    shouldShowSingle,
    shouldHide,
    isHomeOverview,
    actualShouldShowAll,
    actualShouldHide,
    mainId,
    planetsVisible,
    condition: actualShouldShowAll || shouldShowSingle
  });
  
  // EMERGENCY FIX (refined): Only normalize to 'all' on true home overview
  // Do NOT override an explicit 'hidden' mode (e.g., right after a selection/warp)
  if (isHomeOverview) {
    try {
      const currentState = playerStore.getState();
      if (currentState.planetDisplayMode !== 'hidden') {
        if (currentState.planetDisplayMode !== 'all' || !currentState.planetsVisible) {
          currentState.setPlanetDisplayMode('all');
          currentState.setPlanetsVisible(true);
        }
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
  // Do not force-enable visibility based on showAll; honor store state.
  // Homepage code ensures planetsVisible is true when appropriate.
  const effectivePlanetsVisible = planetsVisible;
  // Basic mobile detection for rendering tweaks to reduce flicker
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  
  // Debug planet visibility state
  
  
  

  return (
    // Fill the parent (HUDPanel provides a fixed-height relative container)
    // Fade logic: when a song is selected (showAll=false) but not yet playing, hide the planets.
    <div
      className="absolute inset-0"
      data-planet-system="true"
      style={{
        // DEBUG: Force opacity to 1 to debug visibility issue
        opacity: 1,
        visibility: 'visible',
        display: 'block',
        transition: isMobile ? 'none' : 'opacity 400ms ease-in-out',
        willChange: 'opacity',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden' as any,
      }}
    >
      <Canvas
        className="absolute inset-0"
        style={{ background: 'transparent' }}
        // Lower DPR on mobile to reduce fill rate cost
        dpr={(() => {
          if (typeof window !== 'undefined') {
            const w = window.innerWidth || 0;
            if (w <= 768) return [1, 1.5];
          }
          return [1, 2];
        })()}
        // Camera: closer, clearer baseline framing
        // Slightly elevated to maintain depth while emphasizing planets
        camera={{ position: [0, 140, actualShouldShowAll ? 260 : 180], fov: actualShouldShowAll ? 60 : 55 }}
        // Prefer safer GL settings on mobile to avoid flicker when layers repaint
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: isMobile ? 'high-performance' : 'low-power',
          preserveDrawingBuffer: true,
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          // Lift exposure so emissive and additive layers pop without bloom
          // @ts-ignore three typings vary by version
          gl.toneMappingExposure = 2.0;
          // Ensure correct color space + PBR energy handling
          // @ts-ignore renderer instance
          gl.outputColorSpace = SRGBColorSpace;
          // @ts-ignore renderer instance
          gl.physicallyCorrectLights = true;
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
        {/* Removed magenta secondary light to avoid pink aura */}
        <InvalidateOnState />
        <ZoomOnChange focusId={actualShouldShowAll ? null : focusId} />
        <MouseWheelZoom focusId={actualShouldShowAll ? null : focusId} onZoomChange={setCurrentZoomLevel} />
        <KeyboardZoom focusId={actualShouldShowAll ? null : focusId} onZoomChange={setCurrentZoomLevel} />

        {/* Very shallow tilt for near-horizontal horizon line */}
        {/* Render the full system: satellites first, focus planet last; previous main becomes a moon */}
        {/* Enlarge full-system view when showing all planets - Moderate scale for proper visibility */}
        <group scale={(actualShouldShowAll || shouldShowAll) ? 1.5 : 1}>
        <SystemGroup>
          
          {/* ORBITAL ELEMENTAL SYSTEM - Heart center with 4 elements orbiting */}
          {(actualShouldShowAll || shouldShowAll) && (() => {
            console.log("🌍 RENDERING ORBITAL SYSTEM:", { actualShouldShowAll, shouldShowAll, songs: songs.length });
            return (
              <OrbitalElementalSystem 
                songs={songs}
                mainId={mainId}
                hoverId={hoverId}
                highlightedPlanetId={highlightedPlanetId}
              />
            );
          })()}
          
          {/* Single song focus mode - show individual planet */}
          {shouldShowSingle && focusId && (() => {
            const focusedSong = songs.find(s => s.id === focusId);
            if (focusedSong) {
              return (
                <mesh key={focusId} renderOrder={5}>
                  <Planet 
                    song={focusedSong} 
                    isMain={true} 
                    isHover={hoverId === focusId} 
                    isMoon={false} 
                    isMuted={false} 
                    ringBaseOverride={20} 
                  />
                </mesh>
              );
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
      
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2" style={{ zIndex: 999998 }}>
        {/* Zoom Out Button */}
        <button
          onClick={() => {
            const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true });
            document.querySelector('canvas')?.dispatchEvent(event);
          }}
          className="bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 rounded text-cyan-400 text-sm font-bold transition-colors duration-200 w-8 h-8 flex items-center justify-center"
          title="Zoom Out (or scroll down)"
        >
          −
        </button>
        
        {/* Zoom Indicator */}
        <div className="bg-cyan-500/20 border border-cyan-400/50 rounded text-cyan-400 text-xs font-bold px-2 py-1 min-w-12 text-center">
          {currentZoomLevel === -2 ? "MAX" : 
           currentZoomLevel === -1 ? "WIDE" :
           currentZoomLevel === 0 ? "NORM" :
           currentZoomLevel === 1 ? "CLOSE" :
           "MAX+"}
        </div>
        
        {/* Zoom In Button */}
        <button
          onClick={() => {
            const event = new WheelEvent('wheel', { deltaY: -100, bubbles: true });
            document.querySelector('canvas')?.dispatchEvent(event);
          }}
          className="bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 rounded text-cyan-400 text-sm font-bold transition-colors duration-200 w-8 h-8 flex items-center justify-center"
          title="Zoom In (or scroll up)"
        >
          +
        </button>
        
        {/* Minimap Toggle Button */}
        <button
          onClick={() => setIsMinimapVisible(!isMinimapVisible)}
          className="bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 rounded text-cyan-400 text-xs font-bold transition-colors duration-200 px-2 py-1 flex items-center gap-1"
          title={isMinimapVisible ? "Hide minimap" : "Show minimap"}
        >
          <span className="text-xs">🗺️</span>
        </button>
      </div>
      
      {/* 2D Minimap overlay - show when enabled */}
      {isMinimapVisible && (
        <PlanetMinimap 
          currentMainId={mainId} 
          hoverId={hoverId} 
          songs={songs}
          onClose={() => setIsMinimapVisible(false)}
          onPlanetClick={(planetId: string) => {
            console.log('🌟 PlanetSystem received planet click:', planetId);
            setHighlightedPlanetId(planetId);
            console.log('🌟 Set highlightedPlanetId to:', planetId);
            // Auto-remove highlight after 4 seconds
            setTimeout(() => {
              console.log('🌟 Removing highlight for:', planetId);
              setHighlightedPlanetId(null);
            }, 4000);
          }}
        />
      )}
      
      {/* Zoom Help Text - Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-cyan-500/10 border border-cyan-400/30 rounded text-cyan-400/80 text-xs font-mono px-3 py-2 backdrop-blur-sm" style={{ zIndex: 999997 }}>
        <div className="font-bold mb-1">🎮 ZOOM CONTROLS</div>
        <div>Mouse Wheel: Scroll to zoom</div>
        <div>Keyboard: A = zoom in, - = zoom out</div>
        <div>Buttons: Click +/- above</div>
      </div>
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
  // Match Canvas camera defaults; closer baseline with narrower FOV
  const base = React.useRef({ z: isShowAll ? 240 : 110, fov: isShowAll ? 60 : 55 });
  const anim = React.useRef<{ t: number; d: number; active: boolean }>({ t: 0, d: 0.8, active: false });
  // Targeting state for planet-focused camera moves
  const target = React.useRef<{ pos: Vector3; look: Vector3; fov: number } | null>(null);

  React.useEffect(() => {
    // Update base values based on current mode - keep closer framing
    base.current = { z: isShowAll ? 240 : 110, fov: isShowAll ? 60 : 55 };
    
    // Only restart zoom animation if we have a focusId (not in showAll/home mode)
    if (focusId) {
      // Compute a camera target near the selected planet
      const entry = getPlanetEntry(focusId);
      if (entry) {
        const planetPos = entry.getWorldPosition();
        // Choose an offset that preserves current viewing direction but moves closer to the planet
        const cam = camera as any;
        const current = new Vector3(cam.position.x, cam.position.y, cam.position.z);
        const dir = current.clone().sub(planetPos).normalize();
        // Desired distance: closer again for stronger focus, still safe from clipping
        const desiredDist = 20; // was 24 (prev 28)
        const pos = planetPos.clone().add(dir.multiplyScalar(desiredDist));
        target.current = { pos, look: planetPos.clone(), fov: 55 }; // was 60
      } else {
        // Fallback: simple dolly-in from base position
        target.current = null;
      }
      anim.current.t = 0;
      anim.current.active = true;
      // kick a few frames to ensure animation starts in demand mode
      invalidate();
      invalidate();
    } else {
      // If no focusId (home mode), ensure camera is at base position
      anim.current.active = false;
      const camera_: any = camera;
      camera_.position.x = 0;
      camera_.position.y = 120;
      camera_.position.z = base.current.z;
      camera_.fov = base.current.fov;
      camera_.updateProjectionMatrix();
      // Clear any previous target
      target.current = null;
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
    const cam = camera as any;
    if (target.current) {
      // Smoothly move camera toward planet-relative target
      const { pos, look, fov } = target.current;
      const cp = new Vector3(cam.position.x, cam.position.y, cam.position.z);
      const np = cp.lerp(pos, ease); // ease toward target position
      cam.position.x = np.x;
      cam.position.y = np.y;
      cam.position.z = np.z;
      cam.fov = base.current.fov - (base.current.fov - fov) * ease;
      cam.lookAt(look.x, look.y, look.z);
      cam.updateProjectionMatrix();
    } else {
      // Fallback: dolly closer at mid, then return - zoomed out slightly for better view
      const closeZ = 42; // was 46
      const closeFov = 55; // was 60
      const bell = Math.sin(Math.PI * ease); // bell curve around 0.5
      cam.position.x = 0.2;
      cam.position.y = 18;
      cam.position.z = base.current.z - (base.current.z - closeZ) * bell;
      cam.fov = base.current.fov - (base.current.fov - closeFov) * bell;
      cam.updateProjectionMatrix();
    }
    anim.current.t += dt;
    if (anim.current.t >= anim.current.d) {
      anim.current.active = false;
      if (target.current) {
        // Snap to final target for stability
        const { pos, look, fov } = target.current;
        cam.position.set(pos.x, pos.y, pos.z);
        cam.fov = fov;
        cam.lookAt(look.x, look.y, look.z);
        cam.updateProjectionMatrix();
      } else {
        cam.position.x = 0.2;
        cam.position.y = 18;
        cam.position.z = base.current.z;
        cam.fov = base.current.fov;
        cam.updateProjectionMatrix();
      }
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

// Mouse wheel zoom controls component
function MouseWheelZoom({ focusId, onZoomChange }: { focusId: string | null; onZoomChange?: (level: number) => void }) {
  const { camera, invalidate } = useThree();
  const zoomLevelRef = React.useRef(0); // 0 = normal, negative = zoomed out, positive = zoomed in
  const animatingRef = React.useRef(false);
  const targetZoomRef = React.useRef(0);
  const isShowAll = focusId === null;
  
  // Define zoom preset levels with smooth transitions
  const zoomPresets = React.useMemo(() => {
    if (isShowAll) {
      // ShowAll mode: closer range for better planet visibility
      return [
        { level: -2, z: 800, fov: 60, description: "Maximum wide view" },
        { level: -1, z: 600, fov: 65, description: "Wide view" },
        { level: 0, z: 400, fov: 75, description: "Normal view" },
        { level: 1, z: 250, fov: 85, description: "Closer view" },
        { level: 2, z: 150, fov: 95, description: "Close view" }
      ];
    } else {
      // Focus mode: closer range for detailed planet viewing
      return [
        { level: -2, z: 300, fov: 45, description: "Wide planet view" },
        { level: -1, z: 150, fov: 55, description: "Medium planet view" },
        { level: 0, z: 65, fov: 60, description: "Normal planet view" },
        { level: 1, z: 35, fov: 70, description: "Close planet view" },
        { level: 2, z: 15, fov: 85, description: "Very close planet view" }
      ];
    }
  }, [isShowAll]);
  
  // Reset zoom level when mode changes
  React.useEffect(() => {
    zoomLevelRef.current = 0;
    targetZoomRef.current = 0;
  }, [isShowAll]);

  // Handle wheel events
  React.useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      // Only handle wheel events when mouse is over the canvas
      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas.matches(':hover')) return;
      
      event.preventDefault();
      
      const delta = event.deltaY > 0 ? 1 : -1; // Scroll down = zoom out, scroll up = zoom in
      const newZoomLevel = Math.max(-2, Math.min(2, zoomLevelRef.current + delta));
      
      if (newZoomLevel !== zoomLevelRef.current) {
        zoomLevelRef.current = newZoomLevel;
        targetZoomRef.current = newZoomLevel;
        animatingRef.current = true;
        onZoomChange?.(newZoomLevel);
        invalidate();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [invalidate]);

  // Smooth zoom animation
  useFrame((_, delta) => {
    if (!animatingRef.current) return;
    
    const currentPreset = zoomPresets.find(p => p.level === targetZoomRef.current);
    if (!currentPreset) return;
    
    const cam = camera as any;
    const currentZ = cam.position.z;
    const currentFov = cam.fov;
    const targetZ = currentPreset.z;
    const targetFov = currentPreset.fov;
    
    // Smooth interpolation
    const speed = 4.0; // Animation speed
    const zDiff = targetZ - currentZ;
    const fovDiff = targetFov - currentFov;
    
    if (Math.abs(zDiff) < 0.5 && Math.abs(fovDiff) < 0.5) {
      // Snap to target when close enough
      cam.position.z = targetZ;
      cam.fov = targetFov;
      cam.updateProjectionMatrix();
      animatingRef.current = false;
    } else {
      // Continue smooth interpolation
      cam.position.z += zDiff * speed * delta;
      cam.fov += fovDiff * speed * delta;
      cam.updateProjectionMatrix();
      invalidate();
    }
  });

  return null;
}

// Keyboard zoom controls component - A to zoom in, - to zoom out
function KeyboardZoom({ focusId, onZoomChange }: { focusId: string | null; onZoomChange?: (level: number) => void }) {
  const { camera, invalidate } = useThree();
  const zoomLevelRef = React.useRef(0);
  const animatingRef = React.useRef(false);
  const targetZoomRef = React.useRef(0);
  const isShowAll = focusId === null;
  
  // Use the same zoom presets as MouseWheelZoom for consistency
  const zoomPresets = React.useMemo(() => {
    if (isShowAll) {
      return [
        { level: -2, z: 800, fov: 60, description: "Maximum wide view" },
        { level: -1, z: 600, fov: 65, description: "Wide view" },
        { level: 0, z: 400, fov: 75, description: "Normal view" },
        { level: 1, z: 250, fov: 85, description: "Closer view" },
        { level: 2, z: 150, fov: 95, description: "Close view" }
      ];
    } else {
      return [
        { level: -2, z: 300, fov: 45, description: "Wide planet view" },
        { level: -1, z: 150, fov: 55, description: "Medium planet view" },
        { level: 0, z: 65, fov: 60, description: "Normal planet view" },
        { level: 1, z: 35, fov: 70, description: "Close planet view" },
        { level: 2, z: 15, fov: 85, description: "Very close planet view" }
      ];
    }
  }, [isShowAll]);
  
  // Reset zoom level when mode changes
  React.useEffect(() => {
    zoomLevelRef.current = 0;
    targetZoomRef.current = 0;
  }, [isShowAll]);

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if we're in 3D mode (avoid conflicts with other UI)
      if (!(window as any).__CHX_3D_ACTIVE) return;
      
      let zoomChange = 0;
      if (event.key === 'a' || event.key === 'A') {
        zoomChange = 1; // Zoom in
      } else if (event.key === '-' || event.key === '_') {
        zoomChange = -1; // Zoom out
      }
      
      if (zoomChange !== 0) {
        event.preventDefault();
        const newZoomLevel = Math.max(-2, Math.min(2, zoomLevelRef.current + zoomChange));
        
        if (newZoomLevel !== zoomLevelRef.current) {
          zoomLevelRef.current = newZoomLevel;
          targetZoomRef.current = newZoomLevel;
          animatingRef.current = true;
          onZoomChange?.(newZoomLevel);
          invalidate();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invalidate]);

  // Smooth zoom animation (same as MouseWheelZoom)
  useFrame((_, delta) => {
    if (!animatingRef.current) return;
    
    const currentPreset = zoomPresets.find(p => p.level === targetZoomRef.current);
    if (!currentPreset) return;
    
    const cam = camera as any;
    const currentZ = cam.position.z;
    const currentFov = cam.fov;
    const targetZ = currentPreset.z;
    const targetFov = currentPreset.fov;
    
    // Smooth interpolation
    const speed = 4.0;
    const zDiff = targetZ - currentZ;
    const fovDiff = targetFov - currentFov;
    
    if (Math.abs(zDiff) < 0.5 && Math.abs(fovDiff) < 0.5) {
      // Snap to target when close enough
      cam.position.z = targetZ;
      cam.fov = targetFov;
      cam.updateProjectionMatrix();
      animatingRef.current = false;
    } else {
      // Continue smooth interpolation
      cam.position.z += zDiff * speed * delta;
      cam.fov += fovDiff * speed * delta;
      cam.updateProjectionMatrix();
      invalidate();
    }
  });

  return null;
}
