'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PlanetPositionsProvider } from './planet-positions-context';
import { PlanetSceneContents } from './PlanetSceneContents';
import { PlanetMinimapV2 } from './PlanetMinimapV2';

export function PlanetSystemV2() {
  const [zoomLevel, setZoomLevel] = React.useState(1);

  return (
    <PlanetPositionsProvider>
      <div className="relative w-full h-[500px]">
        {/* Zoom controls */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            Zoom In
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.4))}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            Zoom Out
          </button>
        </div>

        <Canvas camera={{ position: [0, 18, 30], fov: 60 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 15, 10]} intensity={1} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />
          <PlanetSceneContents zoomLevel={zoomLevel} />
          <OrbitControls 
            enablePan={false} 
            minDistance={15}
            maxDistance={100}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      <div className="mt-3">
        <PlanetMinimapV2 />
      </div>
    </PlanetPositionsProvider>
  );
}