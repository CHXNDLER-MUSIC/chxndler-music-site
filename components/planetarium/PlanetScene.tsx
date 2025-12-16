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
}

export function PlanetScene({ zoomLevel }: PlanetSceneProps) {
  return (
    <Suspense fallback={<div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">Loading 3D Scene...</div>}>
      <Canvas camera={{ position: [0, 18, 30], fov: 60 }}>
        <Lights />
        <Planets zoomLevel={zoomLevel} />
        <CameraRig />
      </Canvas>
    </Suspense>
  );
}