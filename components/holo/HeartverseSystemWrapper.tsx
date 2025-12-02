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

  static getDerivedStateFromError(error: Error) {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('HeartverseSystemWrapper Error:', error, errorInfo);
    // Log additional context
    if (error.message?.includes('ReactCurrentOwner')) {
      console.error('ReactCurrentOwner error detected - React internals not ready');
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div style={{ display: 'none' }} />;
    }
    return this.props.children;
  }
}

// Safe wrapper component that delays ErrorBoundary creation until React is ready
function SafeWrapper({ children }: { children: React.ReactNode }) {
  const [canRenderErrorBoundary, setCanRenderErrorBoundary] = useState(false);
  
  useEffect(() => {
    // Double-check React is fully ready before rendering ErrorBoundary
    if (typeof React !== 'undefined' && React.Component && React.createElement) {
      setCanRenderErrorBoundary(true);
    }
  }, []);
  
  if (!canRenderErrorBoundary) {
    return null;
  }
  
  return <ErrorBoundary>{children}</ErrorBoundary>;
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
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [reactReady, setReactReady] = useState(false);
  
  // Lazy-load R3F Canvas to avoid evaluating internals before guards
  const R3FCanvas: any = React.useMemo(
    () =>
      dynamic(() => import("@react-three/fiber").then((m) => m.Canvas as any), {
        ssr: false,
        loading: () => null,
        onError: (error) => {
          console.error('Failed to load R3F Canvas:', error);
          return null;
        }
      }),
    []
  );
  // Lazy-load the solar system too, only render it when safe
  const HeartverseSolarSystemLazy: any = React.useMemo(
    () =>
      dynamic(() => import("./HeartverseSolarSystem").then((m) => {
        console.log("HeartverseSolarSystem import result:", m);
        return { default: m.default };
      }), {
        ssr: false,
        loading: () => null,
        onError: (error) => {
          console.error('Failed to load HeartverseSolarSystem:', error);
          return null;
        }
      }),
    []
  );
  
  // Ensure client-side mounting and React internals are ready
  useEffect(() => {
    setIsMounted(true);
    
    // Check if React internals are properly initialized
    try {
      if (typeof React !== 'undefined' && React.createElement) {
        // Try to access React internals safely
        const testElement = React.createElement('div');
        if (testElement) {
          setReactReady(true);
        }
      }
    } catch (error) {
      console.warn('React not fully ready:', error);
      // Retry after a short delay
      setTimeout(() => {
        try {
          const testElement = React.createElement('div');
          if (testElement) {
            setReactReady(true);
          }
        } catch (retryError) {
          console.error('React failed to initialize:', retryError);
        }
      }, 100);
    }
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

  // Verify components are loaded properly
  useEffect(() => {
    console.log("Components validation:", {
      R3FCanvas: !!R3FCanvas,
      HeartverseSolarSystemLazy: !!HeartverseSolarSystemLazy,
      isMounted,
      r3fSafe,
      reactReady
    });
    setComponentsLoaded(!!R3FCanvas && !!HeartverseSolarSystemLazy && reactReady);
  }, [R3FCanvas, HeartverseSolarSystemLazy, isMounted, r3fSafe, reactReady]);

  // Responsive design values
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (!isMounted || !reactReady) {
    return null; // Prevent SSR issues and wait for React to be ready
  }

  if (!r3fSafe || !componentsLoaded) {
    console.log("Components not ready:", { r3fSafe, componentsLoaded, isMounted, reactReady });
    return null; // Don't render until all components are safely loaded
  }

  return (
    <SafeWrapper>
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
        {/* Safely render R3F Canvas only when all checks pass */}
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
      </div>
    </SafeWrapper>
  );
}
