"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SRGBColorSpace } from "three";
import { playerStore } from "@/store/usePlayerStore";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('HeartverseSystemWrapper Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div style={{ display: 'none' }} />;
    }
    return this.props.children;
  }
}

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
  const [isMounted, setIsMounted] = useState(false);
  const [r3fSafe, setR3fSafe] = useState(false);
  
  // Lazy-load R3F Canvas to avoid evaluating internals before guards
  const R3FCanvas: any = React.useMemo(
    () =>
      dynamic(() => import("@react-three/fiber").then((m) => m.Canvas as any), {
        ssr: false,
      }),
    []
  );
  // Lazy-load the solar system too, only render it when safe
  const HeartverseSolarSystemLazy: any = React.useMemo(
    () =>
      dynamic(() => import("./HeartverseSolarSystem"), {
        ssr: false,
      }),
    []
  );
  
  // Ensure client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // After mount, probe environment to avoid ReactCurrentOwner crashes
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c && (c.getContext('webgl') || c.getContext('experimental-webgl'));
      const hasWebGL = !!gl;
      setR3fSafe(hasWebGL);
    } catch {
      setR3fSafe(false);
    }
  }, []);

  // Responsive design values
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (!isMounted) {
    return null; // Prevent SSR issues
  }

  return (
    <ErrorBoundary>
      <div
        className="absolute inset-0"
        style={{
          opacity: 1,
          transition: isMobile ? 'none' : 'opacity 600ms ease-in-out',
          willChange: 'opacity',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden' as any,
        }}
      >
        {/* If environment isn't safe for R3F (e.g., React internals missing), quietly no-op */}
        {!r3fSafe ? null : (
        <R3FCanvas
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
        frameloop="always" // Animate orbits continuously
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
        <HeartverseSolarSystemLazy 
          songs={[]}
          onSongClick={() => {}}
        />
        </R3FCanvas>
        )}
      </div>
    </ErrorBoundary>
  );
}
