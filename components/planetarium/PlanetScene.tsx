'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Planets } from './Planets';
import { CameraRig } from './CameraRig';
import { Lights } from './Lights';

// Dynamically import Canvas to avoid SSR issues
const Canvas = dynamic(() => import('@react-three/fiber').then(mod => ({ default: mod.Canvas })), { 
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">Loading 3D Scene...</div>
});

interface PlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

export function PlanetScene({ zoomLevel, initialActivePlanet, onPlanetSelect, worldId }: PlanetSceneProps) {
  return (
    <Suspense fallback={<div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">Loading 3D Scene...</div>}>
      <Canvas 
        camera={{ position: [0, 18, 30], fov: 60 }}
        dpr={[1, 1.5]} // Conservative DPR for performance
        performance={{ min: 0.5 }} // Maintain at least 30fps
        gl={{ 
          powerPreference: 'high-performance',
          antialias: false, // Disable for better performance
          alpha: false
        }}
        style={{ 
          pointerEvents: 'auto', // Enable 3D interactions within canvas
          zIndex: 1 // Ensure proper layering
        }}
      >
        <Lights />
        <Planets 
          zoomLevel={zoomLevel} 
          initialActivePlanet={initialActivePlanet}
          onPlanetSelect={onPlanetSelect}
          worldId={worldId}
        />
        <CameraRig />
      </Canvas>
    </Suspense>
  );
}