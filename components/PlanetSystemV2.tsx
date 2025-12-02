'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PlanetPositionsProvider } from './planet-positions-context';
import { PlanetMinimapV2 } from './PlanetMinimapV2';

// Dynamically import Canvas and OrbitControls to avoid SSR issues
const Canvas = dynamic(() => import('@react-three/fiber').then(mod => ({ default: mod.Canvas })), { 
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">Loading 3D Scene...</div>
});

const OrbitControls = dynamic(() => import('@react-three/drei').then(mod => ({ default: mod.OrbitControls })), { 
  ssr: false 
});

// Dynamically import the scene contents
const PlanetSceneContents = dynamic(() => import('./PlanetSceneContents').then(mod => ({ default: mod.PlanetSceneContents })), { 
  ssr: false 
});

export function PlanetSystemV2() {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [is3DLoaded, setIs3DLoaded] = React.useState(false);

  React.useEffect(() => {
    // Only load 3D components on client side
    setIs3DLoaded(true);
  }, []);

  return (
    <PlanetPositionsProvider>
      <div className="relative w-full h-[500px]">
        {/* Zoom controls */}
        {is3DLoaded && (
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
        )}

        {is3DLoaded ? (
          <Suspense fallback={<div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">Loading 3D Scene...</div>}>
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
          </Suspense>
        ) : (
          <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
            Initializing 3D Engine...
          </div>
        )}
      </div>

      <div className="mt-3">
        <PlanetMinimapV2 />
      </div>
    </PlanetPositionsProvider>
  );
}