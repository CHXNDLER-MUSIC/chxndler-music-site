'use client';

import React, { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';

import { SolarSystemScene } from './SolarSystemScene';
import type { SongWithElement } from '@/hooks/useSongs';

/** Invalidates the canvas at ~12 FPS so useFrame hooks still run on a budget. */
function LowFpsLoop() {
  const { invalidate } = useThree();
  useEffect(() => {
    const id = setInterval(invalidate, 83);
    return () => clearInterval(id);
  }, [invalidate]);
  return null;
}

interface SolarSystemCanvasProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  showStats?: boolean;
  quality?: 'low' | 'high';
}

export const SolarSystemCanvas = React.memo(({ 
  songs, 
  songsByElement, 
  zoomLevel, 
  onPlanetSelect,
  showStats = false,
  quality = 'high'
}: SolarSystemCanvasProps) => {
  if (process.env.NODE_ENV !== "production") console.log('🎨 SolarSystemCanvas rendering with:', { songCount: songs.length, quality, showStats });
  return (
    <Canvas
      camera={{ 
        position: [0, 10, 25], 
        fov: 60, 
        near: 0.1, 
        far: 1000 
      }}
      gl={{ 
        antialias: quality === 'high',
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true
      }}
      dpr={quality === 'high' ? Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5) : 1}
      frameloop="demand"
      style={{ background: 'transparent' }}
    >
      <LowFpsLoop />
      <Suspense fallback={null}>
        <SolarSystemScene 
          songs={songs}
          songsByElement={songsByElement}
          zoomLevel={zoomLevel}
          onPlanetSelect={onPlanetSelect}
          quality={quality}
        />
      </Suspense>
      {showStats && <Stats />}
    </Canvas>
  );
});

SolarSystemCanvas.displayName = 'SolarSystemCanvas';

export default SolarSystemCanvas;