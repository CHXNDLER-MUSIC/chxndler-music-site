'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { SolarSystemScene } from './SolarSystemScene';
import type { SongWithElement } from '@/hooks/useSongs';

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
      dpr={quality === 'high' ? Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) : 1}
      style={{ background: 'transparent' }}
    >
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