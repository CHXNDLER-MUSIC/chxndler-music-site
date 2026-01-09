'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PlanetPositionsProvider } from '../planet-positions-context';

interface ClientOnlyPlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

function SimpleSphere() {
  return (
    <mesh>
      <sphereGeometry args={[3, 32, 32]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function ClientOnlyPlanetScene({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: ClientOnlyPlanetSceneProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Initializing WebGL...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px]" style={{ position: 'relative' }}>
      <div className="absolute top-0 left-0 z-10 bg-green-500 text-white p-2">
        Client-side mounted! WebGL should work now.
      </div>
      <PlanetPositionsProvider>
        <Canvas
          camera={{ position: [0, 10, 25], fov: 60 }}
          dpr={[1, 1.5]}
          frameloop="demand"
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
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <SimpleSphere />
        </Canvas>
      </PlanetPositionsProvider>
    </div>
  );
}