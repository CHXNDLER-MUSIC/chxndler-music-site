"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SRGBColorSpace } from "three";
import { playerStore } from "@/store/usePlayerStore";
import { useSongs } from "@/hooks/useSongs";
import { AUDIO_ASSETS_BY_SLUG } from "@/data/audioAssets";
import { SONG_ELEMENT_MAPPING } from "@/data/songElements";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('HeartverseSystemWrapper Error (handled):', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

// Simple wrapper that only renders on client-side
function SafeWrapper({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
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
  return null; // TEMP disable 3D
  
  const [isMounted, setIsMounted] = useState(false);
  const [r3fSafe, setR3fSafe] = useState(false);
  
  // Get songs from Supabase
  const { songs: supabaseSongs, loading } = useSongs();
  
  // Convert Supabase songs to the format expected by HeartverseSolarSystem
  const formattedSongs = React.useMemo(() => {
    return supabaseSongs.map(song => {
      const asset = AUDIO_ASSETS_BY_SLUG[song.slug];
      const element = SONG_ELEMENT_MAPPING[song.slug] || 'heart';
      
      return {
        id: song.id,
        title: song.title,
        slug: song.slug,
        element: element,
        released: song.is_released,
        status: song.is_released ? 'released' : 'coming_soon',
        planet: {
          element: element
        }
      };
    });
  }, [supabaseSongs]);
  
  // Lazy-load R3F Canvas to avoid evaluating internals before guards
  const R3FCanvas = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    return dynamic(() => import("@react-three/fiber").then((mod) => ({ default: mod.Canvas })), {
      ssr: false,
      loading: () => null
    });
  }, []);
  // Lazy-load the solar system too, only render it when safe
  const HeartverseSolarSystemLazy = React.useMemo(
    () => {
      if (typeof window === 'undefined') return null;
      
      return dynamic(() => import("./HeartverseSolarSystem"), {
        ssr: false,
        loading: () => null
      });
    },
    []
  );
  
  // Simple client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check WebGL support
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setR3fSafe(!!gl);
      
      // Clean up
      if (gl) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      setR3fSafe(false);
    }
  }, [isMounted]);


  // Responsive design values
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Safety checks before rendering
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isMounted) {
    return null;
  }

  if (!r3fSafe || !R3FCanvas || !HeartverseSolarSystemLazy) {
    return null;
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
          zIndex: 5, // Below UI controls but above background
        }}
      >
        {/* Safely render R3F Canvas only when all checks pass */}
        {R3FCanvas ? <R3FCanvas
        className="absolute inset-0"
        style={{ background: 'transparent', pointerEvents: 'none' }}
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
        {HeartverseSolarSystemLazy ? <HeartverseSolarSystemLazy 
          songs={formattedSongs}
          onSongClick={onSongClick}
        /> : null}
        </R3FCanvas> : null}
      </div>
    </SafeWrapper>
  );
}
