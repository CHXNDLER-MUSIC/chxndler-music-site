"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { AdditiveBlending, Group as ThreeGroup, SRGBColorSpace, Vector3, SpriteMaterial, Sprite, MeshBasicMaterial, PlaneGeometry, DoubleSide, TextureLoader } from "three";
import { playerStore } from "@/store/usePlayerStore";
import Planet from "@/components/holo/Planet";
import HeartStarPlanet from "@/components/HeartStarPlanet";
import ElementalPlanet from "@/components/holo/ElementalPlanet";
import { computePlanetLayout } from "@/lib/planetLayout";
import { buildPlanetSongs } from "@/lib/planets";
import { getEntriesByRing, getPlanetEntry } from "@/lib/planetRegistry";
import { Html } from "@react-three/drei";

// Define element types and guards
type ElementCode = "heart" | "water" | "lightning" | "darkness";

// DIAGNOSTIC MODE - Set to true to show orbit rings, bounding boxes, and labels
const SHOW_ORBITS = true;

// Fixed elemental planets configuration - cardinal positions around heart
const ELEMENTS = [
  { code: "heart",     label: "💖 Heart",     position: [40, 0, 0] },     // right
  { code: "water",     label: "🌊 Water",     position: [0, 40, 0] },     // top
  { code: "lightning", label: "⚡ Lightning", position: [-40, 0, 0] },    // left
  { code: "darkness",  label: "🌑 Darkness",  position: [0, -40, 0] },    // bottom
] as const;

// Element colors and glow configuration
const elementColors: Record<ElementCode, string> = {
  heart: "#FC54AF",
  water: "#38B6FF", 
  lightning: "#F2EF1D",
  darkness: "#000000"
};

const elementGlows: Record<ElementCode, string> = {
  heart: "#FC54AF",
  water: "#38B6FF", 
  lightning: "#F2EF1D",
  darkness: "#6A4C93" // purple-blue rim for darkness
};

// Type guard for element codes
function isElementCode(code: string): code is ElementCode {
  return ["heart", "water", "lightning", "darkness"].includes(code);
}

const elementOrbitRadius = 40;
const songOrbitRadius = 12;

// Component to render all 4 elemental planets with textures
function ElementalPlanetsWithTextures() {
  console.log("🪐 ElementalPlanetsWithTextures is rendering!");
  
  // Use React state for texture loading to avoid useLoader hook issues
  const [textures, setTextures] = React.useState<{[key: string]: any}>({});
  
  React.useEffect(() => {
    const loader = new TextureLoader();
    const textureUrls = {
      heart: "https://ik.imagekit.io/CHXNDLER/Planets/heart.png",
      lightning: "https://ik.imagekit.io/CHXNDLER/Planets/lightning",
      water: "https://ik.imagekit.io/CHXNDLER/Planets/water", 
      darkness: "https://ik.imagekit.io/CHXNDLER/Planets/darkness"
    };
    
    // Load textures asynchronously
    Object.entries(textureUrls).forEach(([key, url]) => {
      loader.load(
        url,
        (texture) => {
          setTextures(prev => ({ ...prev, [key]: texture }));
          console.log(`✅ Loaded ${key} planet texture`);
        },
        undefined,
        (error) => {
          console.warn(`❌ Failed to load ${key} texture:`, error);
        }
      );
    });
  }, []);

  return (
    <group>
      {/* Heart Planet - Pink */}
      <group position={[40, 0, 0]}>
        <mesh>
          <sphereGeometry args={[8, 32, 32]} />
          <meshStandardMaterial 
            map={textures.heart || null}
            color={textures.heart ? "#ffffff" : "#FC54AF"}
            emissive="#FC54AF"
            emissiveIntensity={0.3}
            metalness={0.1}
            roughness={0.2}
          />
        </mesh>
        {/* Atmospheric glow */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[9.6, 16, 16]} />
          <meshBasicMaterial
            color="#FC54AF"
            transparent
            opacity={0.2}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <Html position={[0, 12, 0]} center>
          <div style={{ 
            color: "#FC54AF", 
            fontSize: "18px", 
            fontWeight: "bold",
            textShadow: "2px 2px 4px black",
            pointerEvents: "none",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            letterSpacing: "1px"
          }}>
            HEART
          </div>
        </Html>
      </group>
      
      {/* Water Planet - Blue */}
      <group position={[0, 40, 0]}>
        <mesh>
          <sphereGeometry args={[8, 32, 32]} />
          <meshStandardMaterial 
            map={textures.water || null}
            color={textures.water ? "#ffffff" : "#38B6FF"}
            emissive="#38B6FF"
            emissiveIntensity={0.3}
            metalness={0.1}
            roughness={0.2}
          />
        </mesh>
        {/* Atmospheric glow */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[9.6, 16, 16]} />
          <meshBasicMaterial
            color="#38B6FF"
            transparent
            opacity={0.2}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <Html position={[0, 12, 0]} center>
          <div style={{ 
            color: "#38B6FF", 
            fontSize: "18px", 
            fontWeight: "bold",
            textShadow: "2px 2px 4px black",
            pointerEvents: "none",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            letterSpacing: "1px"
          }}>
            WATER
          </div>
        </Html>
      </group>
      
      {/* Lightning Planet - Yellow */}
      <group position={[-40, 0, 0]}>
        <mesh>
          <sphereGeometry args={[8, 32, 32]} />
          <meshStandardMaterial 
            map={textures.lightning || null}
            color={textures.lightning ? "#ffffff" : "#F2EF1D"}
            emissive="#F2EF1D"
            emissiveIntensity={0.3}
            metalness={0.1}
            roughness={0.2}
          />
        </mesh>
        {/* Atmospheric glow */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[9.6, 16, 16]} />
          <meshBasicMaterial
            color="#F2EF1D"
            transparent
            opacity={0.2}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <Html position={[0, 12, 0]} center>
          <div style={{ 
            color: "#F2EF1D", 
            fontSize: "18px", 
            fontWeight: "bold",
            textShadow: "2px 2px 4px black",
            pointerEvents: "none",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            letterSpacing: "1px"
          }}>
            LIGHTNING
          </div>
        </Html>
      </group>
      
      {/* Darkness Planet - Purple */}
      <group position={[0, -40, 0]}>
        <mesh>
          <sphereGeometry args={[8, 32, 32]} />
          <meshStandardMaterial 
            map={textures.darkness || null}
            color={textures.darkness ? "#ffffff" : "#6A4C93"}
            emissive="#6A4C93"
            emissiveIntensity={0.3}
            metalness={0.1}
            roughness={0.2}
          />
        </mesh>
        {/* Atmospheric glow */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[9.6, 16, 16]} />
          <meshBasicMaterial
            color="#6A4C93"
            transparent
            opacity={0.2}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <Html position={[0, 12, 0]} center>
          <div style={{ 
            color: "#6A4C93", 
            fontSize: "18px", 
            fontWeight: "bold",
            textShadow: "2px 2px 4px black",
            pointerEvents: "none",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            letterSpacing: "1px"
          }}>
            DARKNESS
          </div>
        </Html>
      </group>
    </group>
  );
}

// Elemental Planet with Glow component
function ElementPlanetWithGlow({ 
  element, 
  position, 
  orbitRef 
}: { 
  element: ElementCode; 
  position: [number, number, number];
  orbitRef: React.RefObject<ThreeGroup>;
}) {
  const glowRef = useRef<any>(null);
  
  const color = elementColors[element];
  const glowColor = elementGlows[element];
  
  console.log(`ElementPlanetWithGlow: ${element} at position:`, position, `color: ${color}`);
  
  return (
    <group position={position}>
      {/* Glow background - renderOrder 2 */}
      <sprite ref={glowRef} scale={[15, 15, 1]} renderOrder={2}>
        <spriteMaterial
          transparent={true}
          depthWrite={false}
          depthTest={true}
          color={glowColor}
          opacity={0.4}
          blending={AdditiveBlending}
        />
      </sprite>
      
      {/* Element planet - renderOrder 1 - SIMPLE VERSION FOR DEBUG */}
      <mesh renderOrder={1} position={[0, 0, 0]}>
        <sphereGeometry args={[8.0, 32, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Element label - always visible */}
      <Html position={[0, 12, 0]} center>
        <div style={{ 
          color: color, 
          fontSize: '18px', 
          fontWeight: 'bold',
          textShadow: '2px 2px 4px black',
          pointerEvents: 'none',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '1px'
        }}>
          {element.toUpperCase()}
        </div>
      </Html>
      
      {/* Diagnostic bounding box */}
      {SHOW_ORBITS && (
        <mesh renderOrder={0}>
          <boxGeometry args={[8, 8, 8]} />
          <meshBasicMaterial 
            color={color} 
            transparent={true} 
            opacity={0.2} 
            wireframe={true}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// Song orbit group that rotates around an element planet
function SongOrbitGroup({ 
  cards, 
  elementCode, 
  elementPosition,
  mainId,
  hoverId
}: { 
  cards: any[]; 
  elementCode: ElementCode; 
  elementPosition: [number, number, number];
  mainId: string | null;
  hoverId: string | null;
}) {
  const orbitRef = useRef<ThreeGroup>(null);
  
  // Rotate song planets around their element
  useFrame(() => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += 0.0008;
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
            color={elementColors[elementCode]} 
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
        const y = (Math.random() - 0.5) * 0.5; // Slight y randomization
        
        return (
          <group key={card.id} position={[x, y, z]}>
            <mesh renderOrder={3}>
              <Planet
                song={card}
                isMain={mainId === card.id}
                isHover={hoverId === card.id}
                isMoon={false}
                isMuted={false}
                ringBaseOverride={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Fixed elemental system with proper hierarchy
function FixedElementalSystem({ songs, mainId, hoverId }: { songs: any[]; mainId: string | null; hoverId: string | null }) {
  const systemRef = useRef<ThreeGroup>(null);
  
  // DEBUG: Log when this component renders
  console.log("🚀 FixedElementalSystem RENDERING! Songs count:", songs?.length || 0, "mainId:", mainId, "hoverId:", hoverId);
  
  // Group cards by element using song.planet.element
  const cardsByElement: Record<ElementCode, any[]> = React.useMemo(() => {
    const grouped: Record<ElementCode, any[]> = {
      heart: [],
      water: [],
      lightning: [],
      darkness: [],
    };
    
    console.log("🔍 All songs:", songs.length, songs.map(s => ({ id: s.id, title: s.title, element: s.planet?.element, status: s.status })));
    
    // Only process released songs
    const releasedSongs = songs.filter(song => song.status !== "locked" && song.status !== "coming_soon");
    console.log("✅ Released songs:", releasedSongs.length);
    
    releasedSongs.forEach(song => {
      // Use planet.element as the authoritative source
      const element = song.planet?.element ?? "heart";
      console.log(`📍 Song "${song.title}" → element: ${element}`);
      if (isElementCode(element)) {
        grouped[element].push(song);
      } else {
        console.warn(`⚠️ Unknown element "${element}" for song "${song.title}", defaulting to heart`);
        grouped.heart.push(song);
      }
    });
    
    console.log("📊 Songs grouped by element:", {
      heart: grouped.heart.length,
      water: grouped.water.length, 
      lightning: grouped.lightning.length,
      darkness: grouped.darkness.length
    });
    
    return grouped;
  }, [songs]);
  
  // Element planets orbit around the heart
  useFrame(() => {
    if (systemRef.current) {
      systemRef.current.rotation.y += 0.0003;
    }
  });
  
  return (
    <group ref={systemRef}>
      {/* Diagnostic central orbit ring */}
      {SHOW_ORBITS && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
          <ringGeometry args={[elementOrbitRadius - 0.2, elementOrbitRadius + 0.2, 64]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent={true} 
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {ELEMENTS.map((element) => {
        const cardsForThisElement = cardsByElement[element.code];
        const orbitRef = useRef<ThreeGroup>(null);
        
        console.log(`🪐 Rendering element ${element.code} at position:`, element.position, `with ${cardsForThisElement.length} songs`);
        
        return (
          <group key={element.code} name={`element-${element.code}`}>
            {/* Element planet with glow */}
            <ElementPlanetWithGlow
              element={element.code}
              position={element.position as [number, number, number]}
              orbitRef={orbitRef}
            />
            
            {/* Song planets orbiting this element */}
            <group position={element.position as [number, number, number]}>
              <SongOrbitGroup
                cards={cardsForThisElement}
                elementCode={element.code}
                elementPosition={element.position as [number, number, number]}
                mainId={mainId}
                hoverId={hoverId}
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
  console.log("🌟 PlanetSystem is rendering with props:", { showAll, hideUntilPlaying });
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
  const actualShouldShowAll = true; // FORCE SHOW ALL for debugging
  const actualShouldHide = false; // Never hide for debugging
  
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
        // Pull the camera back and widen FOV so the full system fits
        // Elevated viewpoint: camera positioned above to look down at the planet system
        // Zoom out more when showing all planets for better overview
        camera={{ position: [0.2, 18, actualShouldShowAll ? 180 : 95], fov: actualShouldShowAll ? 120 : 75 }}
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

        {/* Very shallow tilt for near-horizontal horizon line */}
        {/* Render the full system: satellites first, focus planet last; previous main becomes a moon */}
        {/* Enlarge full-system view when showing all planets */}
        <group scale={actualShouldShowAll ? 1.45 : 1}>
        <SystemGroup>
          {/* Heart Star planet at the center - always visible as the core */}
          {actualShouldShowAll && (
            <group renderOrder={0}>
              <HeartStarPlanet size={180} />
            </group>
          )}
          
          {/* 4 ELEMENTAL PLANETS WITH TEXTURES - ALWAYS VISIBLE */}
          {true && <ElementalPlanetsWithTextures />}
          
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
  const base = React.useRef({ z: isShowAll ? 180 : 95, fov: isShowAll ? 120 : 75 });
  const anim = React.useRef<{ t: number; d: number; active: boolean }>({ t: 0, d: 0.8, active: false });
  // Targeting state for planet-focused camera moves
  const target = React.useRef<{ pos: Vector3; look: Vector3; fov: number } | null>(null);

  React.useEffect(() => {
    // Update base values based on current mode
    base.current = { z: isShowAll ? 180 : 95, fov: isShowAll ? 120 : 75 };
    
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
      camera_.position.x = 0.2;
      camera_.position.y = 18;
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
