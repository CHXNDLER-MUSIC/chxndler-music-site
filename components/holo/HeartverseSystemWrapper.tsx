"use client";

import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { SRGBColorSpace } from "three";
import { playerStore } from "@/store/usePlayerStore";
import HeartverseSolarSystem from "./HeartverseSolarSystem";

interface HeartverseSystemWrapperProps {
  showAll?: boolean;
  hideUntilPlaying?: boolean;
  onSongClick?: (songId: string) => void;
}

export default function HeartverseSystemWrapper({ 
  showAll = false, 
  hideUntilPlaying = false,
  onSongClick
}: HeartverseSystemWrapperProps) {
  const [storeSnap, setStoreSnap] = useState(() => playerStore.getState());
  const [isMounted, setIsMounted] = useState(false);
  
  // Subscribe to player store changes
  useEffect(() => {
    const unsubscribe = playerStore.subscribe(() => setStoreSnap(playerStore.getState()));
    return unsubscribe;
  }, []);

  // Ensure client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mark 3D system as active so global key handlers can avoid interfering
  useEffect(() => {
    try { 
      (window as any).__CHX_3D_ACTIVE = true; 
    } catch {}
    return () => { 
      try { 
        (window as any).__CHX_3D_ACTIVE = false; 
      } catch {} 
    };
  }, []);

  const { songs, mainId, hoverId, planetsVisible, planetDisplayMode } = storeSnap as any;

  // Responsive design values
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  
  // Visibility logic
  const shouldShow = showAll || planetsVisible;
  const shouldHide = hideUntilPlaying && !mainId;
  const effectiveVisibility = shouldShow && !shouldHide;

  // Handle song click
  const handleSongClick = (songId: string) => {
    try {
      // Update player store
      playerStore.getState().setMainId(songId);
      
      // Call external handler if provided
      if (onSongClick) {
        onSongClick(songId);
      }
    } catch (error) {
      console.error("Failed to handle song click:", error);
    }
  };

  if (!isMounted) {
    return null; // Prevent SSR issues
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: effectiveVisibility ? 1 : 0,
        transition: isMobile ? 'none' : 'opacity 600ms ease-in-out',
        willChange: 'opacity',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden' as any,
      }}
    >
      <Canvas
        className="absolute inset-0"
        style={{ background: 'transparent' }}
        // Responsive DPR settings
        dpr={(() => {
          if (typeof window !== 'undefined') {
            const w = window.innerWidth || 0;
            if (w <= 768) return [1, 1.5]; // Lower DPR on mobile for performance
          }
          return [1, 2];
        })()}
        // Camera: closer default framing with narrower FOV for clarity
        camera={{ 
          position: [0, 90, showAll ? 240 : 180], 
          fov: showAll ? 70 : 60 
        }}
        // Performance optimizations for mobile
        gl={{
          antialias: !isMobile, // Disable AA on mobile
          alpha: true,
          powerPreference: isMobile ? 'high-performance' : 'low-power',
          preserveDrawingBuffer: true,
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          // Optimize rendering settings
          gl.toneMappingExposure = 1.8;
          gl.outputColorSpace = SRGBColorSpace;
          (gl as any).physicallyCorrectLights = true;
        }}
        frameloop="demand" // Only render when needed
      >
        {/* Ambient lighting */}
        <ambientLight intensity={0.2} />
        <hemisphereLight 
          skyColor="#bfefff" 
          groundColor="#0a1e24" 
          intensity={0.3} 
        />
        
        {/* Directional lighting */}
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={0.4} 
          color="#9ff" 
        />
        
        {/* Point lights for atmosphere */}
        <pointLight 
          position={[-8, 4, 8]} 
          intensity={0.3} 
          color="#4ff" 
        />
        

        {/* Main Heartverse Solar System */}
        <HeartverseSolarSystem 
          songs={songs}
          onSongClick={handleSongClick}
        />
      </Canvas>
    </div>
  );
}
