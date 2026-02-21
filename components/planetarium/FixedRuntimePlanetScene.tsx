'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PlanetPositionsProvider } from '../planet-positions-context';
import { Planets } from './Planets';
import { CameraRig } from './CameraRig';
import { Lights } from './Lights';

interface RuntimePlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

export default function FixedRuntimePlanetScene({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: RuntimePlanetSceneProps) {
  if (process.env.NODE_ENV !== "production") console.log('FixedRuntimePlanetScene: Rendering with props:', { zoomLevel, initialActivePlanet, onPlanetSelect, worldId });
  
  return (
    <div className="w-full h-[500px]" style={{ position: 'relative' }}>
      <div className="absolute top-0 left-0 z-10 bg-red-500 text-white p-2">
        3D Scene Loading... Orange sphere should appear below
      </div>
      <PlanetPositionsProvider>
        <Canvas
          camera={{ position: [0, 10, 25], fov: 60 }}
          dpr={[1, 1.5]}
          gl={{ 
            powerPreference: 'high-performance',
            antialias: false,
            alpha: false
          }}
          style={{ 
            pointerEvents: 'auto',
            zIndex: 1,
            width: '100%',
            height: '100%'
          }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <mesh>
              <sphereGeometry args={[2, 32, 32]} />
              <meshStandardMaterial color="orange" />
            </mesh>
            {/* <Lights />
            <Planets 
              zoomLevel={zoomLevel}
              initialActivePlanet={initialActivePlanet}
              onPlanetSelect={onPlanetSelect}
              worldId={worldId}
            />
            <CameraRig /> */}
          </Suspense>
        </Canvas>
      </PlanetPositionsProvider>
    </div>
  );
}